import { Prisma, PropertyStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z
  .object({
    postcode: z.string().trim().min(2, "Enter at least 2 characters of the postcode."),
    status: z.nativeEnum(PropertyStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

// Cross-agent postcode search — deliberately does NOT scope by ownerAgentId,
// unlike /api/properties, so any agent/admin can find listings from every agent.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsedQuery = querySchema.safeParse({
    postcode: request.nextUrl.searchParams.get("postcode") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: parsedQuery.error.issues[0]?.message ?? "Enter a postcode to search.",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { postcode, status, page, pageSize } = parsedQuery.data;

  const where: Prisma.PropertyWhereInput = {
    postcode: { contains: postcode, mode: "insensitive" },
  };
  if (status) {
    where.status = status;
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
        propertyRef: true,
        title: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postcode: true,
        propertyType: true,
        beds: true,
        baths: true,
        status: true,
        vacancyType: true,
        rentPerMonth: true,
        rentPerWeek: true,
        availabilityDate: true,
        createdAt: true,
        ownerAgentId: true,
        ownerAgent: {
          select: { id: true, agentDisplayName: true, email: true, agentPhone: true },
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
