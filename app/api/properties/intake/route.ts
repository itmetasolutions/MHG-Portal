import { Prisma, PropertyStatus, UserRole, VacancyType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";
import {
  assertMediaAssetsExist,
  buildPropertyMediaRows,
  normalizeMediaAssetIds,
  serializePropertyImages,
} from "@/server/property-media";

const nullableStringSchema = z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional();

const roomInputSchema = z
  .object({
    roomName: z.string().trim().min(1, "roomName is required"),
    landlordDemand: z.coerce.number().positive().nullable().optional(),
    expectedCommissionPct: z.coerce.number().min(0).max(9999).nullable().optional(),
  })
  .strict();

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
        title: nullableStringSchema,
        description: nullableStringSchema,
        addressLine1: nullableStringSchema,
        addressLine2: nullableStringSchema,
        city: nullableStringSchema,
        county: nullableStringSchema,
        postcode: nullableStringSchema,
        propertyType: nullableStringSchema,
        beds: z.coerce.number().int().min(0).nullable().optional(),
        baths: z.coerce.number().int().min(0).nullable().optional(),
        status: z.nativeEnum(PropertyStatus).optional(),
        vacancyType: z.nativeEnum(VacancyType).optional(),
        landlordDemand: z.coerce.number().positive().nullable().optional(),
        expectedCommissionPct: z.coerce.number().min(0).max(9999).nullable().optional(),
        expectedCommissionAmt: z.coerce.number().min(0).nullable().optional(),
        totalRooms: z.coerce.number().int().min(0).nullable().optional(),
        availableRooms: z.coerce.number().int().min(0).nullable().optional(),
        rentPerMonth: z.coerce.number().positive().nullable().optional(),
        depositAmount: z.coerce.number().min(0).nullable().optional(),
        isFurnished: z.boolean().nullable().optional(),
        personsAllowed: z.coerce.number().int().min(0).nullable().optional(),
        petsAllowed: z.boolean().nullable().optional(),
        dssAllowed: z.boolean().nullable().optional(),
        childrenAllowed: z.boolean().nullable().optional(),
        availabilityDate: z.string().datetime({ offset: true }).nullable().optional(),
        livingLandlord: z.boolean().nullable().optional(),
        mediaAssetIds: z.array(z.string().uuid()).max(50).optional(),
        rooms: z.array(roomInputSchema).max(200).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const vacancyType = value.property.vacancyType ?? "SINGLE";
    if (vacancyType === "MULTIPLE" && (!value.property.rooms || value.property.rooms.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one room is required for MULTIPLE vacancy properties.",
        path: ["property", "rooms"],
      });
    }
  });

const propertySelect = Prisma.validator<Prisma.PropertySelect>()({
  id: true,
  landlordId: true,
  ownerAgentId: true,
  propertyRef: true,
  title: true,
  description: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  county: true,
  postcode: true,
  propertyType: true,
  beds: true,
  baths: true,
  status: true,
  vacancyType: true,
  landlordDemand: true,
  expectedCommissionPct: true,
  expectedCommissionAmt: true,
  createdAt: true,
  updatedAt: true,
  rooms: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      roomName: true,
      landlordDemand: true,
      expectedCommissionPct: true,
      status: true,
      createdAt: true,
      sale: {
        select: {
          id: true,
          finalAmount: true,
          commissionAmount: true,
          profit: true,
          closedAt: true,
          tenant: { select: { id: true, fullName: true } },
        },
      },
    },
  },
  sales: {
    select: {
      id: true,
      propertyId: true,
      roomId: true,
      closedByUserId: true,
      finalAmount: true,
      commissionPct: true,
      commissionAmount: true,
      otherCosts: true,
      profit: true,
      closedAt: true,
      tenant: {
        select: {
          id: true,
          saleId: true,
          fullName: true,
          email: true,
          phone: true,
          currentAddress: true,
          moveInDate: true,
          rentAmount: true,
          depositAmount: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ closedAt: "desc" }, { id: "desc" }],
  },
  mediaLinks: {
    orderBy: [{ sortOrder: "asc" }, { mediaAssetId: "asc" }],
    select: {
      sortOrder: true,
      mediaAsset: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          dataUrl: true,
          createdAt: true,
          uploadedBy: {
            select: {
              id: true,
              agentDisplayName: true,
              email: true,
            },
          },
        },
      },
    },
  },
});

function generatePropertyRef(landlordId: string): string {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `PROP-${landlordId.slice(0, 4).toUpperCase()}-${suffix}`;
}

