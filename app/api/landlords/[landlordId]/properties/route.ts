import { Prisma, PropertyStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canCreateProperty, canViewProperty } from "@/server/policies";

const landlordIdSchema = z.string().uuid("landlord id must be a valid UUID");

const createPropertySchema = z
  .object({
    propertyRef: z.string().trim().min(1).optional(),
    addressLine1: z.string().trim().min(1).nullable().optional(),
    addressLine2: z.string().trim().min(1).nullable().optional(),
    city: z.string().trim().min(1).nullable().optional(),
    county: z.string().trim().min(1).nullable().optional(),
    postcode: z.string().trim().min(1).nullable().optional(),
    propertyType: z.string().trim().min(1).nullable().optional(),
    beds: z.coerce.number().int().min(0).nullable().optional(),
    baths: z.coerce.number().int().min(0).nullable().optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    landlordDemand: z.coerce.number().positive().nullable().optional(),
    expectedCommissionPct: z.coerce.number().min(0).max(100).nullable().optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    propertyRef: z.string().trim().min(1).optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    city: z.string().trim().min(1).optional(),
    postcode: z.string().trim().min(1).optional(),
    createdAt: z.coerce.date().optional(),
  })
  .strict();

type Params = {
  params: {
    landlordId: string;
  };
};

function generatePropertyRef(landlordId: string): string {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `PROP-${landlordId.slice(0, 4).toUpperCase()}-${suffix}`;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const idParse = landlordIdSchema.safeParse(params.landlordId);
  if (!idParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_LANDLORD_ID",
        message: idParse.error.issues[0]?.message ?? "Invalid landlord id.",
      },
      { status: 400 },
    );
  }

  const landlord = await db.landlord.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      ownerAgentId: true,
      landlordName: true,
      phoneE164: true,
      phoneLast10: true,
      email: true,
    },
  });

  if (!landlord) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  if (
    !canViewProperty(auth.user, {
      ownerAgentId: landlord.ownerAgentId,
      landlordOwnerAgentId: landlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can access landlord properties.",
      },
      { status: 403 },
    );
  }

  const queryParse = listQuerySchema.safeParse({
    propertyRef: request.nextUrl.searchParams.get("propertyRef") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    city: request.nextUrl.searchParams.get("city") ?? undefined,
    postcode: request.nextUrl.searchParams.get("postcode") ?? undefined,
    createdAt: request.nextUrl.searchParams.get("createdAt") ?? undefined,
  });

  if (!queryParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid query parameters.",
        details: queryParse.error.flatten(),
      },
      { status: 400 },
    );
  }

  const where: Prisma.PropertyWhereInput = {
    landlordId: landlord.id,
  };

  if (queryParse.data.propertyRef) {
    where.propertyRef = { contains: queryParse.data.propertyRef, mode: "insensitive" };
  }
  if (queryParse.data.status) {
    where.status = queryParse.data.status;
  }
  if (queryParse.data.city) {
    where.city = { contains: queryParse.data.city, mode: "insensitive" };
  }
  if (queryParse.data.postcode) {
    where.postcode = { contains: queryParse.data.postcode, mode: "insensitive" };
  }

  if (queryParse.data.createdAt) {
    const start = new Date(queryParse.data.createdAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.createdAt = {
      gte: start,
      lt: end,
    };
  }

  const properties = await db.property.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
      sale: {
        select: {
          id: true,
          finalAmount: true,
          commissionPct: true,
          commissionAmount: true,
          otherCosts: true,
          profit: true,
          closedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    landlord: {
      id: landlord.id,
      fullName: landlord.landlordName,
      phoneE164: landlord.phoneE164,
      phoneLast10: landlord.phoneLast10,
      email: landlord.email,
      ownerAgentId: landlord.ownerAgentId,
    },
    properties,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const idParse = landlordIdSchema.safeParse(params.landlordId);
  if (!idParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_LANDLORD_ID",
        message: idParse.error.issues[0]?.message ?? "Invalid landlord id.",
      },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof createPropertySchema>;
  try {
    payload = createPropertySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid property payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const landlord = await db.landlord.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      ownerAgentId: true,
      phoneLast10: true,
      landlordName: true,
    },
  });

  if (!landlord) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  if (
    !canCreateProperty(auth.user, {
      ownerAgentId: landlord.ownerAgentId,
      landlordOwnerAgentId: landlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can create properties for this landlord.",
      },
      { status: 403 },
    );
  }

  const propertyRef = payload.propertyRef?.trim() || generatePropertyRef(landlord.id);

  const property = await db.$transaction(async (tx) => {
    const created = await tx.property.create({
      data: {
        landlordId: landlord.id,
        ownerAgentId: landlord.ownerAgentId,
        propertyRef,
        addressLine1: payload.addressLine1?.trim() || null,
        addressLine2: payload.addressLine2?.trim() || null,
        city: payload.city?.trim() || null,
        county: payload.county?.trim() || null,
        postcode: payload.postcode?.trim() || null,
        propertyType: payload.propertyType?.trim() || null,
        beds: payload.beds ?? null,
        baths: payload.baths ?? null,
        status: payload.status ?? "DRAFT",
        landlordDemand: payload.landlordDemand ?? null,
        expectedCommissionPct: payload.expectedCommissionPct ?? null,
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
        entityId: created.id,
        action: "CREATE_PROPERTY",
        metadata: {
          landlordId: landlord.id,
          ownerAgentId: landlord.ownerAgentId,
          phoneLast10: landlord.phoneLast10,
        },
        beforeJson: Prisma.JsonNull,
        afterJson: created,
      },
    });

    return created;
  });

  return NextResponse.json({ property }, { status: 201 });
}
