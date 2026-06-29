import { UserRole, ViewingStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/server/auth";
import { db } from "@/server/db";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("successful") }),
  z.object({ action: z.literal("unsuccessful"), reason: z.string().min(1, "Reason is required.") }),
  z.object({ action: z.literal("reschedule"), scheduledAt: z.string().datetime() }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const { id } = await params;

  const viewing = await db.viewing.findUnique({
    where: { id },
    select: { id: true, scheduledByAgentId: true, propertyId: true, status: true },
  });

  if (!viewing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Viewing not found." }, { status: 404 });
  }

  if (auth.user.role === UserRole.AGENT && viewing.scheduledByAgentId !== auth.user.id) {
    return NextResponse.json({ error: "FORBIDDEN", message: "You can only update your own viewings." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", message: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "successful") {
    const updated = await db.viewing.update({
      where: { id },
      data: { status: ViewingStatus.SUCCESSFUL },
    });
    return NextResponse.json({ viewing: updated });
  }

  if (data.action === "unsuccessful") {
    const updated = await db.viewing.update({
      where: { id },
      data: { status: ViewingStatus.UNSUCCESSFUL, unsuccessfulReason: data.reason },
    });
    return NextResponse.json({ viewing: updated });
  }

  // reschedule — create a new viewing
  const newViewing = await db.viewing.create({
    data: {
      propertyId: viewing.propertyId,
      scheduledByAgentId: viewing.scheduledByAgentId,
      scheduledAt: new Date(data.scheduledAt),
      status: ViewingStatus.SCHEDULED,
    },
    include: {
      scheduledByAgent: { select: { id: true, agentDisplayName: true } },
      property: { select: { id: true, propertyRef: true, addressLine1: true, city: true, postcode: true } },
    },
  });

  return NextResponse.json({ viewing: newViewing }, { status: 201 });
}
