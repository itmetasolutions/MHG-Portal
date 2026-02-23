import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  canCreateProperty,
  canDeleteProperty,
  canEditProperty,
  canViewProperty,
} from "@/server/policies";

const propertyIdSchema = z.string().uuid("property id must be a valid UUID");

const agentUpdateSchema = z
  .object({
    landlordId: z.string().uuid().optional(),
    propertyRef: z.string().trim().min(1).optional(),
    addressLine1: z.string().trim().min(1).nullable().optional(),
    addressLine2: z.string().trim().min(1).nullable().optional(),
    city: z.string().trim().min(1).nullable().optional(),
    stateRegion: z.string().trim().min(1).nullable().optional(),
    postalCode: z.string().trim().min(1).nullable().optional(),
    country: z.string().trim().min(1).nullable().optional(),
    url: z.string().url().nullable().optional(),
    status: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

const adminUpdateSchema = agentUpdateSchema
  .extend({
    ownerAgentId: z.string().uuid().optional(),
  })
  .strict();

type Params = {
  params: {
    propertyId: string;
  };
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const idParse = propertyIdSchema.safeParse(params.propertyId);
  if (!idParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_PROPERTY_ID",
        message: idParse.error.issues[0]?.message ?? "Invalid property id.",
      },
      { status: 400 },
    );
  }

  const property = await db.property.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      landlordId: true,
      ownerAgentId: true,
      propertyRef: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateRegion: true,
      postalCode: true,
      country: true,
      url: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      landlord: {
        select: {
          id: true,
          landlordNumber: true,
          landlordName: true,
          ownerAgentId: true,
        },
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Property not found." }, { status: 404 });
  }

  if (
    !canViewProperty(auth.user, {
      ownerAgentId: property.ownerAgentId,
      landlordOwnerAgentId: property.landlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can access this property.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ property });
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

  const idParse = propertyIdSchema.safeParse(params.propertyId);
  if (!idParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_PROPERTY_ID",
        message: idParse.error.issues[0]?.message ?? "Invalid property id.",
      },
      { status: 400 },
    );
  }

  const currentProperty = await db.property.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      landlordId: true,
      ownerAgentId: true,
      propertyRef: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateRegion: true,
      postalCode: true,
      country: true,
      url: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      landlord: {
        select: {
          id: true,
          ownerAgentId: true,
          landlordNumber: true,
          landlordName: true,
        },
      },
    },
  });

  if (!currentProperty) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Property not found." }, { status: 404 });
  }

  if (
    !canEditProperty(auth.user, {
      ownerAgentId: currentProperty.ownerAgentId,
      landlordOwnerAgentId: currentProperty.landlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can update this property.",
      },
      { status: 403 },
    );
  }

  let payload: z.infer<typeof adminUpdateSchema>;
  try {
    payload =
      auth.user.role === "ADMIN"
        ? adminUpdateSchema.parse(await request.json())
        : agentUpdateSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid property update payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const targetLandlordId = payload.landlordId ?? currentProperty.landlordId;
  const targetLandlord = await db.landlord.findUnique({
    where: { id: targetLandlordId },
    select: {
      id: true,
      ownerAgentId: true,
      landlordNumber: true,
      landlordName: true,
    },
  });

  if (!targetLandlord) {
    return NextResponse.json({ error: "LANDLORD_NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  const ownerAgentId =
    auth.user.role === "ADMIN"
      ? payload.ownerAgentId ?? currentProperty.ownerAgentId
      : currentProperty.ownerAgentId;

  if (
    !canCreateProperty(auth.user, {
      ownerAgentId,
      landlordOwnerAgentId: targetLandlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can assign this ownership.",
      },
      { status: 403 },
    );
  }

  if (ownerAgentId !== targetLandlord.ownerAgentId) {
    return NextResponse.json(
      {
        error: "OWNER_MUST_MATCH_LANDLORD_OWNER",
        message: "ownerAgentId must match landlord.ownerAgentId.",
      },
      { status: 400 },
    );
  }

  const updateData: Prisma.PropertyUncheckedUpdateInput = {};
  let hasChanges = false;

  if (payload.landlordId !== undefined && payload.landlordId !== currentProperty.landlordId) {
    updateData.landlordId = payload.landlordId;
    hasChanges = true;
  }

  if (ownerAgentId !== currentProperty.ownerAgentId) {
    updateData.ownerAgentId = ownerAgentId;
    hasChanges = true;
  }

  if (payload.propertyRef !== undefined && payload.propertyRef !== currentProperty.propertyRef) {
    updateData.propertyRef = payload.propertyRef;
    hasChanges = true;
  }
  if (payload.addressLine1 !== undefined && payload.addressLine1 !== currentProperty.addressLine1) {
    updateData.addressLine1 = payload.addressLine1;
    hasChanges = true;
  }
  if (payload.addressLine2 !== undefined && payload.addressLine2 !== currentProperty.addressLine2) {
    updateData.addressLine2 = payload.addressLine2;
    hasChanges = true;
  }
  if (payload.city !== undefined && payload.city !== currentProperty.city) {
    updateData.city = payload.city;
    hasChanges = true;
  }
  if (payload.stateRegion !== undefined && payload.stateRegion !== currentProperty.stateRegion) {
    updateData.stateRegion = payload.stateRegion;
    hasChanges = true;
  }
  if (payload.postalCode !== undefined && payload.postalCode !== currentProperty.postalCode) {
    updateData.postalCode = payload.postalCode;
    hasChanges = true;
  }
  if (payload.country !== undefined && payload.country !== currentProperty.country) {
    updateData.country = payload.country;
    hasChanges = true;
  }
  if (payload.url !== undefined && payload.url !== currentProperty.url) {
    updateData.url = payload.url;
    hasChanges = true;
  }
  if (payload.status !== undefined && payload.status !== currentProperty.status) {
    updateData.status = payload.status;
    hasChanges = true;
  }

  if (!hasChanges) {
    return NextResponse.json(
      {
        error: "NO_FIELDS_TO_UPDATE",
        message: "No effective property changes were provided.",
      },
      { status: 400 },
    );
  }

  const property = await db.$transaction(async (tx) => {
    const updated = await tx.property.update({
      where: { id: currentProperty.id },
      data: updateData,
      select: {
        id: true,
        landlordId: true,
        ownerAgentId: true,
        propertyRef: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateRegion: true,
        postalCode: true,
        country: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: updated.id,
        action: "PROPERTY_UPDATE",
        beforeJson: currentProperty,
        afterJson: updated,
      },
    });

    return updated;
  });

  return NextResponse.json({ property });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const idParse = propertyIdSchema.safeParse(params.propertyId);
  if (!idParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_PROPERTY_ID",
        message: idParse.error.issues[0]?.message ?? "Invalid property id.",
      },
      { status: 400 },
    );
  }

  const currentProperty = await db.property.findUnique({
    where: { id: idParse.data },
    select: {
      id: true,
      landlordId: true,
      ownerAgentId: true,
      propertyRef: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateRegion: true,
      postalCode: true,
      country: true,
      url: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      landlord: {
        select: {
          ownerAgentId: true,
          landlordNumber: true,
          landlordName: true,
        },
      },
    },
  });

  if (!currentProperty) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Property not found." }, { status: 404 });
  }

  if (
    !canDeleteProperty(auth.user, {
      ownerAgentId: currentProperty.ownerAgentId,
      landlordOwnerAgentId: currentProperty.landlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can delete this property.",
      },
      { status: 403 },
    );
  }

  await db.$transaction([
    db.property.delete({ where: { id: currentProperty.id } }),
    db.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: currentProperty.id,
        action: "PROPERTY_DELETE",
        beforeJson: currentProperty,
        afterJson: Prisma.JsonNull,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
