import { PropertyStatus, RoomType, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canEditProperty } from "@/server/policies";
import { calcAgentCommissionGBP, type CommissionConfigData } from "@/lib/commission";
import { normalizeUkPhone } from "@/server/phone";

const boolField = z.enum(["true", "false"]).transform((v) => v === "true");

const closeSaleSchema = z.object({
  finalRent: z.coerce.number().positive("Agreed rent is required"),
  companyCommission: z.coerce.number().min(0, "Company commission must be >= 0"),
  otherCosts: z.coerce.number().min(0).optional(),
  tenant: z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().min(1, "Phone is required"),
    accommodationType: z.string().trim().optional(),
    countryOriginal: z.string().trim().optional(),
    nationality: z.string().trim().optional(),
    roomType: z.nativeEnum(RoomType).optional(),
    numberOfOccupants: z.coerce.number().int().min(1).optional(),
    numberOfChildren: z.coerce.number().int().min(0).optional(),
    onDSS: boolField.optional(),
    currentlyEmployed: boolField.optional(),
    annualIncome: z.coerce.number().min(0).optional(),
    currentLivingPostcode: z.string().trim().optional(),
    workplacePostcode: z.string().trim().optional(),
    maximumBudget: z.coerce.number().min(0).optional(),
    workingProfession: z.string().trim().optional(),
    immigrationStatus: z.string().trim().optional(),
    moveInDate: z.string().datetime({ offset: true }).optional(),
    rentAmount: z.coerce.number().min(0).optional(),
    depositAmount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(5000).optional(),
  }).strict(),
}).strict();

type Params = { params: { propertyId: string } };

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

