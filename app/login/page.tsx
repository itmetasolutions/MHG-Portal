"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";

type LoginResponse = {
  ok: true;
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
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
    const result = await apiPost<{ email: string; password: string }, LoginResponse>("/api/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);

    if (!result.ok) {
      const errorMessage =
        result.error === "INVALID_CREDENTIALS"
          ? "Invalid email or password."
          : result.error === "OTP_SEND_RATE_LIMIT"
            ? "Too many OTP requests. Please wait and try again."
            : result.message ?? "Unable to sign in.";
      setMessage({ type: "error", text: errorMessage });
      return;
    }

    setMessage({ type: "success", text: "OTP sent. Continue verification." });
    router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Sign In</h1>
          <p className="page-subtitle">Use your account credentials to request a one-time login code.</p>
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
              <span className="label">Password</span>
              <UIInput
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
              {errors.password ? <span className="error-text">{errors.password}</span> : null}
            </label>

            {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

            <div className="inline-row">
              <UIButton type="submit" disabled={busy}>
                {busy ? "Signing In..." : "Continue"}
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
