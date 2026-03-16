type LoginOtpTemplateInput = {
  otpCode: string;
  expiresInMinutes: number;
};

export function buildLoginOtpTemplate(input: LoginOtpTemplateInput): {
  subject: string;
  text: string;
} {
  const subject = "Your More Homes Group Portal login code";
  const text = [
    "Your one-time login code is:",
    input.otpCode,
    "",
    `This code expires in ${input.expiresInMinutes} minutes.`,
    "If you did not request this login, you can ignore this email.",
  ].join("\n");

  return { subject, text };
}
