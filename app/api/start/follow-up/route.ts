import { CallLogStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  scheduledAt: z.string().datetime({ offset: true }),
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
  if (!normalized.ok) {
    return NextResponse.json({ error: "INVALID_PHONE", message: normalized.message }, { status: 400 });
  }

  const scheduledAt = new Date(payload.scheduledAt);
  const lockedUntil = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();

  // If rescheduling an existing potential landlord, update it instead of creating new
  if (payload.potentialLandlordId) {
    const existing = await db.potentialLandlord.findUnique({
      where: { id: payload.potentialLandlordId },
      select: { id: true, addedByAgentId: true },
    });

    if (existing && existing.addedByAgentId === auth.user.id) {
      const [potentialLandlord, callLog] = await db.$transaction([
        db.potentialLandlord.update({
          where: { id: payload.potentialLandlordId },
          data: {
            scheduledAt,
            lockedUntil,
            isLocked: true,
            reminder1hSent: false,
            reminder5mSent: false,
          },
        }),
        db.callLog.create({
          data: {
            agentId: auth.user.id,
            phone: payload.phone,
            phoneLast10: normalized.phoneLast10,
            status: CallLogStatus.FOLLOW_UP,
            landlordFirstName: payload.firstName,
            landlordLastName: payload.lastName,
            potentialLandlordId: payload.potentialLandlordId,
            followUpScheduledAt: scheduledAt,
          },
        }),
      ]);
      return NextResponse.json({ potentialLandlord, callLog }, { status: 201 });
    }
  }

  // Check for existing lock by another agent
  const existingLocked = await db.potentialLandlord.findFirst({
    where: {
      phoneLast10: normalized.phoneLast10,
      isLocked: true,
      lockedUntil: { gt: new Date() },
      NOT: { addedByAgentId: auth.user.id },
    },
    select: { id: true, addedByAgent: { select: { agentDisplayName: true } }, lockedUntil: true },
  });

  if (existingLocked) {
    return NextResponse.json(
      {
        error: "POTENTIAL_LANDLORD_LOCKED",
        message: `This landlord is currently locked by ${existingLocked.addedByAgent.agentDisplayName} until ${existingLocked.lockedUntil?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
      },
      { status: 409 },
    );
  }

  const [potentialLandlord, callLog] = await db.$transaction(async (tx) => {
    const pl = await tx.potentialLandlord.create({
      data: {
        fullName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone.trim(),
        phoneLast10: normalized.phoneLast10,
        email: payload.email?.trim() || null,
        scheduledAt,
        isLocked: true,
        lockedUntil,
        addedByAgentId: auth.user.id,
      },
    });

    const cl = await tx.callLog.create({
      data: {
        agentId: auth.user.id,
        phone: payload.phone,
        phoneLast10: normalized.phoneLast10,
        status: CallLogStatus.FOLLOW_UP,
        landlordFirstName: payload.firstName,
        landlordLastName: payload.lastName,
        potentialLandlordId: pl.id,
        followUpScheduledAt: scheduledAt,
      },
    });

    return [pl, cl];
  });

  // Auto-add to dialer contacts (fire and forget)
  void db.dialerContact.findFirst({
    where: { ownerUserId: auth.user.id, phoneNumber: normalized.phoneE164 },
    select: { id: true },
  }).then((existing) => {
    if (!existing) {
      return db.dialerContact.create({
        data: {
          ownerUserId: auth.user.id,
          fullName,
          phoneNumber: normalized.phoneE164,
          notes: "Auto-added from Follow Up flow",
        },
      });
    }
  }).catch(() => { /* non-critical */ });

  return NextResponse.json({ potentialLandlord, callLog }, { status: 201 });
}
