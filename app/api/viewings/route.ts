import { UserRole, ViewingStatus, ViewingType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/server/auth";
import { db } from "@/server/db";

const createSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.nativeEnum(ViewingStatus).optional(),
  viewingType: z.nativeEnum(ViewingType).optional(),
  unsuccessfulReason: z.string().trim().min(1).optional(),
});

const listQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(ViewingStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { propertyId, roomId, tenantId, status, viewingType, unsuccessfulReason } = parsed.data;
  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : new Date();
  const resolvedStatus = status ?? ViewingStatus.SCHEDULED;
  const resolvedType = viewingType ?? ViewingType.INITIAL;

  if (resolvedStatus === ViewingStatus.UNSUCCESSFUL && !unsuccessfulReason) {
    return NextResponse.json(
      { error: "VALIDATION", message: "A reason is required when marking a viewing as unsuccessful." },
      { status: 400 },
    );
  }

  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ownerAgentId: true },
  });

  if (!property) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Property not found." }, { status: 404 });
  }

  if (auth.user.role === UserRole.AGENT && property.ownerAgentId !== auth.user.id) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You can only schedule viewings for your own properties." },
      { status: 403 },
    );
  }

  if (tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Tenant not found." }, { status: 404 });
    }
  }

  const viewing = await db.viewing.create({
    data: {
      propertyId,
      roomId: roomId ?? null,
      tenantId: tenantId ?? null,
      scheduledByAgentId: auth.user.id,
      scheduledAt,
      status: resolvedStatus,
      viewingType: resolvedType,
      unsuccessfulReason: unsuccessfulReason ?? null,
    },
    include: {
      scheduledByAgent: { select: { id: true, agentDisplayName: true } },
      property: {
        select: {
          id: true,
          propertyRef: true,
          addressLine1: true,
          city: true,
          postcode: true,
        },
      },
    },
  });

  // Increment daily report counters
  try {
    const now = new Date();
    const reportDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (resolvedStatus === ViewingStatus.SUCCESSFUL) {
      await db.dailyReport.upsert({
        where: { agentId_reportDate: { agentId: auth.user.id, reportDate } },
        create: { agentId: auth.user.id, reportDate, successfulViewings: 1 },
        update: { successfulViewings: { increment: 1 } },
      });
    } else if (resolvedStatus === ViewingStatus.SCHEDULED) {
      await db.dailyReport.upsert({
        where: { agentId_reportDate: { agentId: auth.user.id, reportDate } },
        create: { agentId: auth.user.id, reportDate, viewingsArranged: 1 },
        update: { viewingsArranged: { increment: 1 } },
      });
    }
  } catch {
    // Non-critical — don't fail the request
  }

  return NextResponse.json({ viewing }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = listQuerySchema.safeParse({
    propertyId: request.nextUrl.searchParams.get("propertyId") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", message: "Invalid query." }, { status: 400 });
  }

  const { propertyId, status, page, pageSize } = parsed.data;

  const where = {
    ...(auth.user.role === UserRole.AGENT ? { scheduledByAgentId: auth.user.id } : {}),
    ...(propertyId ? { propertyId } : {}),
    ...(status ? { status } : {}),
  };

  const [viewings, total] = await Promise.all([
    db.viewing.findMany({
      where,
      include: {
        scheduledByAgent: { select: { id: true, agentDisplayName: true } },
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
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.viewing.count({ where }),
  ]);

  return NextResponse.json({
    viewings,
    pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}
