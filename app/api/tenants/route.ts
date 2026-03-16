import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const createTenantSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required"),
    phone: z.string().trim().min(1, "Phone number is required"),
    email: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
    currentAddress: z.string().trim().min(1).nullable().optional(),
    moveInDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().date().nullable().optional()),
    rentAmount: z.coerce.number().min(0).nullable().optional(),
    depositAmount: z.coerce.number().min(0).nullable().optional(),
    notes: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const where: Prisma.TenantWhereInput =
    auth.user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { sale: { property: { ownerAgentId: auth.user.id } } },
            { addedByAgentId: auth.user.id, saleId: null },
          ],
        };

  const tenants = await db.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
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
      saleId: true,
      addedByAgentId: true,
      sale: {
        select: {
          property: {
            select: {
              id: true,
              propertyRef: true,
              addressLine1: true,
              city: true,
              postcode: true,
              landlord: { select: { id: true, landlordName: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ tenants });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof createTenantSchema>;
  try {
    payload = createTenantSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid tenant payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const normalized = normalizeUkPhone(payload.phone);
  if (!normalized.ok) {
    return NextResponse.json(
      { error: "INVALID_PHONE", message: normalized.message },
      { status: 400 },
    );
  }

  // Check for existing tenant with same phone (last 10 digits) — globally unique
  const existing = await db.tenant.findFirst({
    where: { phoneLast10: normalized.phoneLast10 },
    select: { id: true, fullName: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "TENANT_PHONE_CONFLICT",
        message: `A tenant with this phone number already exists (${existing.fullName}).`,
        existing,
      },
      { status: 409 },
    );
  }

  const tenant = await db.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        fullName: payload.fullName,
        phone: payload.phone.trim(),
        phoneLast10: normalized.phoneLast10,
        email: payload.email ?? null,
        currentAddress: payload.currentAddress ?? null,
        moveInDate: payload.moveInDate ? new Date(payload.moveInDate) : null,
        rentAmount: payload.rentAmount ?? null,
        depositAmount: payload.depositAmount ?? null,
        notes: payload.notes ?? null,
        addedByAgentId: auth.user.id,
      },
      select: {
        id: true, fullName: true, email: true, phone: true, phoneLast10: true,
        currentAddress: true, moveInDate: true, rentAmount: true,
        depositAmount: true, notes: true, createdAt: true, updatedAt: true,
        saleId: true, addedByAgentId: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "TENANT",
        entityId: created.id,
        action: "CREATE_TENANT",
        metadata: { phoneLast10: normalized.phoneLast10, addedByAgentId: auth.user.id },
        beforeJson: Prisma.JsonNull,
        afterJson: created,
      },
    });

    return created;
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
