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
      select: {
        id: true,
        propertyRef: true,
        title: true,
        description: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        county: true,
        postcode: true,
        propertyType: true,
        propertyCategory: true,
        propType: true,
        vacancyType: true,
        beds: true,
        baths: true,
        status: true,
        rentPerMonth: true,
        rentPerWeek: true,
        depositAmount: true,
        isFurnished: true,
        personsAllowed: true,
        petsAllowed: true,
        dssAllowed: true,
        childrenAllowed: true,
        couplesAllowed: true,
        availabilityDate: true,
        livingLandlord: true,
        garden: true,
        parking: true,
        billsIncluded: true,
        balconyRoofTerrace: true,
        disabledAccess: true,
        livingRoom: true,
        broadbandIncluded: true,
        totalRooms: true,
        availableRooms: true,
        createdAt: true,
        ownerAgent: {
          select: {
            agentDisplayName: true,
            agentPhone: true,
            profilePicture: true,
          }
        },
        rooms: {
          where: { status: { not: "CLOSED" } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            roomName: true,
            status: true,
            landlordDemand: true,
          }
        },
        mediaLinks: {
          orderBy: { sortOrder: "asc" },
          select: {
            sortOrder: true,
            mediaAsset: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                dataUrl: true,
              }
            }
          }
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
