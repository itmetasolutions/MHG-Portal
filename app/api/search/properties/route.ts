import { Prisma, PropertyStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z
  .object({
    postcode: z.string().trim().min(2, "Enter at least 2 characters of the postcode.").optional(),
    area: z.string().trim().min(2, "Enter at least 2 characters of the area.").optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict()
  .refine((v) => !!(v.postcode || v.area), {
    message: "Enter a postcode or area to search.",
  });

// Cross-agent postcode search — deliberately does NOT scope by ownerAgentId,
// unlike /api/properties, so any agent/admin can find listings from every agent.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsedQuery = querySchema.safeParse({
    postcode: request.nextUrl.searchParams.get("postcode") ?? undefined,
    area: request.nextUrl.searchParams.get("area") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: parsedQuery.error.issues[0]?.message ?? "Enter a postcode or area to search.",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { postcode, area, status, page, pageSize } = parsedQuery.data;

  const locationFilters: Prisma.PropertyWhereInput[] = [];
  if (postcode) locationFilters.push({ postcode: { contains: postcode, mode: "insensitive" } });
  if (area) locationFilters.push({ area: { contains: area, mode: "insensitive" } });

  const where: Prisma.PropertyWhereInput = { OR: locationFilters };
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
        description: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        county: true,
        postcode: true,
        area: true,
        propertyType: true,
        propertyCategory: true,
        beds: true,
        baths: true,
        status: true,
        vacancyType: true,
        totalRooms: true,
        availableRooms: true,
        rentPerMonth: true,
        rentPerWeek: true,
        depositAmount: true,
        isFurnished: true,
        petsAllowed: true,
        dssAllowed: true,
        childrenAllowed: true,
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
