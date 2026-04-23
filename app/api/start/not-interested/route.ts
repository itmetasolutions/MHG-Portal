import { CallLogStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const schema = z.object({
  phone: z.string().trim().min(1, "phone is required"),
  landlordFirstName: z.string().trim().optional(),
  landlordLastName: z.string().trim().optional(),
  potentialLandlordId: z.string().uuid().optional(),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const normalized = normalizeUkPhone(payload.phone);
  const phoneLast10 = normalized.ok ? normalized.phoneLast10 : undefined;

  const callLog = await db.callLog.create({
    data: {
      agentId: auth.user.id,
      phone: payload.phone,
      phoneLast10,
      status: CallLogStatus.NOT_INTERESTED,
      landlordFirstName: payload.landlordFirstName ?? null,
      landlordLastName: payload.landlordLastName ?? null,
      potentialLandlordId: payload.potentialLandlordId ?? null,
    },
  });

  return NextResponse.json({ callLog }, { status: 201 });
}
