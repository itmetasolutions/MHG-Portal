import { CallLogStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z.object({
  agentId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

function dateRangeForDay(dateStr: string): { gte: Date; lt: Date } {
  const d = new Date(dateStr);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return { gte: d, lt: next };
}

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

  const { from, to } = parse.data;
  const effectiveAgentId = auth.user.role === UserRole.ADMIN ? parse.data.agentId : auth.user.id;

  // Build date range (default: last 30 days)
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Round to day boundaries
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  const agentFilter = effectiveAgentId ? { agentId: effectiveAgentId } : {};
  const createdAtFilter = { gte: fromDate, lte: toDate };

  // Fetch all call logs and group by date+agent
  const [callLogs, lookupLogs, potentialTenants, sales] = await Promise.all([
    db.callLog.findMany({
      where: { ...agentFilter, createdAt: createdAtFilter },
      select: { agentId: true, status: true, createdAt: true },
    }),
    db.landlordLookupLog.findMany({
      where: { ...agentFilter, createdAt: createdAtFilter },
      select: { agentId: true, createdAt: true },
    }),
    db.potentialTenant.findMany({
      where: { ...agentFilter, createdAt: createdAtFilter },
      select: { addedByAgentId: true, createdAt: true },
    }),
    db.sale.findMany({
      where: {
        ...(effectiveAgentId ? { closedByUserId: effectiveAgentId } : {}),
        closedAt: createdAtFilter,
      },
      select: { closedByUserId: true, closedAt: true },
    }),
  ]);

  type DayKey = string; // "YYYY-MM-DD"
  type AgentKey = string;
  type DayStat = {
    date: DayKey;
    agentId: AgentKey;
    totalSearched: number;
    propertiesConfirmed: number;
    notInterested: number;
    followUp: number;
    potentialTenants: number;
    salesClosed: number;
  };

  const map = new Map<string, DayStat>();

  function getKey(agentId: string, date: Date): string {
    return `${agentId}::${date.toISOString().slice(0, 10)}`;
  }

  function ensureEntry(agentId: string, date: Date): DayStat {
    const key = getKey(agentId, date);
    if (!map.has(key)) {
      map.set(key, {
        date: date.toISOString().slice(0, 10),
        agentId,
        totalSearched: 0,
        propertiesConfirmed: 0,
        notInterested: 0,
        followUp: 0,
        potentialTenants: 0,
        salesClosed: 0,
      });
    }
    return map.get(key)!;
  }

  for (const log of lookupLogs) {
    ensureEntry(log.agentId, log.createdAt).totalSearched++;
  }

  for (const log of callLogs) {
    const entry = ensureEntry(log.agentId, log.createdAt);
    if (log.status === CallLogStatus.CONFIRMED) entry.propertiesConfirmed++;
    else if (log.status === CallLogStatus.NOT_INTERESTED) entry.notInterested++;
    else if (log.status === CallLogStatus.FOLLOW_UP) entry.followUp++;
  }

  for (const pt of potentialTenants) {
    ensureEntry(pt.addedByAgentId, pt.createdAt).potentialTenants++;
  }

  for (const sale of sales) {
    ensureEntry(sale.closedByUserId, sale.closedAt).salesClosed++;
  }

  const reports = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ reports });
}
