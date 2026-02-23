import { randomBytes } from "node:crypto";
import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

const userIdSchema = z.string().uuid("userId must be a valid UUID");

const patchAgentSchema = z
  .object({
    isActive: z.boolean().optional(),
    newPassword: z.string().min(8, "newPassword must be at least 8 characters").max(128).optional(),
    resetPasswordAuto: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.isActive === undefined &&
      value.newPassword === undefined &&
      value.resetPasswordAuto !== true
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one update field is required",
      });
    }

    if (value.newPassword && value.resetPasswordAuto === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Provide newPassword OR set resetPasswordAuto=true, not both",
      });
    }
  });

function generateTempPassword(): string {
  return `Tmp-${randomBytes(8).toString("base64url")}9!`;
}

type AgentSnapshot = {
  id: string;
  email: string;
  role: UserRole;
  agentDisplayName: string;
  isActive: boolean;
  createdAt: Date;
};

export async function PATCH(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const userIdParse = userIdSchema.safeParse(params.userId);
  if (!userIdParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_USER_ID",
        message: userIdParse.error.issues[0]?.message ?? "Invalid user id.",
      },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof patchAgentSchema>;
  try {
    payload = patchAgentSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid update payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const currentUser = await db.user.findUnique({
    where: { id: userIdParse.data },
    select: {
      id: true,
      email: true,
      role: true,
      agentDisplayName: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Agent not found." }, { status: 404 });
  }

  if (currentUser.role !== "AGENT") {
    return NextResponse.json(
      {
        error: "INVALID_TARGET_USER",
        message: "Only AGENT users can be managed in this endpoint.",
      },
      { status: 400 },
    );
  }

  const updateData: Prisma.UserUpdateInput = {};
  let generatedTempPassword: string | undefined;
  let statusChanged = false;
  let passwordChanged = false;

  if (payload.isActive !== undefined && payload.isActive !== currentUser.isActive) {
    updateData.isActive = payload.isActive;
    statusChanged = true;
  }

  if (payload.newPassword) {
    updateData.passwordHash = await hashPassword(payload.newPassword);
    passwordChanged = true;
  } else if (payload.resetPasswordAuto === true) {
    generatedTempPassword = generateTempPassword();
    updateData.passwordHash = await hashPassword(generatedTempPassword);
    passwordChanged = true;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      {
        error: "NO_FIELDS_TO_UPDATE",
        message: "No effective changes were provided.",
      },
      { status: 400 },
    );
  }

  const beforeSnapshot: AgentSnapshot = {
    id: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    agentDisplayName: currentUser.agentDisplayName,
    isActive: currentUser.isActive,
    createdAt: currentUser.createdAt,
  };

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        agentDisplayName: true,
        isActive: true,
        createdAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "USER",
        entityId: updated.id,
        action:
          statusChanged && passwordChanged
            ? "ADMIN_AGENT_STATUS_AND_PASSWORD_RESET"
            : statusChanged
              ? "ADMIN_AGENT_STATUS_UPDATE"
              : "ADMIN_AGENT_PASSWORD_RESET",
        beforeJson: beforeSnapshot,
        afterJson: updated,
      },
    });

    return updated;
  });

  return NextResponse.json({
    message:
      statusChanged && passwordChanged
        ? "Agent status and password updated."
        : statusChanged
          ? "Agent status updated."
          : "Agent password reset.",
    agent: result,
    generatedTempPassword,
  });
}
