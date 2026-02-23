import { Prisma, PropertyStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canListProperties } from "@/server/policies";

const listQuerySchema = z
  .object({
    phoneLast10: z.string().trim().regex(/^\d{10}$/).optional(),
    propertyRef: z.string().trim().min(1).optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    city: z.string().trim().min(1).optional(),
    postcode: z.string().trim().min(1).optional(),
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
    phoneLast10:
      request.nextUrl.searchParams.get("phoneLast10") ??
      request.nextUrl.searchParams.get("landlordNumber") ??
      undefined,
    propertyRef: request.nextUrl.searchParams.get("propertyRef") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    city: request.nextUrl.searchParams.get("city") ?? undefined,
    postcode: request.nextUrl.searchParams.get("postcode") ?? undefined,
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

  const { phoneLast10, propertyRef, status, city, postcode, createdAt, page, pageSize } =
    parsedQuery.data;
  const where: Prisma.PropertyWhereInput = {};

  if (phoneLast10) {
    where.landlord = {
      is: {
        phoneLast10: { contains: phoneLast10 },
      },
    };
  }

  if (propertyRef) {
    where.propertyRef = { contains: propertyRef, mode: "insensitive" };
  }

  if (status) {
    where.status = status;
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (postcode) {
    where.postcode = { contains: postcode, mode: "insensitive" };
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
        landlord: {
          select: {
            id: true,
            landlordName: true,
            phoneE164: true,
            phoneLast10: true,
            ownerAgentId: true,
          },
        },
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
      message:
        "Use POST /api/properties/intake (phone-first) or POST /api/landlords/:id/properties.",
    },
    { status: 405 },
  );
}
