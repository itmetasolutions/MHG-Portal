import { DialingArea, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const createReportSchema = z.object({
  reportDate: z.string().date(),
  dialingArea: z.nativeEnum(DialingArea).optional().nullable(),
  callsMade: z.coerce.number().int().min(0).default(0),
  callsConnected: z.coerce.number().int().min(0).default(0),
  callsFailed: z.coerce.number().int().min(0).default(0),
  landlordConfirm: z.coerce.number().int().min(0).default(0),
  viewingsArranged: z.coerce.number().int().min(0).default(0),
  successfulViewings: z.coerce.number().int().min(0).default(0),
  followUp: z.coerce.number().int().min(0).default(0),
  reSchedule: z.coerce.number().int().min(0).default(0),
  notes: z.string().trim().nullable().optional(),
}).strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const reports = await db.dailyReport.findMany({
    where: { agentId: auth.user.id },
    orderBy: { reportDate: "desc" },
  });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof createReportSchema>;
  try {
    payload = createReportSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid report payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  // Check if a report for this date already exists
  const existing = await db.dailyReport.findUnique({
    where: { agentId_reportDate: { agentId: auth.user.id, reportDate: new Date(payload.reportDate) } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "REPORT_EXISTS", message: "A report for this date already exists." },
      { status: 409 },
    );
  }

  const report = await db.dailyReport.create({
    data: {
      agentId: auth.user.id,
      reportDate: new Date(payload.reportDate),
      dialingArea: payload.dialingArea ?? null,
      callsMade: payload.callsMade,
      callsConnected: payload.callsConnected,
      callsFailed: payload.callsFailed,
      landlordConfirm: payload.landlordConfirm,
      viewingsArranged: payload.viewingsArranged,
      successfulViewings: payload.successfulViewings,
      followUp: payload.followUp,
      reSchedule: payload.reSchedule,
      notes: payload.notes ?? null,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
