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

export async function GET(request: Request, { params }: { params: { propertyId: string } }) {
  try {
    const property = await db.property.findFirst({
      where: {
        id: params.propertyId,
        publishedToWebsite: true,
        status: { not: "CLOSED" },
      },
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

    if (!property) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true, property }, { headers: corsHeaders });
  } catch (error) {
    console.error("Public API Property detail error:", error);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500, headers: corsHeaders });
  }
}
