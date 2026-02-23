import "server-only";
import type { UserRole } from "@prisma/client";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { sendOtpLoginEmail } from "@/server/email";
import { generateOtpCode, getOtpExpiresAt, hashOtpCode, verifyOtpCodeHash } from "./otp";
import { verifyPassword } from "./password";
import { checkOtpSendRateLimit, checkOtpVerifyRateLimit } from "./rate-limit";

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

type LoginResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_CREDENTIALS" | "OTP_SEND_RATE_LIMIT" | "OTP_DELIVERY_FAILED";
      retryAfterSeconds?: number;
    };

type VerifyOtpResult =
  | { ok: true; user: AuthUser }
  | {
      ok: false;
      code:
        | "INVALID_CREDENTIALS"
        | "OTP_VERIFY_RATE_LIMIT"
        | "OTP_REQUIRED"
        | "OTP_EXPIRED"
        | "OTP_INVALID"
        | "OTP_ATTEMPTS_EXCEEDED";
      retryAfterSeconds?: number;
      attemptsRemaining?: number;
    };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function loginWithPassword(params: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const email = normalizeEmail(params.email);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  const passwordIsValid = await verifyPassword(params.password, user.passwordHash);
  if (!passwordIsValid) {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  const sendRateLimit = await checkOtpSendRateLimit(user.id);
  if (!sendRateLimit.allowed) {
    return {
      ok: false,
      code: "OTP_SEND_RATE_LIMIT",
      retryAfterSeconds: sendRateLimit.retryAfterSeconds,
    };
  }

  const otpCode = generateOtpCode();
  const codeHash = hashOtpCode(user.id, otpCode);
  const expiresAt = getOtpExpiresAt();
  const now = new Date();

  await db.$transaction([
    db.oTPCode.updateMany({
      where: {
        userId: user.id,
        expiresAt: { gt: now },
      },
      data: {
        expiresAt: now,
      },
    }),
    db.oTPCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    }),
  ]);

  try {
    await sendOtpLoginEmail({
      to: user.email,
      otpCode,
      expiresInMinutes: env.OTP_TTL_MINUTES,
    });
  } catch {
    await db.oTPCode.deleteMany({
      where: {
        userId: user.id,
        codeHash,
      },
    });
    return { ok: false, code: "OTP_DELIVERY_FAILED" };
  }

  return { ok: true };
}

export async function verifyOtpForLogin(params: {
  email: string;
  otpCode: string;
}): Promise<VerifyOtpResult> {
  const email = normalizeEmail(params.email);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  const verifyRateLimit = await checkOtpVerifyRateLimit(user.id);
  if (!verifyRateLimit.allowed) {
    return {
      ok: false,
      code: "OTP_VERIFY_RATE_LIMIT",
      retryAfterSeconds: verifyRateLimit.retryAfterSeconds,
    };
  }

  const otpRecord = await db.oTPCode.findFirst({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    const latestOtpRecord = await db.oTPCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { expiresAt: true },
    });

    if (latestOtpRecord && latestOtpRecord.expiresAt <= new Date()) {
      return { ok: false, code: "OTP_EXPIRED" };
    }

    return { ok: false, code: "OTP_REQUIRED" };
  }

  if (otpRecord.attempts >= env.OTP_MAX_VERIFY_ATTEMPTS_PER_CODE) {
    return { ok: false, code: "OTP_ATTEMPTS_EXCEEDED", attemptsRemaining: 0 };
  }

  const otpIsValid = verifyOtpCodeHash(user.id, params.otpCode, otpRecord.codeHash);
  if (!otpIsValid) {
    const updated = await db.oTPCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    const attemptsRemaining = Math.max(
      env.OTP_MAX_VERIFY_ATTEMPTS_PER_CODE - updated.attempts,
      0,
    );

    return { ok: false, code: "OTP_INVALID", attemptsRemaining };
  }

  await db.oTPCode.update({
    where: { id: otpRecord.id },
    data: {
      expiresAt: new Date(),
    },
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}
