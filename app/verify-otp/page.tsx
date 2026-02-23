"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";

type VerifyResponse = {
  ok: true;
};

export default function VerifyOtpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [email, setEmail] = useState(queryEmail);
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [errors, setErrors] = useState<{ email?: string; otpCode?: string }>({});

  function validate() {
    const nextErrors: { email?: string; otpCode?: string } = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      nextErrors.otpCode = "Enter a 6-digit code.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!validate()) {
      return;
    }

    setBusy(true);
    const result = await apiPost<{ email: string; otpCode: string }, VerifyResponse>("/api/auth/verify-otp", {
      email: email.trim().toLowerCase(),
      otpCode: otpCode.trim(),
    });
    setBusy(false);

    if (!result.ok) {
      const text =
        result.error === "OTP_INVALID"
          ? "The OTP code is incorrect."
          : result.error === "OTP_EXPIRED"
            ? "The OTP code has expired. Request a new one from login."
            : result.error === "OTP_ATTEMPTS_EXCEEDED"
              ? "Too many incorrect OTP attempts."
              : result.error === "OTP_VERIFY_RATE_LIMIT"
                ? "Too many verification attempts. Please wait."
                : result.message ?? "Failed to verify OTP.";
      setMessage({ type: "error", text });
      return;
    }

    setMessage({ type: "success", text: "Login successful. Redirecting..." });
    router.push("/dashboard");
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Verify OTP</h1>
          <p className="page-subtitle">Enter the 6-digit code sent to your email.</p>
        </div>
      </header>

      <UICard style={{ maxWidth: 520 }}>
        <UICardBody>
          <form className="field-grid" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">Email</span>
              <UIInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@agency.com"
              />
              {errors.email ? <span className="error-text">{errors.email}</span> : null}
            </label>

            <label className="field">
              <span className="label">OTP Code</span>
              <UIInput
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/[^\d]/g, ""))}
                placeholder="123456"
              />
              {errors.otpCode ? <span className="error-text">{errors.otpCode}</span> : null}
            </label>

            {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

            <div className="inline-row">
              <UIButton type="submit" disabled={busy}>
                {busy ? "Verifying..." : "Verify and Sign In"}
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
