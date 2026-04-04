import { NextResponse } from "next/server";
import { db } from "@/server/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const limit = searchParams.get('limit');
  const parsedLimit = limit ? parseInt(limit, 10) : 50;

  try {
    const properties = await db.property.findMany({
      where: {
        publishedToWebsite: true,
        status: { not: "CLOSED" },
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      },
      take: parsedLimit,
      orderBy: { createdAt: "desc" },
      include: {
        ownerAgent: {
          select: {
            agentDisplayName: true,
            email: true,
            agentPhone: true,
            profilePicture: true,
          }
        },
        landlord: {
          select: {
            phoneE164: true,
            phoneLast10: true,
          }
        },
        mediaLinks: {
          include: {
            mediaAsset: true
          },
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    return NextResponse.json({ ok: true, properties }, { headers: corsHeaders });
  } catch (error) {
    console.error("Public API Properties error:", error);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500, headers: corsHeaders });
  }
}
