import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export function GET() {
  const file = readFileSync(join(process.cwd(), "public", "mhg-favicon.png"));
  return new NextResponse(file, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
