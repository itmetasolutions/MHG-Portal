import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";

const assetIdSchema = z.string().uuid();
type Params = { params: { assetId: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const idParse = assetIdSchema.safeParse(params.assetId);
  if (!idParse.success) {
    return new NextResponse(null, { status: 404 });
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id: idParse.data },
    select: { dataUrl: true, mimeType: true },
  });

  if (!asset) {
    return new NextResponse(null, { status: 404 });
  }

  const commaIndex = asset.dataUrl.indexOf(",");
  const base64 = commaIndex >= 0 ? asset.dataUrl.slice(commaIndex + 1) : asset.dataUrl;
  const binary = Buffer.from(base64, "base64");

  return new NextResponse(binary, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(binary.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
