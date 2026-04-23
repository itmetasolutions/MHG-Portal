"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";

type LoginResponse = {
  ok: true;
  message: string;
  requiresOtp: boolean;
  redirectTo: string;
};

type Props = {
  initialEmail?: string;
  reason?: string;
};

export function LoginClient({ initialEmail = "", reason }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (reason === "agent") {
      setMessage({
        type: "error",
        text: "Agent accounts must sign in from the standard login page.",
      });
      return;
    }

    if (reason === "admin") {
      setMessage({
        type: "error",
        text: "Admin accounts must sign in from the admin login page.",
      });
    }
  }, [reason]);

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
    const normalizedEmail = email.trim().toLowerCase();
    const result = await apiPost<
      { email: string; password: string; portal: "agent" },
      LoginResponse
    >("/api/auth/login", {
      email: normalizedEmail,
      password,
      portal: "agent",
    });
    setBusy(false);

    if (!result.ok) {
      if (result.error === "ADMIN_LOGIN_REQUIRED") {
        router.push(`/admin/login?email=${encodeURIComponent(normalizedEmail)}&reason=admin`);
        return;
      }

      const errorMessage =
        result.error === "INVALID_CREDENTIALS"
          ? "Invalid email or password."
          : result.error === "OTP_SEND_RATE_LIMIT"
            ? "Too many OTP requests. Please wait and try again."
            : result.message ?? "Unable to sign in.";
      setMessage({ type: "error", text: errorMessage });
      return;
    }

    if (result.data.requiresOtp) {
      setMessage({ type: "success", text: "OTP sent. Check your email." });
      router.push(result.data.redirectTo);
      return;
    }

    setMessage({ type: "success", text: "Signed in. Redirecting..." });
    window.location.assign(result.data.redirectTo || "/dashboard");
  }

  return (
    <div className="auth-page auth-page-agent">
      <div className="auth-brand">
        <p className="auth-kicker">Secure workspace access</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/morehomesgroup-logo.png" alt="More Homes Group" className="auth-logo" />
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">
          Enter your credentials to continue into the agent workspace. OTP is only requested after
          12 hours of inactivity.
        </p>
        <div className="auth-feature-list">
          <span className="auth-feature-chip">OTP protected</span>
          <span className="auth-feature-chip">Role-aware access</span>
          <span className="auth-feature-chip">Activity tracked</span>
        </div>
        <p className="auth-footnote">
          Admin account? Use the dedicated admin sign-in flow for the control workspace.
        </p>
      </div>

      <UICard className="auth-card">
        <UICardBody className="auth-card-body">
          <form className="field-grid auth-form" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">Email address</span>
              <UIInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@agency.com"
                autoComplete="email"
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
                autoComplete="current-password"
              />
              {errors.password ? <span className="error-text">{errors.password}</span> : null}
            </label>

            {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

            <UIButton type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Signing in..." : "Continue"}
            </UIButton>

            <p className="hint-text auth-hint-text">
              Need admin access?{" "}
              <Link href="/admin/login" className="auth-inline-link">
                Go to admin sign in
              </Link>
            </p>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
