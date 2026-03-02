import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const callIdSchema = z.string().uuid("callId must be a valid UUID");
const statusSchema = z.enum(["MISSED", "RINGING", "ANSWERED", "REJECTED", "COMPLETED", "FAILED"]);

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

const patchCallSchema = z
  .object({
    status: statusSchema.optional(),
    answeredAt: z.preprocess(parseOptionalDate, z.date().nullable().optional()),
    endedAt: z.preprocess(parseOptionalDate, z.date().nullable().optional()),
    durationSec: z.number().int().min(0).max(24 * 60 * 60).optional(),
    recordingUrl: z.preprocess(normalizeOptionalText, z.string().max(1000).nullable().optional()),
    notes: z.preprocess(normalizeOptionalText, z.string().max(2000).nullable().optional()),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.status === undefined &&
      value.answeredAt === undefined &&
      value.endedAt === undefined &&
      value.durationSec === undefined &&
      value.recordingUrl === undefined &&
      value.notes === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one update field is required.",
      });
    }
  });

function mapCall(call: {
  id: string;
  direction: string;
  status: string;
  peerName: string | null;
  peerNumber: string | null;
  peerExtension: string | null;
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
  durationSec: number;
  recordingUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    fullName: string;
    phoneNumber: string;
    extensionNumber: string | null;
  } | null;
  counterpartUser: {
    id: string;
    agentDisplayName: string;
    email: string;
  } | null;
}) {
  return {
    id: call.id,
    direction: call.direction,
    status: call.status,
    peerName: call.peerName,
    peerNumber: call.peerNumber,
    peerExtension: call.peerExtension,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    durationSec: call.durationSec,
    recordingUrl: call.recordingUrl,
    notes: call.notes,
    createdAt: call.createdAt,
    updatedAt: call.updatedAt,
    contact: call.contact,
    counterpartUser: call.counterpartUser
      ? {
          id: call.counterpartUser.id,
          name: call.counterpartUser.agentDisplayName,
          email: call.counterpartUser.email,
        }
      : null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { callId: string } },
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const callIdParse = callIdSchema.safeParse(params.callId);
  if (!callIdParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_CALL_ID",
        message: callIdParse.error.issues[0]?.message ?? "Invalid call id.",
      },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof patchCallSchema>;
  try {
    payload = patchCallSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid call history update payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const existing = await db.dialerCall.findFirst({
    where: { id: callIdParse.data, agentUserId: auth.user.id },
    select: {
      id: true,
      status: true,
      answeredAt: true,
      endedAt: true,
      durationSec: true,
      recordingUrl: true,
      notes: true,
      startedAt: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Call not found." }, { status: 404 });
  }

  const updateData: Prisma.DialerCallUpdateInput = {};
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.answeredAt !== undefined) updateData.answeredAt = payload.answeredAt;
  if (payload.endedAt !== undefined) updateData.endedAt = payload.endedAt;
  if (payload.durationSec !== undefined) updateData.durationSec = payload.durationSec;
  if (payload.recordingUrl !== undefined) updateData.recordingUrl = payload.recordingUrl;
  if (payload.notes !== undefined) updateData.notes = payload.notes;

  if (
    payload.endedAt !== undefined &&
    payload.durationSec === undefined &&
    payload.endedAt
  ) {
    updateData.durationSec = Math.max(
      0,
      Math.floor((payload.endedAt.getTime() - existing.startedAt.getTime()) / 1000),
    );
  }

  const call = await db.$transaction(async (tx) => {
    const updated = await tx.dialerCall.update({
      where: { id: existing.id },
      data: updateData,
      select: {
        id: true,
        direction: true,
        status: true,
        peerName: true,
        peerNumber: true,
        peerExtension: true,
        startedAt: true,
        answeredAt: true,
        endedAt: true,
        durationSec: true,
        recordingUrl: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        contact: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            extensionNumber: true,
          },
        },
        counterpartUser: {
          select: {
            id: true,
            agentDisplayName: true,
            email: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "DIALER_CALL",
        entityId: existing.id,
        action: "DIALER_CALL_LOG_UPDATE",
        beforeJson: {
          status: existing.status,
          answeredAt: existing.answeredAt,
          endedAt: existing.endedAt,
          durationSec: existing.durationSec,
          recordingUrl: existing.recordingUrl,
          notes: existing.notes,
        },
        afterJson: {
          status: updated.status,
          answeredAt: updated.answeredAt,
          endedAt: updated.endedAt,
          durationSec: updated.durationSec,
          recordingUrl: updated.recordingUrl,
          notes: updated.notes,
        },
      },
    });

    return updated;
  });

  return NextResponse.json({
    message: "Call history updated.",
    call: mapCall(call),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { callId: string } },
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const callIdParse = callIdSchema.safeParse(params.callId);
  if (!callIdParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_CALL_ID",
        message: callIdParse.error.issues[0]?.message ?? "Invalid call id.",
      },
      { status: 400 },
    );
  }

  const existing = await db.dialerCall.findFirst({
    where: { id: callIdParse.data, agentUserId: auth.user.id },
    select: {
      id: true,
      direction: true,
      status: true,
      peerName: true,
      peerNumber: true,
      peerExtension: true,
      startedAt: true,
      endedAt: true,
      durationSec: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Call not found." }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.dialerCall.delete({
      where: { id: existing.id },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "DIALER_CALL",
        entityId: existing.id,
        action: "DIALER_CALL_LOG_DELETE",
        beforeJson: existing,
        afterJson: Prisma.JsonNull,
      },
    });
  });

  return NextResponse.json({
    message: "Call history deleted.",
  });
}
