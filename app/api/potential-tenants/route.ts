import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const createSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Must be a valid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  interestedIn: z.string().trim().optional(),
  budget: z.string().trim().optional(),
  notes: z.string().trim().max(5000).optional(),
}).strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const potentialTenants = await db.potentialTenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      interestedIn: true,
      budget: true,
      notes: true,
      createdAt: true,
      addedByAgent: {
        select: { id: true, agentDisplayName: true },
      },
    },
  });

  return NextResponse.json({ potentialTenants });
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

  const potentialTenant = await db.potentialTenant.create({
    data: {
      fullName: payload.fullName,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      interestedIn: payload.interestedIn?.trim() || null,
      budget: payload.budget?.trim() || null,
      notes: payload.notes?.trim() || null,
      addedByAgentId: auth.user.id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      interestedIn: true,
      budget: true,
      notes: true,
      createdAt: true,
      addedByAgent: { select: { id: true, agentDisplayName: true } },
    },
  });

  return NextResponse.json({ potentialTenant }, { status: 201 });
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

  await db.potentialTenant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
