import "server-only";
import { env } from "@/lib/env";
import { getEmailProvider } from "./factory";
import { buildLoginOtpTemplate } from "./templates/login-otp";

type SendOtpLoginEmailInput = {
  to: string;
  otpCode: string;
  expiresInMinutes: number;
};

export async function sendOtpLoginEmail(input: SendOtpLoginEmailInput): Promise<void> {
  const provider = getEmailProvider();
  const template = buildLoginOtpTemplate({
    otpCode: input.otpCode,
    expiresInMinutes: input.expiresInMinutes,
  });

  await provider.send({
    to: input.to,
    from: env.OTP_EMAIL_FROM,
    subject: template.subject,
    text: template.text,
  });
}
