import { CallLogStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(CallLogStatus).optional(),
  agentId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parse = querySchema.safeParse(params);
  if (!parse.success) {
    return NextResponse.json(
      { error: "INVALID_QUERY", details: parse.error.flatten() },
      { status: 400 },
    );
  }

  const { page, pageSize, status, agentId, from, to } = parse.data;

  // Agents can only see their own logs; admins can filter by agentId
  const effectiveAgentId = auth.user.role === UserRole.ADMIN ? agentId : auth.user.id;

  const where = {
    ...(effectiveAgentId ? { agentId: effectiveAgentId } : {}),
    ...(status ? { status } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  };

  const [total, logs] = await Promise.all([
    db.callLog.count({ where }),
    db.callLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        phone: true,
        phoneLast10: true,
        landlordFirstName: true,
        landlordLastName: true,
        followUpScheduledAt: true,
        createdAt: true,
        agent: {
          select: { id: true, agentDisplayName: true },
        },
        landlord: {
          select: { id: true, landlordName: true },
        },
        potentialLandlord: {
          select: { id: true, fullName: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
