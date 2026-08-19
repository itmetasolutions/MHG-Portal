import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

type Params = { params: { assetId: string } };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id: params.assetId },
    select: { mimeType: true, dataUrl: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Media asset not found." }, { status: 404 });
  }

  const match = asset.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json(
      { error: "INVALID_MEDIA", message: "Stored media asset is not a valid image data URL." },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(match[2], "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": asset.mimeType || match[1],
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