function normalizePropertyForCreate(property: z.infer<typeof intakeSchema>["property"]) {
  const vacancyType = property.vacancyType ?? "SINGLE";
  const rooms =
    vacancyType === "MULTIPLE"
      ? (property.rooms ?? []).map((room) => ({
          roomName: room.roomName.trim(),
          landlordDemand: room.landlordDemand ?? null,
          expectedCommissionPct: room.expectedCommissionPct ?? null,
        }))
      : [];

  return {
    vacancyType,
    landlordDemand: vacancyType === "SINGLE" ? property.landlordDemand ?? null : null,
    expectedCommissionPct: vacancyType === "SINGLE" ? property.expectedCommissionPct ?? null : null,
    expectedCommissionAmt: vacancyType === "SINGLE" ? property.expectedCommissionAmt ?? null : null,
    rooms,
  };
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

async function createPropertyWithinTx(tx: Prisma.TransactionClient, params: {
  actorUserId: string;
  landlord: {
    id: string;
    ownerAgentId: string;
    phoneLast10: string;
  };
  property: z.infer<typeof intakeSchema>["property"];
}) {
  const normalized = normalizePropertyForCreate(params.property);
  const mediaAssetIds = normalizeMediaAssetIds(params.property.mediaAssetIds);

  const created = await tx.property.create({
    data: {
      landlordId: params.landlord.id,
      ownerAgentId: params.landlord.ownerAgentId,
      propertyRef: params.property.propertyRef?.trim() || generatePropertyRef(params.landlord.id),
      title: params.property.title?.trim() || null,
      description: params.property.description?.trim() || null,
      addressLine1: params.property.addressLine1?.trim() || null,
      addressLine2: params.property.addressLine2?.trim() || null,
      city: params.property.city?.trim() || null,
      county: params.property.county?.trim() || null,
      postcode: params.property.postcode?.trim() || null,
      propertyType: params.property.propertyType?.trim() || null,
      beds: params.property.beds ?? null,
      baths: params.property.baths ?? null,
      status: params.property.status ?? "DRAFT",
      vacancyType: normalized.vacancyType,
      landlordDemand: normalized.landlordDemand,
      expectedCommissionPct: normalized.expectedCommissionPct,
      expectedCommissionAmt: normalized.expectedCommissionAmt,
      totalRooms: params.property.totalRooms ?? null,
      availableRooms: params.property.availableRooms ?? null,
      rentPerMonth: params.property.rentPerMonth ?? null,
      depositAmount: params.property.depositAmount ?? null,
      isFurnished: params.property.isFurnished ?? null,
      personsAllowed: params.property.personsAllowed ?? null,
      petsAllowed: params.property.petsAllowed ?? null,
      dssAllowed: params.property.dssAllowed ?? null,
      childrenAllowed: params.property.childrenAllowed ?? null,
      availabilityDate: params.property.availabilityDate ? new Date(params.property.availabilityDate) : null,
      livingLandlord: params.property.livingLandlord ?? null,
      rooms:
        normalized.vacancyType === "MULTIPLE"
          ? {
              create: normalized.rooms.map((room) => ({
                roomName: room.roomName,
                landlordDemand: room.landlordDemand,
                expectedCommissionPct: room.expectedCommissionPct,
              })),
            }
          : undefined,
    },
    select: { id: true },
  });

  if (mediaAssetIds.length > 0) {
    await tx.propertyMedia.createMany({
      data: buildPropertyMediaRows(created.id, mediaAssetIds),
    });
  }

  const propertyWithImages = await tx.property.findUniqueOrThrow({
    where: { id: created.id },
    select: propertySelect,
  });

  await tx.auditLog.create({
    data: {
      userId: params.actorUserId,
      entityType: "PROPERTY",
      entityId: propertyWithImages.id,
      action: "CREATE_PROPERTY",
      metadata: {
        landlordId: params.landlord.id,
        ownerAgentId: params.landlord.ownerAgentId,
        phoneLast10: params.landlord.phoneLast10,
        vacancyType: propertyWithImages.vacancyType,
        roomsCount: propertyWithImages.rooms.length,
      },
      beforeJson: Prisma.JsonNull,
      afterJson: propertyWithImages,
    },
  });

  return propertyWithImages;
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
  return db.$transaction((tx) =>
    createPropertyWithinTx(tx, {
      actorUserId: params.actorUserId,
      landlord: params.landlord,
      property: params.property,
    }),
  );
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

  const mediaAssetIds = normalizeMediaAssetIds(payload.property.mediaAssetIds);
  try {
    await assertMediaAssetsExist(db, mediaAssetIds);
  } catch (error) {
    if (error instanceof Error && error.message === "MEDIA_ASSET_NOT_FOUND") {
      return NextResponse.json(
        {
          error: "MEDIA_ASSET_NOT_FOUND",
          message: "One or more selected media items could not be found.",
        },
        { status: 400 },
      );
    }

    throw error;
  }

  const existingLandlord = await db.landlord.findUnique({
    where: { phoneLast10: normalized.phoneLast10 },
    select: {
      id: true,
      landlordName: true,
      ownerAgentId: true,
      phoneLast10: true,
      isPassive: true,
    },
  });

  if (existingLandlord) {
    // Passive landlords can be claimed by any agent
    const canUseExisting =
      auth.user.role === "ADMIN" ||
      existingLandlord.ownerAgentId === auth.user.id ||
      existingLandlord.isPassive;

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

    // If passive, reassign to the current agent
    let landlordForProperty = existingLandlord;
    if (existingLandlord.isPassive && auth.user.role === "AGENT" && existingLandlord.ownerAgentId !== auth.user.id) {
      await db.landlord.update({
        where: { id: existingLandlord.id },
        data: { ownerAgentId: auth.user.id, isPassive: false, passiveMarkedAt: null },
      });
      landlordForProperty = { ...existingLandlord, ownerAgentId: auth.user.id, isPassive: false };
    }

    const property = await createPropertyForLandlord({
      actorUserId: auth.user.id,
      landlord: landlordForProperty,
      property: payload.property,
    });

    return NextResponse.json(
      {
        landlordCreated: false,
        landlord: landlordForProperty,
        property: serializePropertyImages(property),
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

      const property = await createPropertyWithinTx(tx, {
        actorUserId: auth.user.id,
        landlord,
        property: payload.property,
      });

      return { landlord, property };
    });

    return NextResponse.json(
      {
        landlordCreated: true,
        landlord: result.landlord,
        property: serializePropertyImages(result.property),
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
            property: serializePropertyImages(property),
          },
          { status: 201 },
        );
      }
    }

    throw error;
  }
}
