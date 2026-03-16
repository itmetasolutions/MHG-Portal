import { CallRecordStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const createCallRecordSchema = z.object({
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
  status: z.nativeEnum(CallRecordStatus).default(CallRecordStatus.CONNECTED),
  notes: z.string().trim().nullable().optional(),
}).strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const records = await db.callRecord.findMany({
    where: {
      agentId: auth.user.id,
      ...(dateFrom || dateTo ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
        },
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phoneNumber: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      convertedToLandlordId: true,
      convertedToTenantId: true,
      convertedLandlord: { select: { id: true, landlordName: true } },
      convertedTenant: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof createCallRecordSchema>;
  try {
    payload = createCallRecordSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid call record payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const record = await db.callRecord.create({
    data: {
      agentId: auth.user.id,
      phoneNumber: payload.phoneNumber,
      status: payload.status,
      notes: payload.notes ?? null,
    },
    select: {
      id: true,
      phoneNumber: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      convertedToLandlordId: true,
      convertedToTenantId: true,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
