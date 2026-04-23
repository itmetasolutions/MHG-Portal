import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z.object({
  agentId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parse = querySchema.safeParse(params);
  if (!parse.success) {
    return NextResponse.json({ error: "INVALID_QUERY", details: parse.error.flatten() }, { status: 400 });
  }

  const { page, pageSize, from, to } = parse.data;
  const effectiveAgentId = auth.user.role === UserRole.ADMIN ? parse.data.agentId : auth.user.id;

  const where = {
    ...(effectiveAgentId ? { agentId: effectiveAgentId } : {}),
    ...(from || to ? {
      reportDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  };

  const [total, reports] = await Promise.all([
    db.dailyReport.count({ where }),
    db.dailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        reportDate: true,
        dialingArea: true,
        totalSearched: true,
        propertiesConfirmed: true,
        notInterested: true,
        followUp: true,
        potentialTenants: true,
        salesClosed: true,
        callsMade: true,
        callsConnected: true,
        callsFailed: true,
        landlordConfirm: true,
        viewingsArranged: true,
        successfulViewings: true,
        reSchedule: true,
        notes: true,
        createdAt: true,
        agent: { select: { id: true, agentDisplayName: true } },
      },
    }),
  ]);

  return NextResponse.json({ reports, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

// Agents no longer submit daily reports manually — they are auto-calculated.
// See GET /api/daily-reports/auto for real-time computed stats.
export async function POST() {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED", message: "Daily reports are auto-generated. See /api/daily-reports/auto." },
    { status: 405 },
  );
}
