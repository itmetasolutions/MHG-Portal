import { Prisma, PropertyStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const nullableStringSchema = z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional();

const intakeSchema = z
  .object({
    landlord: z
      .object({
        fullName: z.string().trim().min(1).optional(),
        phone: z.string().trim().min(1, "landlord.phone is required"),
        email: nullableStringSchema,
        notes: nullableStringSchema,
        ownerAgentId: z.string().uuid().optional(),
      })
      .strict(),
    property: z
      .object({
        propertyRef: z.string().trim().min(1).optional(),
        addressLine1: nullableStringSchema,
        addressLine2: nullableStringSchema,
        city: nullableStringSchema,
        county: nullableStringSchema,
        postcode: nullableStringSchema,
        propertyType: nullableStringSchema,
        beds: z.coerce.number().int().min(0).nullable().optional(),
        baths: z.coerce.number().int().min(0).nullable().optional(),
        status: z.nativeEnum(PropertyStatus).optional(),
        landlordDemand: z.coerce.number().positive().nullable().optional(),
        expectedCommissionPct: z.coerce.number().min(0).max(9999).nullable().optional(),
      })
      .strict(),
  })
  .strict();

function generatePropertyRef(landlordId: string): string {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `PROP-${landlordId.slice(0, 4).toUpperCase()}-${suffix}`;
}

async function ensureOwnerAgent(ownerAgentId: string) {
  const user = await db.user.findUnique({
    where: { id: ownerAgentId },
    select: { id: true, role: true, isActive: true, agentDisplayName: true },
  });

  if (!user || !user.isActive || user.role !== "AGENT") {
    return null;
  }

  return user;
}

async function createPropertyForLandlord(params: {
  actorUserId: string;
  landlord: {
    id: string;
    ownerAgentId: string;
    landlordName: string;
    phoneLast10: string;
  };
  property: z.infer<typeof intakeSchema>["property"];
}) {
  return db.$transaction(async (tx) => {
    const created = await tx.property.create({
      data: {
        landlordId: params.landlord.id,
        ownerAgentId: params.landlord.ownerAgentId,
        propertyRef: params.property.propertyRef?.trim() || generatePropertyRef(params.landlord.id),
        addressLine1: params.property.addressLine1?.trim() || null,
        addressLine2: params.property.addressLine2?.trim() || null,
        city: params.property.city?.trim() || null,
        county: params.property.county?.trim() || null,
        postcode: params.property.postcode?.trim() || null,
        propertyType: params.property.propertyType?.trim() || null,
        beds: params.property.beds ?? null,
        baths: params.property.baths ?? null,
        status: params.property.status ?? "DRAFT",
        landlordDemand: params.property.landlordDemand ?? null,
        expectedCommissionPct: params.property.expectedCommissionPct ?? null,
      },
      select: {
        id: true,
        landlordId: true,
        ownerAgentId: true,
        propertyRef: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        county: true,
        postcode: true,
        propertyType: true,
        beds: true,
        baths: true,
        status: true,
        landlordDemand: true,
        expectedCommissionPct: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        entityType: "PROPERTY",
        entityId: created.id,
        action: "CREATE_PROPERTY",
        metadata: {
          landlordId: params.landlord.id,
          ownerAgentId: params.landlord.ownerAgentId,
          phoneLast10: params.landlord.phoneLast10,
        },
        beforeJson: Prisma.JsonNull,
        afterJson: created,
      },
    });

    return created;
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  let payload: z.infer<typeof intakeSchema>;
  try {
    payload = intakeSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid intake payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const normalized = normalizeUkPhone(payload.landlord.phone);
  if (!normalized.ok) {
    return NextResponse.json(
      {
        error: "INVALID_PHONE",
        message: normalized.message,
      },
      { status: 400 },
    );
  }

  const existingLandlord = await db.landlord.findUnique({
    where: { phoneLast10: normalized.phoneLast10 },
    select: {
      id: true,
      landlordName: true,
      ownerAgentId: true,
      phoneLast10: true,
    },
  });

  if (existingLandlord) {
    const canUseExisting =
      auth.user.role === "ADMIN" || existingLandlord.ownerAgentId === auth.user.id;

    if (!canUseExisting) {
      return NextResponse.json(
        {
          error: "LANDLORD_ASSIGNED_TO_OTHER_AGENT",
          message:
            "This landlord is already assigned to another agent. Ask admin to reassign if needed.",
          landlord: existingLandlord,
        },
        { status: 403 },
      );
    }

    const property = await createPropertyForLandlord({
      actorUserId: auth.user.id,
      landlord: existingLandlord,
      property: payload.property,
    });

    return NextResponse.json(
      {
        landlordCreated: false,
        landlord: existingLandlord,
        property,
      },
      { status: 201 },
    );
  }

  if (!payload.landlord.fullName?.trim()) {
    return NextResponse.json(
      {
        error: "LANDLORD_NAME_REQUIRED",
        message: "landlord.fullName is required when creating a new landlord.",
      },
      { status: 400 },
    );
  }

  const ownerAgentId =
    auth.user.role === "ADMIN"
      ? payload.landlord.ownerAgentId ?? ""
      : auth.user.id;

  if (auth.user.role === "ADMIN" && !ownerAgentId) {
    return NextResponse.json(
      {
        error: "OWNER_AGENT_REQUIRED",
        message: "ownerAgentId is required when admin creates a new landlord.",
      },
      { status: 400 },
    );
  }

  const ownerAgent = await ensureOwnerAgent(ownerAgentId);
  if (!ownerAgent) {
    return NextResponse.json(
      {
        error: "INVALID_OWNER_AGENT",
        message: "ownerAgentId must reference an active AGENT user.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const landlord = await tx.landlord.create({
        data: {
          landlordName: payload.landlord.fullName!.trim(),
          landlordNumber: normalized.phoneLast10,
          phoneE164: normalized.phoneE164,
          phoneLast10: normalized.phoneLast10,
          email: payload.landlord.email?.trim() || null,
          notes: payload.landlord.notes?.trim() || null,
          createdByUserId: auth.user.id,
          updatedByUserId: auth.user.id,
          ownerAgentId: ownerAgent.id,
        },
        select: {
          id: true,
          landlordName: true,
          ownerAgentId: true,
          phoneLast10: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "LANDLORD",
          entityId: landlord.id,
          action: "CREATE_LANDLORD",
          metadata: {
            ownerAgentId: landlord.ownerAgentId,
            phoneLast10: landlord.phoneLast10,
          },
          beforeJson: Prisma.JsonNull,
          afterJson: landlord,
        },
      });

      const property = await tx.property.create({
        data: {
          landlordId: landlord.id,
          ownerAgentId: landlord.ownerAgentId,
          propertyRef: payload.property.propertyRef?.trim() || generatePropertyRef(landlord.id),
          addressLine1: payload.property.addressLine1?.trim() || null,
          addressLine2: payload.property.addressLine2?.trim() || null,
          city: payload.property.city?.trim() || null,
          county: payload.property.county?.trim() || null,
          postcode: payload.property.postcode?.trim() || null,
          propertyType: payload.property.propertyType?.trim() || null,
          beds: payload.property.beds ?? null,
          baths: payload.property.baths ?? null,
          status: payload.property.status ?? "DRAFT",
          landlordDemand: payload.property.landlordDemand ?? null,
          expectedCommissionPct: payload.property.expectedCommissionPct ?? null,
        },
        select: {
          id: true,
          landlordId: true,
          ownerAgentId: true,
          propertyRef: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          county: true,
          postcode: true,
          propertyType: true,
          beds: true,
          baths: true,
          status: true,
          landlordDemand: true,
          expectedCommissionPct: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "PROPERTY",
          entityId: property.id,
          action: "CREATE_PROPERTY",
          metadata: {
            landlordId: landlord.id,
            ownerAgentId: landlord.ownerAgentId,
            phoneLast10: landlord.phoneLast10,
          },
          beforeJson: Prisma.JsonNull,
          afterJson: property,
        },
      });

      return { landlord, property };
    });

    return NextResponse.json(
      {
        landlordCreated: true,
        landlord: result.landlord,
        property: result.property,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const landlord = await db.landlord.findUnique({
        where: { phoneLast10: normalized.phoneLast10 },
        select: {
          id: true,
          landlordName: true,
          ownerAgentId: true,
          phoneLast10: true,
        },
      });

      if (landlord) {
        const canUseExisting = auth.user.role === "ADMIN" || landlord.ownerAgentId === auth.user.id;
        if (!canUseExisting) {
          return NextResponse.json(
            {
              error: "LANDLORD_ASSIGNED_TO_OTHER_AGENT",
              message:
                "This landlord is already assigned to another agent. Ask admin to reassign if needed.",
              landlord,
            },
            { status: 403 },
          );
        }

        const property = await createPropertyForLandlord({
          actorUserId: auth.user.id,
          landlord,
          property: payload.property,
        });

        return NextResponse.json(
          {
            landlordCreated: false,
            landlord,
            property,
          },
          { status: 201 },
        );
      }
    }

    throw error;
  }
}
