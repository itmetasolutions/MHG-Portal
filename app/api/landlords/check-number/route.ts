import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const querySchema = z
  .object({
    phone: z.string().trim().min(1).optional(),
    landlordNumber: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.phone && !value.landlordNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "phone is required.",
      });
    }
  });

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
    phone: request.nextUrl.searchParams.get("phone") ?? undefined,
    landlordNumber: request.nextUrl.searchParams.get("landlordNumber") ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "phone is required.",
        details: parse.error.flatten(),
      },
      { status: 400 },
    );
  }

  const phoneInput = parse.data.phone ?? parse.data.landlordNumber ?? "";
  const normalized = normalizeUkPhone(phoneInput);
  if (!normalized.ok) {
    return NextResponse.json(
      {
        error: "INVALID_PHONE",
        message: normalized.message,
      },
      { status: 400 },
    );
  }

  const landlord = await db.landlord.findUnique({
    where: {
      phoneLast10: normalized.phoneLast10,
    },
    select: {
      id: true,
      landlordName: true,
      phoneE164: true,
      phoneLast10: true,
      email: true,
      notes: true,
      isPassive: true,
      ownerAgentId: true,
      createdAt: true,
      ownerAgent: {
        select: {
          id: true,
          agentDisplayName: true,
        },
      },
      _count: {
        select: {
          properties: true,
        },
      },
    },
  });

  // Passive landlords can be claimed by any agent
  const canAccessExisting =
    landlord === null ||
    auth.user.role === "ADMIN" ||
    landlord.ownerAgentId === auth.user.id ||
    landlord.isPassive;

  return NextResponse.json({
    phoneInput,
    phoneLast10: normalized.phoneLast10,
    phoneE164: normalized.phoneE164,
    landlordExists: Boolean(landlord),
    landlord,
    canCreateLandlord: !landlord,
    canCreateProperty: canAccessExisting,
    ownershipConflict: Boolean(landlord && !canAccessExisting),
  });
}
