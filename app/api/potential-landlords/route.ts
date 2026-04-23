import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  agentId: z.string().uuid().optional(),
  isLocked: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parse = querySchema.safeParse(params);
  if (!parse.success) {
    return NextResponse.json({ error: "INVALID_QUERY", details: parse.error.flatten() }, { status: 400 });
  }

  const { page, pageSize, agentId, isLocked } = parse.data;

  // Agents see only their own potential landlords
  const effectiveAgentId = auth.user.role === UserRole.ADMIN ? agentId : auth.user.id;

  const where = {
    ...(effectiveAgentId ? { addedByAgentId: effectiveAgentId } : {}),
    ...(isLocked !== undefined ? { isLocked } : {}),
    // Only show unconverted potential landlords (no landlordId linked)
    landlordId: null,
  };

  const [total, potentialLandlords] = await Promise.all([
    db.potentialLandlord.count({ where }),
    db.potentialLandlord.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneLast10: true,
        email: true,
        scheduledAt: true,
        isLocked: true,
        lockedUntil: true,
        createdAt: true,
        addedByAgent: {
          select: { id: true, agentDisplayName: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    potentialLandlords,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST is intentionally not exposed — PotentialLandlords are created exclusively
// via /api/start/follow-up to ensure a CallLog is always created alongside them.
export async function POST() {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED", message: "Use /api/start/follow-up to add potential landlords." },
    { status: 405 },
  );
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED", message: "Provide ?id=" }, { status: 400 });
  }

  await db.potentialLandlord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