async function fetchCommissionConfig(): Promise<CommissionConfigData> {
  const raw = await db.commissionConfig.findFirst({ where: { id: "singleton" } });
  if (!raw) return { type: "FIXED", fixedAmount: 0, fixedCurrency: "PKR", flexibleRanges: null };
  return {
    type: raw.type as "FIXED" | "FLEXIBLE",
    fixedAmount: raw.fixedAmount ? Number(raw.fixedAmount) : null,
    fixedCurrency: raw.fixedCurrency as CommissionConfigData["fixedCurrency"],
    flexibleRanges: raw.flexibleRanges as CommissionConfigData["flexibleRanges"],
  };
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const propertyId = z.string().uuid().safeParse(params.propertyId);
  if (!propertyId.success) {
    return NextResponse.json({ error: "INVALID_PROPERTY_ID", message: "Invalid property id." }, { status: 400 });
  }

  let payload: z.infer<typeof closeSaleSchema>;
  try {
    payload = closeSaleSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid close-sale payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizeUkPhone(payload.tenant.phone);
  if (!normalizedPhone.ok) {
    return NextResponse.json({ error: "INVALID_PHONE", message: normalizedPhone.message }, { status: 400 });
  }

  const property = await db.property.findUnique({
    where: { id: propertyId.data },
    select: {
      id: true,
      landlordId: true,
      ownerAgentId: true,
      status: true,
      vacancyType: true,
      landlord: { select: { id: true, ownerAgentId: true, phoneLast10: true } },
      sales: { select: { id: true }, take: 1 },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Property not found." }, { status: 404 });
  }

  if (!canEditProperty(auth.user, { ownerAgentId: property.ownerAgentId, landlordOwnerAgentId: property.landlord.ownerAgentId })) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Only the owner agent or admin can close this sale." }, { status: 403 });
  }

  if (property.vacancyType === "MULTIPLE") {
    return NextResponse.json(
      { error: "USE_ROOM_CLOSE", message: "Shared properties require room-level close. Use the room close endpoint." },
      { status: 400 },
    );
  }

  if (property.sales.length > 0) {
    return NextResponse.json({ error: "SALE_ALREADY_EXISTS", message: "This property already has a sale record." }, { status: 409 });
  }

  const closableStatuses: PropertyStatus[] = ["AVAILABLE", "DRAFT"];
  if (!closableStatuses.includes(property.status)) {
    return NextResponse.json({ error: "INVALID_PROPERTY_STATUS", message: "Property must be AVAILABLE or DRAFT to close." }, { status: 400 });
  }

  const commissionConfig = await fetchCommissionConfig();
  const finalRent = round2(payload.finalRent);
  const companyCommission = round2(payload.companyCommission);
  const otherCosts = round2(payload.otherCosts ?? 0);
  const agentCommissionAmt = round2(calcAgentCommissionGBP(companyCommission, commissionConfig));
  const profit = round2(companyCommission - otherCosts);

  const tenantFullName = `${payload.tenant.firstName} ${payload.tenant.lastName}`.trim();

  const result = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        propertyId: property.id,
        closedByUserId: auth.user.id,
        finalAmount: finalRent,
        finalRent,
        companyCommission,
        agentCommissionAmt,
        commissionPct: 0,
        commissionAmount: companyCommission,
        otherCosts,
        profit,
      },
      select: {
        id: true, propertyId: true, closedByUserId: true, finalAmount: true,
        finalRent: true, companyCommission: true, agentCommissionAmt: true,
        commissionPct: true, commissionAmount: true, otherCosts: true, profit: true, closedAt: true,
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        saleId: sale.id,
        addedByAgentId: auth.user.id,
        fullName: tenantFullName,
        firstName: payload.tenant.firstName,
        lastName: payload.tenant.lastName,
        email: payload.tenant.email?.trim() || null,
        phone: payload.tenant.phone.trim(),
        phoneLast10: normalizedPhone.phoneLast10,
        accommodationType: payload.tenant.accommodationType?.trim() || null,
        countryOriginal: payload.tenant.countryOriginal?.trim() || null,
        nationality: payload.tenant.nationality?.trim() || null,
        roomType: payload.tenant.roomType ?? null,
        numberOfOccupants: payload.tenant.numberOfOccupants ?? null,
        numberOfChildren: payload.tenant.numberOfChildren ?? null,
        onDSS: payload.tenant.onDSS ?? null,
        currentlyEmployed: payload.tenant.currentlyEmployed ?? null,
        annualIncome: payload.tenant.annualIncome ?? null,
        currentLivingPostcode: payload.tenant.currentLivingPostcode?.trim().toUpperCase() || null,
        workplacePostcode: payload.tenant.workplacePostcode?.trim().toUpperCase() || null,
        maximumBudget: payload.tenant.maximumBudget ?? null,
        workingProfession: payload.tenant.workingProfession?.trim() || null,
        immigrationStatus: payload.tenant.immigrationStatus?.trim() || null,
        moveInDate: payload.tenant.moveInDate ? new Date(payload.tenant.moveInDate) : null,
        rentAmount: payload.tenant.rentAmount ?? finalRent,
        depositAmount: payload.tenant.depositAmount ?? null,
        notes: payload.tenant.notes?.trim() || null,
      },
      select: { id: true, fullName: true, firstName: true, lastName: true, email: true, phone: true, phoneLast10: true, moveInDate: true, rentAmount: true, depositAmount: true, createdAt: true },
    });

    await tx.property.update({ where: { id: property.id }, data: { status: "CLOSED" } });
    await tx.landlord.updateMany({ where: { id: property.landlord.id, isPassive: true }, data: { isPassive: false, passiveMarkedAt: null } });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: property.id,
        action: "CLOSE_SALE",
        metadata: { landlordId: property.landlordId, finalRent, companyCommission, agentCommissionAmt, otherCosts, profit, tenantId: tenant.id },
        beforeJson: { status: property.status },
        afterJson: { status: "CLOSED", sale, tenant },
      },
    });

    return { sale, tenant };
  });

  return NextResponse.json({ sale: result.sale, tenant: result.tenant }, { status: 201 });
}
