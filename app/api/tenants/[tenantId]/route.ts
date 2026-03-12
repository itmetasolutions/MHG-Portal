import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const updateTenantSchema = z
  .object({
    fullName: z.string().trim().min(1).optional(),
    email: z.string().trim().email().nullable().optional().or(z.literal("").transform(() => null)),
    phone: z.string().trim().min(1).nullable().optional(),
    currentAddress: z.string().trim().min(1).nullable().optional(),
    moveInDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().date().nullable().optional()),
    rentAmount: z.coerce.number().min(0).nullable().optional(),
    depositAmount: z.coerce.number().min(0).nullable().optional(),
    notes: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

type Params = { params: { tenantId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      id: true,
      fullName: true,
      sale: {
        select: {
          property: {
            select: { ownerAgentId: true },
          },
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Tenant not found." }, { status: 404 });
  }

  // Agents can only edit tenants on their own properties
  if (auth.user.role !== "ADMIN" && tenant.sale.property.ownerAgentId !== auth.user.id) {
    return NextResponse.json({ error: "FORBIDDEN", message: "You can only edit tenants on your own properties." }, { status: 403 });
  }

  let payload: z.infer<typeof updateTenantSchema>;
  try {
    payload = updateTenantSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid tenant update payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const updateData: Prisma.TenantUpdateInput = {};
  if (payload.fullName !== undefined) updateData.fullName = payload.fullName;
  if (payload.email !== undefined) updateData.email = payload.email;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.currentAddress !== undefined) updateData.currentAddress = payload.currentAddress;
  if (payload.moveInDate !== undefined) {
    updateData.moveInDate = payload.moveInDate ? new Date(payload.moveInDate) : null;
  }
  if (payload.rentAmount !== undefined) updateData.rentAmount = payload.rentAmount;
  if (payload.depositAmount !== undefined) updateData.depositAmount = payload.depositAmount;
  if (payload.notes !== undefined) updateData.notes = payload.notes;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "NO_FIELDS_TO_UPDATE", message: "No fields to update." }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.tenant.update({
      where: { id: tenant.id },
      data: updateData,
      select: {
        id: true, fullName: true, email: true, phone: true,
        currentAddress: true, moveInDate: true, rentAmount: true,
        depositAmount: true, notes: true, createdAt: true, updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "TENANT",
        entityId: tenant.id,
        action: "UPDATE_TENANT",
        metadata: { fullName: tenant.fullName },
        beforeJson: tenant,
        afterJson: result,
      },
    });

    return result;
  });

  return NextResponse.json({ tenant: updated });
}
