import { NextResponse } from "next/server";
import { z } from "zod";
import { loginWithPassword } from "@/server/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof loginSchema>;

  try {
    payload = loginSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await loginWithPassword(payload);
  if (!result.ok) {
    if (result.code === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: result.code }, { status: 401 });
    }

    if (result.code === "OTP_SEND_RATE_LIMIT") {
      return NextResponse.json(
        {
          error: result.code,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: result.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "OTP sent" });
}
