import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const reports = await db.dailyReport.findMany({
    where: {
      ...(agentId ? { agentId } : {}),
      ...(dateFrom || dateTo ? {
        reportDate: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    },
    orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      reportDate: true,
      callsMade: true,
      callsConnected: true,
      callsFailed: true,
      landlordConfirm: true,
      viewingsArranged: true,
      successfulViewings: true,
      followUp: true,
      reSchedule: true,
      notes: true,
      createdAt: true,
      agent: { select: { id: true, agentDisplayName: true, email: true } },
    },
  });

  return NextResponse.json({ reports });
}
