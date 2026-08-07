import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z
  .object({
    postcode: z.string().trim().min(2, "Enter at least 2 characters of the postcode."),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

// Cross-agent postcode search — deliberately does NOT scope by addedByAgentId /
// ownerAgentId, unlike /api/tenants, so any agent/admin can find tenant leads
// registered by every agent. Direct contact details are withheld; referrals go
// through the owning agent via the "Contact Agent" chat action.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsedQuery = querySchema.safeParse({
    postcode: request.nextUrl.searchParams.get("postcode") ?? undefined,
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

  const { postcode, page, pageSize } = parsedQuery.data;
  const contains = { contains: postcode, mode: "insensitive" as const };

  const where: Prisma.TenantWhereInput = {
    OR: [
      { postcode: contains },
      { preferredArea: contains },
      { currentLivingPostcode: contains },
      { workplacePostcode: contains },
    ],
  };

  const skip = (page - 1) * pageSize;

  const [total, tenants] = await db.$transaction([
    db.tenant.count({ where }),
    db.tenant.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        fullName: true,
        postcode: true,
        preferredArea: true,
        currentLivingPostcode: true,
        workplacePostcode: true,
        budgetMin: true,
        budgetMax: true,
        maximumBudget: true,
        moveInDate: true,
        numberOfOccupants: true,
        householdSize: true,
        saleId: true,
        createdAt: true,
        addedByAgentId: true,
        addedByAgent: {
          select: { id: true, agentDisplayName: true, email: true, agentPhone: true },
        },
        sale: {
          select: {
            property: {
              select: {
                ownerAgent: {
                  select: { id: true, agentDisplayName: true, email: true, agentPhone: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const serialized = tenants.map(({ sale, addedByAgent, ...tenant }) => ({
    ...tenant,
    owningAgent: sale?.property?.ownerAgent ?? addedByAgent ?? null,
  }));

  return NextResponse.json({
    tenants: serialized,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  });
}
