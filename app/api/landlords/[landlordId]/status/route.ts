import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canSetLandlordStatus } from "@/server/policies";

const landlordIdSchema = z.string().uuid("landlord id must be a valid UUID");
const statusSchema = z
  .object({
    status: z.literal("PASSIVE"),
  })
  .strict();

type Params = {
  params: {
    landlordId: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const idParse = landlordIdSchema.safeParse(params.landlordId);
  if (!idParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_LANDLORD_ID",
        message: idParse.error.issues[0]?.message ?? "Invalid landlord id.",
      },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof statusSchema>;
  try {
    payload = statusSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Only status=PASSIVE is supported.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const landlord = await db.landlord.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      landlordName: true,
      landlordNumber: true,
      propertyId: true,
      url: true,
      status: true,
      lockedAt: true,
      createdAt: true,
      updatedAt: true,
      createdByUserId: true,
      updatedByUserId: true,
      ownerAgentId: true,
    },
  });

  if (!landlord) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  if (landlord.status === "PASSIVE") {
    return NextResponse.json({
      landlord,
      message: "Landlord is already PASSIVE.",
    });
  }

  if (!canSetLandlordStatus(auth.user, landlord, payload.status)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You cannot set this landlord status.",
      },
      { status: 403 },
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.landlord.update({
      where: { id: landlord.id },
      data: {
        status: "PASSIVE",
        lockedAt: landlord.lockedAt ?? new Date(),
        updatedByUserId: auth.user.id,
      },
      select: {
        id: true,
        landlordName: true,
        landlordNumber: true,
        propertyId: true,
        url: true,
        status: true,
        lockedAt: true,
        createdAt: true,
        updatedAt: true,
        createdByUserId: true,
        updatedByUserId: true,
        ownerAgentId: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "LANDLORD",
        entityId: landlord.id,
        action: "LANDLORD_STATUS_CHANGE",
        beforeJson: landlord,
        afterJson: next,
      },
    });

    return next;
  });

  return NextResponse.json({ landlord: updated });
}
