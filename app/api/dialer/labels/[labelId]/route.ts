import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const labelIdSchema = z.string().uuid("labelId must be a valid UUID");

const patchLabelSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    colorHex: z
      .string()
      .trim()
      .regex(/^#([A-Fa-f0-9]{6})$/, "colorHex must be a valid hex color")
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.name === undefined && value.colorHex === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one update field is required.",
      });
    }
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { labelId: string } },
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const labelIdParse = labelIdSchema.safeParse(params.labelId);
  if (!labelIdParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_LABEL_ID",
        message: labelIdParse.error.issues[0]?.message ?? "Invalid label id.",
      },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof patchLabelSchema>;
  try {
    payload = patchLabelSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid label payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const label = await db.dialerContactLabel.findFirst({
    where: {
      id: labelIdParse.data,
      ownerUserId: auth.user.id,
    },
    select: {
      id: true,
      name: true,
      colorHex: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { contacts: true } },
    },
  });
  if (!label) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Label not found." }, { status: 404 });
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const next = await tx.dialerContactLabel.update({
        where: { id: label.id },
        data: {
          name: payload.name?.trim(),
          colorHex: payload.colorHex?.toUpperCase(),
        },
        select: {
          id: true,
          name: true,
          colorHex: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { contacts: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "DIALER_LABEL",
          entityId: label.id,
          action: "DIALER_LABEL_UPDATE",
          beforeJson: {
            id: label.id,
            name: label.name,
            colorHex: label.colorHex,
          },
          afterJson: {
            id: next.id,
            name: next.name,
            colorHex: next.colorHex,
          },
        },
      });

      return next;
    });

    return NextResponse.json({
      message: "Label updated.",
      label: {
        id: updated.id,
        name: updated.name,
        colorHex: updated.colorHex,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        contactsCount: updated._count.contacts,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "LABEL_NAME_EXISTS",
          message: "A label with this name already exists.",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { labelId: string } },
) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const labelIdParse = labelIdSchema.safeParse(params.labelId);
  if (!labelIdParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_LABEL_ID",
        message: labelIdParse.error.issues[0]?.message ?? "Invalid label id.",
      },
      { status: 400 },
    );
  }

  const label = await db.dialerContactLabel.findFirst({
    where: {
      id: labelIdParse.data,
      ownerUserId: auth.user.id,
    },
    select: {
      id: true,
      name: true,
      colorHex: true,
    },
  });
  if (!label) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Label not found." }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.dialerContactLabel.delete({
      where: { id: label.id },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "DIALER_LABEL",
        entityId: label.id,
        action: "DIALER_LABEL_DELETE",
        beforeJson: {
          id: label.id,
          name: label.name,
          colorHex: label.colorHex,
        },
        afterJson: Prisma.JsonNull,
      },
    });
  });

  return NextResponse.json({
    message: "Label deleted.",
  });
}
