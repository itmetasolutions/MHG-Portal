import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const updateMediaAssetSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();

const mediaAssetMetaSelect = {
  id: true,
  name: true,
  mimeType: true,
  createdAt: true,
  uploadedBy: {
    select: {
      id: true,
      agentDisplayName: true,
      email: true,
    },
  },
} as const;

type Params = { params: { assetId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  let payload: z.infer<typeof updateMediaAssetSchema>;
  try {
    payload = updateMediaAssetSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid media asset update payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const existing = await db.mediaAsset.findUnique({
    where: { id: params.assetId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Media asset not found." }, { status: 404 });
  }

  const asset = await db.mediaAsset.update({
    where: { id: params.assetId },
    data: { name: payload.name },
    select: mediaAssetMetaSelect,
  });

  return NextResponse.json({
    asset: { ...asset, imageUrl: `/api/media-library/${asset.id}/image` },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const existing = await db.mediaAsset.findUnique({
    where: { id: params.assetId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Media asset not found." }, { status: 404 });
  }

  await db.mediaAsset.delete({ where: { id: params.assetId } });

  return NextResponse.json({ ok: true });
}
