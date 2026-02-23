import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const querySchema = z
  .object({
    landlordNumber: z.string().trim().min(1, "landlordNumber is required"),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const parse = querySchema.safeParse({
    landlordNumber: request.nextUrl.searchParams.get("landlordNumber") ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "landlordNumber is required.",
        details: parse.error.flatten(),
      },
      { status: 400 },
    );
  }

  const landlordNumber = parse.data.landlordNumber;

  const [active, passiveCount] = await Promise.all([
    db.landlord.findFirst({
      where: {
        landlordNumber,
        status: "ACTIVE",
      },
      select: {
        id: true,
        landlordName: true,
        landlordNumber: true,
        status: true,
        ownerAgentId: true,
        createdAt: true,
        ownerAgent: {
          select: {
            id: true,
            agentDisplayName: true,
          },
        },
      },
    }),
    db.landlord.count({
      where: {
        landlordNumber,
        status: "PASSIVE",
      },
    }),
  ]);

  return NextResponse.json({
    landlordNumber,
    activeExists: Boolean(active),
    existingActiveLandlord: active ?? null,
    passiveCount,
    canCreate: !active,
  });
}
