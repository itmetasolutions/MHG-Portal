import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const assetIdSchema = z.string().uuid("Asset ID must be a valid UUID");

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();

type Params = { params: { assetId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = assetIdSchema.safeParse(params.assetId);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "Invalid asset ID." },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof patchSchema>;
  try {
    payload = patchSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id: idParse.data },
    select: { id: true, uploadedByUserId: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Asset not found." }, { status: 404 });
  }

  if (auth.user.role === UserRole.AGENT && asset.uploadedByUserId !== auth.user.id) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You can only edit your own assets." },
      { status: 403 },
    );
  }

  const updated = await db.mediaAsset.update({
    where: { id: idParse.data },
    data: { name: payload.name },
    select: {
      id: true,
      name: true,
      mimeType: true,
      dataUrl: true,
      createdAt: true,
      uploadedBy: {
        select: { id: true, agentDisplayName: true, email: true },
      },
    },
  });

  return NextResponse.json({ asset: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = assetIdSchema.safeParse(params.assetId);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "Invalid asset ID." },
      { status: 400 },
    );
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id: idParse.data },
    select: { id: true, uploadedByUserId: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Asset not found." }, { status: 404 });
  }

  if (auth.user.role === UserRole.AGENT && asset.uploadedByUserId !== auth.user.id) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You can only delete your own assets." },
      { status: 403 },
    );
  }

  await db.mediaAsset.delete({ where: { id: idParse.data } });

  return NextResponse.json({ ok: true });
}
