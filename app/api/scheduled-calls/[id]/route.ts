import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    contactName: z.string().trim().min(1).optional().nullable(),
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    status: z.enum(["PENDING", "DONE", "CANCELLED", "MISSED"]).optional(),
  })
  .strict();

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = idSchema.safeParse(params.id);
  if (!idParse.success) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid scheduled call id." }, { status: 400 });
  }

  let payload: z.infer<typeof patchSchema>;
  try {
    payload = patchSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const existing = await db.scheduledCall.findUnique({ where: { id: idParse.data } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Scheduled call not found." }, { status: 404 });
  }

  if (existing.agentId !== auth.user.id && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN", message: "Access denied." }, { status: 403 });
  }

  const updated = await db.scheduledCall.update({
    where: { id: idParse.data },
    data: {
      ...(payload.contactName !== undefined ? { contactName: payload.contactName } : {}),
      ...(payload.scheduledAt !== undefined ? { scheduledAt: new Date(payload.scheduledAt) } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
    },
  });

  return NextResponse.json({ call: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = idSchema.safeParse(params.id);
  if (!idParse.success) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid scheduled call id." }, { status: 400 });
  }

  const existing = await db.scheduledCall.findUnique({ where: { id: idParse.data } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Scheduled call not found." }, { status: 404 });
  }

  if (existing.agentId !== auth.user.id && auth.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN", message: "Access denied." }, { status: 403 });
  }

  await db.scheduledCall.delete({ where: { id: idParse.data } });

  return NextResponse.json({ ok: true });
}
