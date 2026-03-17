import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";
import { sendNumberSearchedEmail } from "@/server/email/service";

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

  const ownershipConflict = Boolean(landlord && !canAccessExisting);

  // Notify the owner agent when another agent searches their landlord's number
  if (ownershipConflict && landlord && landlord.ownerAgentId) {
    try {
      const ownerAgent = await db.user.findUnique({
        where: { id: landlord.ownerAgentId },
        select: { id: true, email: true, agentDisplayName: true },
      });

      if (ownerAgent) {
        const searchingAgentName = auth.user.agentDisplayName;
        const notificationBody = `Agent "${searchingAgentName}" searched for the number belonging to your landlord ${landlord.landlordName} (${landlord.phoneLast10}).`;

        await db.notification.create({
          data: {
            userId: ownerAgent.id,
            type: "NUMBER_SEARCHED",
            title: "Your landlord number was searched",
            body: notificationBody,
            metadata: {
              landlordId: landlord.id,
              landlordName: landlord.landlordName,
              landlordPhone: landlord.phoneLast10,
              searchingAgentId: auth.user.id,
              searchingAgentName,
            },
          },
        });

        // Fire email in background — do not block the response
        void sendNumberSearchedEmail({
          to: ownerAgent.email,
          ownerAgentName: ownerAgent.agentDisplayName,
          searchingAgentName,
          landlordName: landlord.landlordName,
          landlordPhone: landlord.phoneLast10,
        }).catch(() => {
          // Silently swallow email errors — notification is already saved in DB
        });
      }
    } catch {
      // Notification failure should never break the check-number response
    }
  }

  return NextResponse.json({
    phoneInput,
    phoneLast10: normalized.phoneLast10,
    phoneE164: normalized.phoneE164,
    landlordExists: Boolean(landlord),
    landlord,
    canCreateLandlord: !landlord,
    canCreateProperty: canAccessExisting,
    ownershipConflict,
  });
}
