import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canCreateProperty, canViewProperty } from "@/server/policies";

const landlordIdSchema = z.string().uuid("landlord id must be a valid UUID");

const createPropertySchema = z
  .object({
    propertyRef: z.string().trim().min(1, "propertyRef is required"),
    addressLine1: z.string().trim().min(1).nullable().optional(),
    addressLine2: z.string().trim().min(1).nullable().optional(),
    city: z.string().trim().min(1).nullable().optional(),
    stateRegion: z.string().trim().min(1).nullable().optional(),
    postalCode: z.string().trim().min(1).nullable().optional(),
    country: z.string().trim().min(1).nullable().optional(),
    url: z.string().url().nullable().optional(),
    status: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    propertyRef: z.string().trim().min(1).optional(),
    createdAt: z.coerce.date().optional(),
  })
  .strict();

type Params = {
  params: {
    landlordId: string;
  };
};

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
      landlordNumber: true,
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
      stateRegion: true,
      postalCode: true,
      country: true,
      url: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    landlord: {
      id: landlord.id,
      landlordName: landlord.landlordName,
      landlordNumber: landlord.landlordNumber,
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
      landlordNumber: true,
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

  const property = await db.$transaction(async (tx) => {
    const created = await tx.property.create({
      data: {
        landlordId: landlord.id,
        ownerAgentId: landlord.ownerAgentId,
        propertyRef: payload.propertyRef,
        addressLine1: payload.addressLine1 ?? null,
        addressLine2: payload.addressLine2 ?? null,
        city: payload.city ?? null,
        stateRegion: payload.stateRegion ?? null,
        postalCode: payload.postalCode ?? null,
        country: payload.country ?? null,
        url: payload.url ?? null,
        status: payload.status ?? null,
      },
      select: {
        id: true,
        landlordId: true,
        ownerAgentId: true,
        propertyRef: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateRegion: true,
        postalCode: true,
        country: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: created.id,
        action: "PROPERTY_CREATE",
        beforeJson: Prisma.JsonNull,
        afterJson: created,
      },
    });

    return created;
  });

  return NextResponse.json({ property }, { status: 201 });
}
