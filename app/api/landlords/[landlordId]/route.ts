import { LandlordStatus, Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  canChangeLandlordOwnership,
  canEditLandlord,
  canSetLandlordStatus,
  canViewLandlordRegistry,
} from "@/server/policies";

const landlordIdSchema = z.string().uuid("landlord id must be a valid UUID");

const agentPatchSchema = z
  .object({
    landlordName: z.string().trim().min(1).optional(),
    landlordNumber: z.string().trim().min(1).optional(),
    propertyId: z.string().trim().min(1).optional(),
    url: z.string().url().optional(),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional(),
  })
  .strict();

const adminPatchSchema = agentPatchSchema
  .extend({
    ownerAgentId: z.string().uuid().optional(),
  })
  .strict();

const activeConflictSelect = Prisma.validator<Prisma.LandlordSelect>()({
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
});

type Params = {
  params: {
    landlordId: string;
  };
};

function conflictResponse(existingActiveLandlord: Prisma.LandlordGetPayload<{ select: typeof activeConflictSelect }>) {
  return NextResponse.json(
    {
      error: "LANDLORD_NUMBER_CONFLICT",
      message: "An ACTIVE landlord with this landlordNumber already exists.",
      existingActiveLandlord,
    },
    { status: 409 },
  );
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  if (!canViewLandlordRegistry(auth.user)) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Access denied." }, { status: 403 });
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
      ownerAgent: {
        select: {
          id: true,
          agentDisplayName: true,
        },
      },
    },
  });

  if (!landlord) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  const canEdit = canEditLandlord(auth.user, landlord);

  return NextResponse.json({
    landlord: {
      ...landlord,
      canEdit,
    },
  });
}

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

  let payload: z.infer<typeof adminPatchSchema>;
  try {
    payload =
      auth.user.role === "ADMIN"
        ? adminPatchSchema.parse(await request.json())
        : agentPatchSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid update payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      {
        error: "NO_FIELDS_TO_UPDATE",
        message: "At least one updatable field must be provided.",
      },
      { status: 400 },
    );
  }

  const currentLandlord = await db.landlord.findUnique({
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

  if (!currentLandlord) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  if (auth.user.role === "AGENT" && currentLandlord.ownerAgentId !== auth.user.id) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Agents can only update their own landlords.",
      },
      { status: 403 },
    );
  }

  if (auth.user.role === "AGENT" && currentLandlord.status === "PASSIVE") {
    return NextResponse.json(
      {
        error: "LANDLORD_LOCKED",
        message: "PASSIVE landlords are immutable for agents.",
      },
      { status: 403 },
    );
  }

  const requestedStatus = payload.status as LandlordStatus | undefined;
  const allowAdminPassiveRevert = env.ALLOW_ADMIN_PASSIVE_REVERT;

  if (
    requestedStatus !== undefined &&
    requestedStatus !== currentLandlord.status &&
    !canSetLandlordStatus(auth.user, currentLandlord, requestedStatus, {
      allowAdminPassiveRevert,
    })
  ) {
    if (requestedStatus === "ACTIVE" && currentLandlord.status === "PASSIVE") {
      return NextResponse.json(
        {
          error: "INVALID_STATUS_TRANSITION",
          message:
            "Status cannot revert from PASSIVE to ACTIVE unless admin override is explicitly enabled.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You cannot apply this status transition.",
      },
      { status: 403 },
    );
  }

  if (!canEditLandlord(auth.user, currentLandlord) && requestedStatus === undefined) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You cannot edit this landlord.",
      },
      { status: 403 },
    );
  }

  const nextStatus = requestedStatus ?? currentLandlord.status;
  const nextLandlordNumber = payload.landlordNumber ?? currentLandlord.landlordNumber;

  if (nextStatus === "ACTIVE") {
    const duplicate = await db.landlord.findFirst({
      where: {
        id: { not: currentLandlord.id },
        landlordNumber: nextLandlordNumber,
        status: "ACTIVE",
      },
      select: activeConflictSelect,
    });

    if (duplicate) {
      return conflictResponse(duplicate);
    }
  }

  const updateData: Prisma.LandlordUncheckedUpdateInput = {
    updatedByUserId: auth.user.id,
  };

  let hasChanges = false;

  if (payload.landlordName !== undefined && payload.landlordName !== currentLandlord.landlordName) {
    updateData.landlordName = payload.landlordName;
    hasChanges = true;
  }

  if (
    payload.landlordNumber !== undefined &&
    payload.landlordNumber !== currentLandlord.landlordNumber
  ) {
    updateData.landlordNumber = payload.landlordNumber;
    hasChanges = true;
  }

  if (payload.propertyId !== undefined && payload.propertyId !== currentLandlord.propertyId) {
    updateData.propertyId = payload.propertyId;
    hasChanges = true;
  }

  if (payload.url !== undefined && payload.url !== currentLandlord.url) {
    updateData.url = payload.url;
    hasChanges = true;
  }

  const statusChangesToPassive =
    requestedStatus === "PASSIVE" && currentLandlord.status === "ACTIVE";
  const statusChangesToActive =
    requestedStatus === "ACTIVE" && currentLandlord.status === "PASSIVE";

  if (statusChangesToPassive) {
    updateData.status = "PASSIVE";
    updateData.lockedAt = currentLandlord.lockedAt ?? new Date();
    hasChanges = true;
  }

  if (statusChangesToActive) {
    updateData.status = "ACTIVE";
    updateData.lockedAt = null;
    hasChanges = true;
  }

  if ("ownerAgentId" in payload && payload.ownerAgentId !== undefined) {
    if (!canChangeLandlordOwnership(auth.user)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Only ADMIN can change landlord ownership.",
        },
        { status: 403 },
      );
    }

    const ownerAgent = await db.user.findUnique({
      where: { id: payload.ownerAgentId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!ownerAgent || ownerAgent.role !== "AGENT" || !ownerAgent.isActive) {
      return NextResponse.json(
        {
          error: "INVALID_OWNER_AGENT",
          message: "ownerAgentId must reference an active AGENT user.",
        },
        { status: 400 },
      );
    }

    if (payload.ownerAgentId !== currentLandlord.ownerAgentId) {
      updateData.ownerAgentId = payload.ownerAgentId;
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return NextResponse.json(
      {
        error: "NO_FIELDS_TO_UPDATE",
        message: "No effective changes were provided.",
      },
      { status: 400 },
    );
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const landlord = await tx.landlord.update({
        where: { id: currentLandlord.id },
        data: updateData,
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
          action: statusChangesToPassive || statusChangesToActive ? "LANDLORD_STATUS_CHANGE" : "LANDLORD_UPDATE",
          beforeJson: currentLandlord,
          afterJson: landlord,
        },
      });

      return landlord;
    });

    return NextResponse.json({
      landlord: {
        ...updated,
        canEdit: canEditLandlord(auth.user, updated),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await db.landlord.findFirst({
        where: {
          id: { not: currentLandlord.id },
          landlordNumber: nextLandlordNumber,
          status: "ACTIVE",
        },
        select: activeConflictSelect,
      });

      if (duplicate) {
        return conflictResponse(duplicate);
      }
    }

    throw error;
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: "METHOD_NOT_ALLOWED",
      message: "DELETE is not allowed for landlords. Set status to PASSIVE instead.",
    },
    { status: 405 },
  );
}
