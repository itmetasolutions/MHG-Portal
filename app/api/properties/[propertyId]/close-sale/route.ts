import { PropertyStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canEditProperty } from "@/server/policies";

const propertyIdSchema = z.string().uuid("property id must be a valid UUID");

const closeSaleSchema = z
  .object({
    finalAmount: z.coerce.number().positive("finalAmount must be > 0"),
    commissionPct: z.coerce.number().min(0, "commissionPct must be >= 0").max(9999),
    otherCosts: z.coerce.number().min(0).optional(),
    tenant: z
      .object({
        fullName: z.string().trim().min(1, "Tenant full name is required"),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().trim().optional(),
        currentAddress: z.string().trim().optional(),
        moveInDate: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
        rentAmount: z.coerce.number().min(0).optional(),
        depositAmount: z.coerce.number().min(0).optional(),
        notes: z.string().trim().optional(),
      })
      .strict(),
  })
  .strict();

type Params = {
  params: {
    propertyId: string;
  };
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(request: NextRequest, { params }: Params) {
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

  let payload: z.infer<typeof closeSaleSchema>;
  try {
    payload = closeSaleSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid close-sale payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
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
      status: true,
      vacancyType: true,
      landlord: {
        select: {
          id: true,
          ownerAgentId: true,
          phoneLast10: true,
        },
      },
      sales: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Property not found." }, { status: 404 });
  }

  if (
    !canEditProperty(auth.user, {
      ownerAgentId: property.ownerAgentId,
      landlordOwnerAgentId: property.landlord.ownerAgentId,
    })
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only the owner agent or admin can close this sale.",
      },
      { status: 403 },
    );
  }

  if (property.vacancyType === "MULTIPLE") {
    return NextResponse.json(
      {
        error: "USE_ROOM_CLOSE",
        message: "This property has multiple vacancies. Use the room-level close endpoint.",
      },
      { status: 400 },
    );
  }

  if (property.sales.length > 0) {
    return NextResponse.json(
      {
        error: "SALE_ALREADY_EXISTS",
        message: "This property already has a final sale record.",
      },
      { status: 409 },
    );
  }

  const closableStatuses: PropertyStatus[] = ["AVAILABLE"];
  if (!closableStatuses.includes(property.status)) {
    return NextResponse.json(
      {
        error: "INVALID_PROPERTY_STATUS",
        message: "Property must be AVAILABLE to close sale.",
      },
      { status: 400 },
    );
  }

  const finalAmount = round2(payload.finalAmount);
  const commissionPct = round2(payload.commissionPct);
  const otherCosts = round2(payload.otherCosts ?? 0);
  const commissionAmount = round2(finalAmount * (commissionPct / 100));
  const profit = round2(commissionAmount - otherCosts);

  const result = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        propertyId: property.id,
        closedByUserId: auth.user.id,
        finalAmount,
        commissionPct,
        commissionAmount,
        otherCosts,
        profit,
      },
      select: {
        id: true,
        propertyId: true,
        closedByUserId: true,
        finalAmount: true,
        commissionPct: true,
        commissionAmount: true,
        otherCosts: true,
        profit: true,
        closedAt: true,
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        saleId: sale.id,
        fullName: payload.tenant.fullName,
        email: payload.tenant.email?.trim() || null,
        phone: payload.tenant.phone?.trim() || null,
        currentAddress: payload.tenant.currentAddress?.trim() || null,
        moveInDate: payload.tenant.moveInDate ? new Date(payload.tenant.moveInDate) : null,
        rentAmount: payload.tenant.rentAmount ?? null,
        depositAmount: payload.tenant.depositAmount ?? null,
        notes: payload.tenant.notes?.trim() || null,
      },
      select: {
        id: true,
        saleId: true,
        fullName: true,
        email: true,
        phone: true,
        currentAddress: true,
        moveInDate: true,
        rentAmount: true,
        depositAmount: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.property.update({
      where: { id: property.id },
      data: { status: "CLOSED" },
    });

    // Reactivate landlord if it was passive
    await tx.landlord.updateMany({
      where: { id: property.landlord.id, isPassive: true },
      data: { isPassive: false, passiveMarkedAt: null },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: property.id,
        action: "CLOSE_SALE",
        metadata: {
          landlordId: property.landlordId,
          phoneLast10: property.landlord.phoneLast10,
          finalAmount,
          commissionPct,
          commissionAmount,
          otherCosts,
          profit,
          tenantId: tenant.id,
          tenantFullName: tenant.fullName,
        },
        beforeJson: {
          status: property.status,
          sale: null,
        },
        afterJson: {
          status: "CLOSED",
          sale,
          tenant,
        },
      },
    });

    return { sale, tenant };
  });

  return NextResponse.json({ sale: result.sale, tenant: result.tenant }, { status: 201 });
}
