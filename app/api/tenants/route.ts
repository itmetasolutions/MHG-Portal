import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const where: Prisma.TenantWhereInput =
    auth.user.role === "ADMIN"
      ? {}
      : { sale: { property: { ownerAgentId: auth.user.id } } };

  const tenants = await db.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
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
      saleId: true,
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
