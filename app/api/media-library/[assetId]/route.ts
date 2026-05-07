import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const assetIdSchema = z.string().uuid("asset id must be a valid UUID");

type Params = { params: { assetId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = assetIdSchema.safeParse(params.assetId);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "INVALID_ASSET_ID", message: "Invalid asset id." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : null;
  if (!name) {
    return NextResponse.json(
      { error: "INVALID_NAME", message: "Name is required." },
      { status: 400 },
    );
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id: idParse.data },
    select: { id: true, uploadedByUserId: true },
  });

  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Photo not found." },
      { status: 404 },
    );
  }

  if (auth.user.role === "AGENT" && asset.uploadedByUserId !== auth.user.id) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You can only rename photos you uploaded." },
      { status: 403 },
    );
  }

  const updated = await db.mediaAsset.update({
    where: { id: idParse.data },
    data: { name },
    select: { id: true, name: true, mimeType: true, dataUrl: true, createdAt: true, uploadedByUserId: true },
  });

  return NextResponse.json({ asset: { ...updated, createdAt: updated.createdAt.toISOString() } });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = assetIdSchema.safeParse(params.assetId);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "INVALID_ASSET_ID", message: "Invalid asset id." },
      { status: 400 },
    );
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id: idParse.data },
    select: { id: true, uploadedByUserId: true },
  });

  if (!asset) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Photo not found." },
      { status: 404 },
    );
  }

  if (auth.user.role === "AGENT" && asset.uploadedByUserId !== auth.user.id) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You can only delete photos you uploaded." },
      { status: 403 },
    );
  }

  await db.mediaAsset.delete({ where: { id: idParse.data } });

  return NextResponse.json({ ok: true });
}