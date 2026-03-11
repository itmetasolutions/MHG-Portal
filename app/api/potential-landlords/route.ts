import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const createSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
}).strict();

const LOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function getLockExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + LOCK_DURATION_MS);
}


export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const potentialLandlords = await db.potentialLandlord.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      phoneLast10: true,
      createdAt: true,
      addedByAgent: {
        select: { id: true, agentDisplayName: true },
      },
    },
  });

  return NextResponse.json({ potentialLandlords });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizeUkPhone(payload.phone);
  if (!normalizedPhone.ok) {
    return NextResponse.json(
      { error: "INVALID_PHONE", message: normalizedPhone.message },
      { status: 400 },
    );
  }

  // Check if this phone already exists as a real landlord
  const existingLandlord = await db.landlord.findUnique({
    where: { phoneLast10: normalizedPhone.phoneLast10 },
    select: { id: true, landlordName: true },
  });
  if (existingLandlord) {
    return NextResponse.json(
      { error: "ALREADY_LANDLORD", message: `This number is already registered as landlord "${existingLandlord.landlordName}".` },
      { status: 409 },
    );
  }

  // Check for active lock by another agent
  const lockCutoff = new Date(Date.now() - LOCK_DURATION_MS);
  const existingPotential = await db.potentialLandlord.findFirst({
    where: {
      phoneLast10: normalizedPhone.phoneLast10,
      createdAt: { gte: lockCutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, addedByAgentId: true, createdAt: true, addedByAgent: { select: { agentDisplayName: true } } },
  });

  if (existingPotential && existingPotential.addedByAgentId !== auth.user.id) {
    const lockExpiry = getLockExpiry(existingPotential.createdAt);
    return NextResponse.json(
      {
        error: "POTENTIAL_LANDLORD_LOCKED",
        message: `This landlord is currently locked by ${existingPotential.addedByAgent.agentDisplayName} until ${lockExpiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
        lockedBy: existingPotential.addedByAgent.agentDisplayName,
        lockExpiry: lockExpiry.toISOString(),
      },
      { status: 409 },
    );
  }

  const potentialLandlord = await db.potentialLandlord.create({
    data: {
      fullName: payload.fullName,
      phone: payload.phone.trim(),
      phoneLast10: normalizedPhone.phoneLast10,
      addedByAgentId: auth.user.id,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      phoneLast10: true,
      createdAt: true,
      addedByAgent: { select: { id: true, agentDisplayName: true } },
    },
  });

  return NextResponse.json({ potentialLandlord }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED", message: "Provide ?id=" }, { status: 400 });
  }

  await db.potentialLandlord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
