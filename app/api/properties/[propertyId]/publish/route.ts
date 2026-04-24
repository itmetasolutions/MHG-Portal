import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";
import { canEditProperty } from "@/server/policies";

const publishSchema = z.object({
  publishedToWebsite: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: { propertyId: string } }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  try {
    const body = await request.json();
    const { publishedToWebsite } = publishSchema.parse(body);

    const existing = await db.property.findUnique({
      where: { id: params.propertyId },
      select: {
        ownerAgentId: true,
        landlord: { select: { ownerAgentId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Property not found" }, { status: 404 });
    }

    if (!canEditProperty(auth.user, { ownerAgentId: existing.ownerAgentId, landlordOwnerAgentId: existing.landlord.ownerAgentId })) {
      return NextResponse.json({ ok: false, error: "Only the owner agent or admin can publish this property." }, { status: 403 });
    }

    const property = await db.property.update({
      where: { id: params.propertyId },
      data: { publishedToWebsite },
    });

    return NextResponse.json({ ok: true, property });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid payload or internal error" },
      { status: 400 },
    );
  }
}
