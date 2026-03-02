import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const dialerDomainSchema = z
  .object({
    domain: z.string().max(255).nullable().optional(),
    websocketHost: z.string().max(255).nullable().optional(),
    isEnabled: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.domain === undefined &&
      value.websocketHost === undefined &&
      value.isEnabled === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required.",
      });
    }
  });

function normalizeHost(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^wss?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const config = await db.dialerDomainConfig.findUnique({
    where: { id: "singleton" },
    select: {
      id: true,
      domain: true,
      websocketHost: true,
      isEnabled: true,
      updatedAt: true,
      updatedBy: { select: { id: true, agentDisplayName: true, email: true } },
    },
  });

  return NextResponse.json({
    config: config ?? {
      id: "singleton",
      domain: null,
      websocketHost: null,
      isEnabled: true,
      updatedAt: null,
      updatedBy: null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof dialerDomainSchema>;
  try {
    payload = dialerDomainSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid dialer domain payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const domain = normalizeHost(payload.domain);
  const websocketHost = normalizeHost(payload.websocketHost);

  const updated = await db.$transaction(async (tx) => {
    const before = await tx.dialerDomainConfig.findUnique({
      where: { id: "singleton" },
      select: {
        id: true,
        domain: true,
        websocketHost: true,
        isEnabled: true,
        updatedAt: true,
      },
    });

    const config = await tx.dialerDomainConfig.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        domain: domain ?? null,
        websocketHost: websocketHost ?? null,
        isEnabled: payload.isEnabled ?? true,
        updatedById: auth.user.id,
      },
      update: {
        domain,
        websocketHost,
        isEnabled: payload.isEnabled,
        updatedById: auth.user.id,
      },
      select: {
        id: true,
        domain: true,
        websocketHost: true,
        isEnabled: true,
        updatedAt: true,
        updatedBy: { select: { id: true, agentDisplayName: true, email: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "DIALER_DOMAIN",
        entityId: "singleton",
        action: "ADMIN_DIALER_DOMAIN_UPDATE",
        beforeJson: before ?? Prisma.JsonNull,
        afterJson: {
          id: config.id,
          domain: config.domain,
          websocketHost: config.websocketHost,
          isEnabled: config.isEnabled,
          updatedAt: config.updatedAt,
          updatedById: config.updatedBy?.id ?? null,
        },
      },
    });

    return config;
  });

  return NextResponse.json({
    message: "Dialer domain settings updated.",
    config: updated,
  });
}
