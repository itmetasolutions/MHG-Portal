import {
  ApprovalEntityType,
  ApprovalStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { notifyApprovalDecision } from "@/server/edit-approvals";
import {
  assertMediaAssetsExist,
  buildPropertyMediaRows,
  normalizeMediaAssetIds,
} from "@/server/property-media";

const approvalIdSchema = z.string().uuid("approval id must be a valid UUID");

const decisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reviewerNotes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict();

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function jsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function applyLandlordApproval(
  tx: Prisma.TransactionClient,
  approval: {
    id: string;
    entityId: string;
    proposedJson: unknown;
  },
  reviewerId: string,
) {
  const proposed = asRecord(approval.proposedJson);
  const current = await tx.landlord.findUnique({
    where: { id: approval.entityId },
    select: {
      id: true,
      landlordName: true,
      landlordNumber: true,
      phoneE164: true,
      phoneLast10: true,
      email: true,
      notes: true,
      isPassive: true,
      passiveMarkedAt: true,
      createdAt: true,
      updatedAt: true,
      createdByUserId: true,
      updatedByUserId: true,
      ownerAgentId: true,
      ownerAgent: { select: { id: true, agentDisplayName: true } },
      _count: { select: { properties: true } },
    },
  });

  if (!current) {
    throw new Error("LANDLORD_NOT_FOUND");
  }

  const updated = await tx.landlord.update({
    where: { id: approval.entityId },
    data: {
      landlordName: typeof proposed.fullName === "string" ? proposed.fullName : undefined,
      email: Object.prototype.hasOwnProperty.call(proposed, "email") ? (proposed.email as string | null) : undefined,
      notes: Object.prototype.hasOwnProperty.call(proposed, "notes") ? (proposed.notes as string | null) : undefined,
      isPassive: Object.prototype.hasOwnProperty.call(proposed, "isPassive") ? (proposed.isPassive as boolean) : undefined,
      passiveMarkedAt: Object.prototype.hasOwnProperty.call(proposed, "isPassive")
        ? ((proposed.isPassive as boolean) ? new Date() : null)
        : undefined,
      updatedByUserId: reviewerId,
    },
    select: {
      id: true,
      landlordName: true,
      landlordNumber: true,
      phoneE164: true,
      phoneLast10: true,
      email: true,
      notes: true,
      isPassive: true,
      passiveMarkedAt: true,
      createdAt: true,
      updatedAt: true,
      createdByUserId: true,
      updatedByUserId: true,
      ownerAgentId: true,
      ownerAgent: { select: { id: true, agentDisplayName: true } },
      _count: { select: { properties: true } },
    },
  });

  await tx.auditLog.create({
    data: {
      userId: reviewerId,
      entityType: "LANDLORD",
      entityId: approval.entityId,
      action: "APPROVE_LANDLORD_UPDATE",
      metadata: {
        sourceApprovalId: approval.id,
      },
      beforeJson: jsonValue(current),
      afterJson: jsonValue(updated),
    },
  });
}

async function applyPropertyApproval(
  tx: Prisma.TransactionClient,
  approval: {
    id: string;
    entityId: string;
    proposedJson: unknown;
  },
  reviewerId: string,
) {
  const proposed = asRecord(approval.proposedJson);
  const current = await tx.property.findUnique({
    where: { id: approval.entityId },
    select: {
      id: true,
      landlordId: true,
      ownerAgentId: true,
      propertyRef: true,
      title: true,
      description: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      county: true,
      postcode: true,
      propertyType: true,
      beds: true,
      baths: true,
      status: true,
      vacancyType: true,
      landlordDemand: true,
      expectedCommissionPct: true,
      expectedCommissionAmt: true,
      totalRooms: true,
      availableRooms: true,
      rentPerMonth: true,
      depositAmount: true,
      isFurnished: true,
      personsAllowed: true,
      petsAllowed: true,
      dssAllowed: true,
      childrenAllowed: true,
      availabilityDate: true,
      livingLandlord: true,
      createdAt: true,
      updatedAt: true,
      landlord: { select: { id: true, landlordName: true } },
      ownerAgent: { select: { id: true, agentDisplayName: true } },
      mediaLinks: {
        orderBy: [{ sortOrder: "asc" }, { mediaAssetId: "asc" }],
        select: {
          sortOrder: true,
          mediaAsset: {
            select: {
              id: true,
              name: true,
              mimeType: true,
              dataUrl: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!current) {
    throw new Error("PROPERTY_NOT_FOUND");
  }

  const updateData: Prisma.PropertyUncheckedUpdateInput = {
    landlordId: typeof proposed.landlordId === "string" ? proposed.landlordId : undefined,
    propertyRef: typeof proposed.propertyRef === "string" ? proposed.propertyRef : undefined,
    title: Object.prototype.hasOwnProperty.call(proposed, "title") ? (proposed.title as string | null) : undefined,
    description: Object.prototype.hasOwnProperty.call(proposed, "description") ? (proposed.description as string | null) : undefined,
    addressLine1: Object.prototype.hasOwnProperty.call(proposed, "addressLine1") ? (proposed.addressLine1 as string | null) : undefined,
    addressLine2: Object.prototype.hasOwnProperty.call(proposed, "addressLine2") ? (proposed.addressLine2 as string | null) : undefined,
    city: Object.prototype.hasOwnProperty.call(proposed, "city") ? (proposed.city as string | null) : undefined,
    county: Object.prototype.hasOwnProperty.call(proposed, "county") ? (proposed.county as string | null) : undefined,
    postcode: Object.prototype.hasOwnProperty.call(proposed, "postcode") ? (proposed.postcode as string | null) : undefined,
    propertyType: Object.prototype.hasOwnProperty.call(proposed, "propertyType") ? (proposed.propertyType as string | null) : undefined,
    beds: Object.prototype.hasOwnProperty.call(proposed, "beds") ? (proposed.beds as number | null) : undefined,
    baths: Object.prototype.hasOwnProperty.call(proposed, "baths") ? (proposed.baths as number | null) : undefined,
    status: Object.prototype.hasOwnProperty.call(proposed, "status") ? (proposed.status as never) : undefined,
    landlordDemand: Object.prototype.hasOwnProperty.call(proposed, "landlordDemand") ? (proposed.landlordDemand as number | null) : undefined,
    expectedCommissionPct: Object.prototype.hasOwnProperty.call(proposed, "expectedCommissionPct") ? (proposed.expectedCommissionPct as number | null) : undefined,
    expectedCommissionAmt: Object.prototype.hasOwnProperty.call(proposed, "expectedCommissionAmt") ? (proposed.expectedCommissionAmt as number | null) : undefined,
    totalRooms: Object.prototype.hasOwnProperty.call(proposed, "totalRooms") ? (proposed.totalRooms as number | null) : undefined,
    availableRooms: Object.prototype.hasOwnProperty.call(proposed, "availableRooms") ? (proposed.availableRooms as number | null) : undefined,
    rentPerMonth: Object.prototype.hasOwnProperty.call(proposed, "rentPerMonth") ? (proposed.rentPerMonth as number | null) : undefined,
    depositAmount: Object.prototype.hasOwnProperty.call(proposed, "depositAmount") ? (proposed.depositAmount as number | null) : undefined,
    isFurnished: Object.prototype.hasOwnProperty.call(proposed, "isFurnished") ? (proposed.isFurnished as boolean | null) : undefined,
    personsAllowed: Object.prototype.hasOwnProperty.call(proposed, "personsAllowed") ? (proposed.personsAllowed as number | null) : undefined,
    petsAllowed: Object.prototype.hasOwnProperty.call(proposed, "petsAllowed") ? (proposed.petsAllowed as boolean | null) : undefined,
    dssAllowed: Object.prototype.hasOwnProperty.call(proposed, "dssAllowed") ? (proposed.dssAllowed as boolean | null) : undefined,
    childrenAllowed: Object.prototype.hasOwnProperty.call(proposed, "childrenAllowed") ? (proposed.childrenAllowed as boolean | null) : undefined,
    availabilityDate: Object.prototype.hasOwnProperty.call(proposed, "availabilityDate")
      ? (proposed.availabilityDate ? new Date(String(proposed.availabilityDate)) : null)
      : undefined,
    livingLandlord: Object.prototype.hasOwnProperty.call(proposed, "livingLandlord") ? (proposed.livingLandlord as boolean | null) : undefined,
  };
  const normalizedMediaAssetIds = Array.isArray(proposed.mediaAssetIds)
    ? normalizeMediaAssetIds(
        proposed.mediaAssetIds.filter((value): value is string => typeof value === "string"),
      )
    : undefined;

  if (normalizedMediaAssetIds !== undefined) {
    await assertMediaAssetsExist(tx, normalizedMediaAssetIds);
  }

  if (Object.values(updateData).some((value) => value !== undefined)) {
    await tx.property.update({
      where: { id: approval.entityId },
      data: updateData,
      select: { id: true },
    });
  }

  if (normalizedMediaAssetIds !== undefined) {
    await tx.propertyMedia.deleteMany({
      where: { propertyId: approval.entityId },
    });

    if (normalizedMediaAssetIds.length > 0) {
      await tx.propertyMedia.createMany({
        data: buildPropertyMediaRows(approval.entityId, normalizedMediaAssetIds),
      });
    }
  }

  const updated = await tx.property.findUniqueOrThrow({
    where: { id: approval.entityId },
    select: {
      id: true,
      landlordId: true,
      ownerAgentId: true,
      propertyRef: true,
      title: true,
      description: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      county: true,
      postcode: true,
      propertyType: true,
      beds: true,
      baths: true,
      status: true,
      vacancyType: true,
      landlordDemand: true,
      expectedCommissionPct: true,
      expectedCommissionAmt: true,
      totalRooms: true,
      availableRooms: true,
      rentPerMonth: true,
      depositAmount: true,
      isFurnished: true,
      personsAllowed: true,
      petsAllowed: true,
      dssAllowed: true,
      childrenAllowed: true,
      availabilityDate: true,
      livingLandlord: true,
      createdAt: true,
      updatedAt: true,
      landlord: { select: { id: true, landlordName: true } },
      ownerAgent: { select: { id: true, agentDisplayName: true } },
      mediaLinks: {
        orderBy: [{ sortOrder: "asc" }, { mediaAssetId: "asc" }],
        select: {
          sortOrder: true,
          mediaAsset: {
            select: {
              id: true,
              name: true,
              mimeType: true,
              dataUrl: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  await tx.auditLog.create({
    data: {
      userId: reviewerId,
      entityType: "PROPERTY",
      entityId: approval.entityId,
      action: "APPROVE_PROPERTY_UPDATE",
      metadata: {
        sourceApprovalId: approval.id,
      },
      beforeJson: jsonValue(current),
      afterJson: jsonValue(updated),
    },
  });
}

async function applyTenantApproval(
  tx: Prisma.TransactionClient,
  approval: {
    id: string;
    entityId: string;
    proposedJson: unknown;
  },
  reviewerId: string,
) {
  const proposed = asRecord(approval.proposedJson);
  const current = await tx.tenant.findUnique({
    where: { id: approval.entityId },
    select: {
      id: true,
      saleId: true,
      addedByAgentId: true,
      fullName: true,
      email: true,
      phone: true,
      phoneLast10: true,
      currentAddress: true,
      moveInDate: true,
      rentAmount: true,
      depositAmount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!current) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const updated = await tx.tenant.update({
    where: { id: approval.entityId },
    data: {
      fullName: typeof proposed.fullName === "string" ? proposed.fullName : undefined,
      email: Object.prototype.hasOwnProperty.call(proposed, "email") ? (proposed.email as string | null) : undefined,
      currentAddress: Object.prototype.hasOwnProperty.call(proposed, "currentAddress") ? (proposed.currentAddress as string | null) : undefined,
      moveInDate: Object.prototype.hasOwnProperty.call(proposed, "moveInDate")
        ? (proposed.moveInDate ? new Date(String(proposed.moveInDate)) : null)
        : undefined,
      rentAmount: Object.prototype.hasOwnProperty.call(proposed, "rentAmount") ? (proposed.rentAmount as number | null) : undefined,
      depositAmount: Object.prototype.hasOwnProperty.call(proposed, "depositAmount") ? (proposed.depositAmount as number | null) : undefined,
      notes: Object.prototype.hasOwnProperty.call(proposed, "notes") ? (proposed.notes as string | null) : undefined,
    },
    select: {
      id: true,
      saleId: true,
      addedByAgentId: true,
      fullName: true,
      email: true,
      phone: true,
      phoneLast10: true,
      currentAddress: true,
      moveInDate: true,
      rentAmount: true,
      depositAmount: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: reviewerId,
      entityType: "TENANT",
      entityId: approval.entityId,
      action: "APPROVE_TENANT_UPDATE",
      metadata: {
        sourceApprovalId: approval.id,
      },
      beforeJson: jsonValue(current),
      afterJson: jsonValue(updated),
    },
  });
}

async function applyPotentialTenantApproval(
  tx: Prisma.TransactionClient,
  approval: {
    id: string;
    entityId: string;
    proposedJson: unknown;
  },
  reviewerId: string,
) {
  const proposed = asRecord(approval.proposedJson);
  const current = await tx.potentialTenant.findUnique({
    where: { id: approval.entityId },
    select: {
      id: true,
      addedByAgentId: true,
      fullName: true,
      email: true,
      phone: true,
      interestedIn: true,
      budget: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!current) {
    throw new Error("POTENTIAL_TENANT_NOT_FOUND");
  }

  const updated = await tx.potentialTenant.update({
    where: { id: approval.entityId },
    data: {
      fullName: typeof proposed.fullName === "string" ? proposed.fullName : undefined,
      email: Object.prototype.hasOwnProperty.call(proposed, "email") ? (proposed.email as string | null) : undefined,
      phone: Object.prototype.hasOwnProperty.call(proposed, "phone") ? (proposed.phone as string | null) : undefined,
      interestedIn: Object.prototype.hasOwnProperty.call(proposed, "interestedIn") ? (proposed.interestedIn as string | null) : undefined,
      budget: Object.prototype.hasOwnProperty.call(proposed, "budget") ? (proposed.budget as string | null) : undefined,
      notes: Object.prototype.hasOwnProperty.call(proposed, "notes") ? (proposed.notes as string | null) : undefined,
    },
    select: {
      id: true,
      addedByAgentId: true,
      fullName: true,
      email: true,
      phone: true,
      interestedIn: true,
      budget: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: reviewerId,
      entityType: "POTENTIAL_TENANT",
      entityId: approval.entityId,
      action: "APPROVE_POTENTIAL_TENANT_UPDATE",
      metadata: {
        sourceApprovalId: approval.id,
      },
      beforeJson: jsonValue(current),
      afterJson: jsonValue(updated),
    },
  });
}

async function applyPotentialLandlordApproval(
  tx: Prisma.TransactionClient,
  approval: {
    id: string;
    entityId: string;
    proposedJson: unknown;
  },
  reviewerId: string,
) {
  const proposed = asRecord(approval.proposedJson);
  const current = await tx.potentialLandlord.findUnique({
    where: { id: approval.entityId },
    select: {
      id: true,
      addedByAgentId: true,
      fullName: true,
      phone: true,
      phoneLast10: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!current) {
    throw new Error("POTENTIAL_LANDLORD_NOT_FOUND");
  }

  const updated = await tx.potentialLandlord.update({
    where: { id: approval.entityId },
    data: {
      fullName: typeof proposed.fullName === "string" ? proposed.fullName : undefined,
      phone: typeof proposed.phone === "string" ? proposed.phone : undefined,
      phoneLast10: typeof proposed.phoneLast10 === "string" ? proposed.phoneLast10 : undefined,
    },
    select: {
      id: true,
      addedByAgentId: true,
      fullName: true,
      phone: true,
      phoneLast10: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: reviewerId,
      entityType: "POTENTIAL_LANDLORD",
      entityId: approval.entityId,
      action: "APPROVE_POTENTIAL_LANDLORD_UPDATE",
      metadata: {
        sourceApprovalId: approval.id,
      },
      beforeJson: jsonValue(current),
      afterJson: jsonValue(updated),
    },
  });
}

async function applyApprovalChange(
  tx: Prisma.TransactionClient,
  approval: {
    id: string;
    entityType: ApprovalEntityType;
    entityId: string;
    proposedJson: unknown;
  },
  reviewerId: string,
) {
  switch (approval.entityType) {
    case ApprovalEntityType.LANDLORD:
      await applyLandlordApproval(tx, approval, reviewerId);
      return;
    case ApprovalEntityType.PROPERTY:
      await applyPropertyApproval(tx, approval, reviewerId);
      return;
    case ApprovalEntityType.TENANT:
      await applyTenantApproval(tx, approval, reviewerId);
      return;
    case ApprovalEntityType.POTENTIAL_TENANT:
      await applyPotentialTenantApproval(tx, approval, reviewerId);
      return;
    case ApprovalEntityType.POTENTIAL_LANDLORD:
      await applyPotentialLandlordApproval(tx, approval, reviewerId);
      return;
    default:
      throw new Error("UNSUPPORTED_APPROVAL_ENTITY");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { approvalId: string } },
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const idParse = approvalIdSchema.safeParse(params.approvalId);
  if (!idParse.success) {
    return NextResponse.json(
      { error: "INVALID_APPROVAL_ID", message: idParse.error.issues[0]?.message ?? "Invalid approval id." },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof decisionSchema>;
  try {
    payload = decisionSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid approval decision payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const approval = await db.editApproval.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      status: true,
      summary: true,
      beforeJson: true,
      proposedJson: true,
      requestedById: true,
    },
  });

  if (!approval) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Approval request not found." }, { status: 404 });
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    return NextResponse.json(
      { error: "ALREADY_PROCESSED", message: "This approval request has already been processed." },
      { status: 409 },
    );
  }

  const reviewerNotes = payload.reviewerNotes?.trim() || null;

  try {
    const updatedApproval = await db.$transaction(async (tx) => {
      if (payload.decision === "APPROVE") {
        await applyApprovalChange(tx, approval, auth.user.id);
      }

      const nextStatus =
        payload.decision === "APPROVE" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

      const result = await tx.editApproval.update({
        where: { id: approval.id },
        data: {
          status: nextStatus,
          reviewedById: auth.user.id,
          reviewedAt: new Date(),
          reviewerNotes,
        },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          status: true,
          summary: true,
          reviewerNotes: true,
          createdAt: true,
          reviewedAt: true,
          requestedBy: {
            select: { id: true, email: true, agentDisplayName: true },
          },
          reviewedBy: {
            select: { id: true, email: true, agentDisplayName: true },
          },
        },
      });

      await notifyApprovalDecision({
        tx,
        requesterId: approval.requestedById,
        approvalId: approval.id,
        entityType: approval.entityType,
        entityId: approval.entityId,
        approved: payload.decision === "APPROVE",
        entityLabel: approval.summary ?? `${approval.entityType} ${approval.entityId}`,
        reviewerNotes,
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "EDIT_APPROVAL",
          entityId: approval.id,
          action:
            payload.decision === "APPROVE"
              ? "APPROVE_EDIT_APPROVAL"
              : "REJECT_EDIT_APPROVAL",
          metadata: {
            approvalId: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
            reviewerNotes,
          },
          beforeJson: jsonValue(approval),
          afterJson: jsonValue(result),
        },
      });

      return result;
    });

    return NextResponse.json({
      approval: updatedApproval,
      message:
        payload.decision === "APPROVE"
          ? "Changes approved and applied."
          : "Changes rejected.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.endsWith("_NOT_FOUND")
        ? "The original entry no longer exists."
        : "Failed to process approval request.";
    return NextResponse.json({ error: "APPROVAL_PROCESS_FAILED", message }, { status: 400 });
  }
}
