import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canListProperties } from "@/server/policies";

const listQuerySchema = z
  .object({
    landlordNumber: z.string().trim().min(1).optional(),
    propertyRef: z.string().trim().min(1).optional(),
    createdAt: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  if (!canListProperties(auth.user)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You do not have permission to list properties.",
      },
      { status: 403 },
    );
  }

  const parsedQuery = listQuerySchema.safeParse({
    landlordNumber: request.nextUrl.searchParams.get("landlordNumber") ?? undefined,
    propertyRef: request.nextUrl.searchParams.get("propertyRef") ?? undefined,
    createdAt: request.nextUrl.searchParams.get("createdAt") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid query parameters.",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { landlordNumber, propertyRef, createdAt, page, pageSize } = parsedQuery.data;
  const where: Prisma.PropertyWhereInput = {};

  if (landlordNumber) {
    where.landlord = {
      is: {
        landlordNumber: { contains: landlordNumber, mode: "insensitive" },
      },
    };
  }

  if (propertyRef) {
    where.propertyRef = { contains: propertyRef, mode: "insensitive" };
  }

  if (createdAt) {
    const start = new Date(createdAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    where.createdAt = {
      gte: start,
      lt: end,
    };
  }

  if (auth.user.role === "AGENT") {
    where.ownerAgentId = auth.user.id;
    where.landlord = {
      is: {
        ownerAgentId: auth.user.id,
        ...(where.landlord?.is ?? {}),
      },
    };
  }

  const skip = (page - 1) * pageSize;

  const [total, properties] = await db.$transaction([
    db.property.count({ where }),
    db.property.findMany({
      where,
      skip,
      take: pageSize,
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
        landlord: {
          select: {
            id: true,
            landlordNumber: true,
            landlordName: true,
            ownerAgentId: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    properties,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST /api/landlords/:id/properties to create properties.",
    },
    { status: 405 },
  );
}
