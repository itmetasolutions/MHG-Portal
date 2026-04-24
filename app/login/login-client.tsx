"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoginClientProps = {
  initialEmail?: string;
  reason?: string;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
  requiresOtp?: boolean;
  otpRequired?: boolean;
  needsOtp?: boolean;
  twoFactorRequired?: boolean;
  role?: string;
  user?: {
    role?: string;
  };
};

const loginSteps = ["Sign in", "Verify code", "Open workspace"];

const trustBullets = [
  "Secure sign-in with OTP verification",
  "Role-based routing for agents and admins",
  "Trusted workspace access with clear session states",
];

const reasonMessages: Record<string, string> = {
  "session-expired": "Your session expired. Sign in again to continue.",
  "otp-required": "We’re ready for your secure verification step.",
  "admin-access": "Admin access uses the same secure sign-in flow.",
  default: "Sign in to continue into the More Homes Group portal.",
};

function getErrorMessage(response: LoginResponse, fallback: string) {
  return response.message || response.error || fallback;
}

function normalizeRole(value?: string) {
  return String(value || "").trim().toUpperCase();
}

export default function LoginClient({ initialEmail, reason }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof initialEmail === "string") {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const reasonMessage = useMemo(() => {
    if (reason && reasonMessages[reason]) {
      return reasonMessages[reason];
    }

    if (reason === "otp" || reason === "verification") {
      return "Enter your credentials and we’ll route you to secure OTP verification.";
    }

    return reasonMessages.default;
  }, [reason]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setStatus("Checking your details and preparing secure access...");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || data.success === false) {
        throw new Error(getErrorMessage(data, "We couldn’t sign you in right now."));
      }

      const redirectTo = typeof data.redirectTo === "string" ? data.redirectTo : "";
      const role = normalizeRole(data.role || data.user?.role);
      const requiresOtp = Boolean(
        data.requiresOtp || data.otpRequired || data.needsOtp || data.twoFactorRequired,
      );

      if (redirectTo) {
        setStatus("Redirecting to your workspace...");
        router.replace(redirectTo);
        return;
      }

      if (requiresOtp) {
        setStatus("Verification code sent. Opening the secure OTP step...");
        const params = new URLSearchParams();
        params.set("email", trimmedEmail);
        if (reason) {
          params.set("reason", reason);
        }
        router.push(`/verify-otp?${params.toString()}`);
        return;
      }

      if (role === "ADMIN") {
        setStatus("Opening the admin command center...");
        router.replace("/admin");
        return;
      }

      setStatus("Opening your dashboard...");
      router.replace("/dashboard");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "We couldn’t sign you in right now.";
      setError(message);
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--login">
      <div className="auth-page__glow auth-page__glow--gold" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--soft" aria-hidden="true" />

      <section className="auth-shell auth-shell--login">
        <aside className="auth-shell__panel auth-shell__panel--brand">
          <div className="auth-brand">
            <div className="auth-brand__mark">MHG</div>
            <div className="auth-brand__copy">
              <span className="auth-brand__eyebrow">More Homes Group Portal</span>
              <h1 className="auth-brand__title">Secure access for agents and administrators</h1>
              <p className="auth-brand__text">
                Premium authentication, role-based routing, and OTP verification keep every login
                aligned to the right workspace.
              </p>
            </div>
          </div>

          <div className="auth-visual" aria-hidden="true">
            <div className="auth-visual__panel auth-visual__panel--hero">
              <div className="auth-visual__badge">Command center access</div>
              <div className="auth-visual__meter">
                <span />
                <span />
                <span />
              </div>
              <div className="auth-visual__headline">Protected portal</div>
              <div className="auth-visual__subhead">Trust-first sign in</div>
            </div>

            <div className="auth-visual__grid">
              <article className="auth-visual__tile">
                <span className="auth-visual__tile-label">Step 1</span>
                <strong>Authenticate</strong>
                <p>Use your email and password to begin securely.</p>
              </article>
              <article className="auth-visual__tile">
                <span className="auth-visual__tile-label">Step 2</span>
                <strong>Verify OTP</strong>
                <p>Confirm access with a one-time code.</p>
              </article>
              <article className="auth-visual__tile">
                <span className="auth-visual__tile-label">Step 3</span>
                <strong>Enter workspace</strong>
                <p>Move directly into your dashboard or admin area.</p>
              </article>
            </div>
          </div>

          <div className="auth-trust">
            {trustBullets.map((item) => (
              <div key={item} className="auth-trust__item">
                <span className="auth-trust__dot" />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="auth-shell__panel auth-shell__panel--form">
          <div className="auth-card auth-card--login">
            <div className="auth-progress" aria-label="Login progress">
              {loginSteps.map((step, index) => (
                <div key={step} className={`auth-progress__step${index === 0 ? " is-active" : ""}`}>
                  <span className="auth-progress__index">0{index + 1}</span>
                  <span className="auth-progress__label">{step}</span>
                </div>
              ))}
            </div>

            <div className="auth-card__intro">
              <p className="auth-card__eyebrow">Secure login</p>
              <h2 className="auth-card__title">Welcome back</h2>
              <p className="auth-card__copy">{reasonMessage}</p>
            </div>

            {status ? (
              <div className="auth-banner auth-banner--success" role="status" aria-live="polite">
                {status}
              </div>
            ) : null}

            {error ? (
              <div className="auth-banner auth-banner--error" role="alert">
                {error}
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="auth-field">
                <span className="auth-field__label">Email address</span>
                <input
                  className="input auth-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Password</span>
                <input
                  className="input auth-input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <div className="auth-form__meta">
                <span className="auth-form__note">
                  Your access remains protected with an OTP step after sign in.
                </span>
                <Link href="/?support=auth" className="auth-form__link">
                  Need help?
                </Link>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Continue securely"}
              </button>
            </form>

            <div className="auth-footer">
              <span className="auth-footer__text">New here? Request portal access from the team.</span>
              <a
                className="auth-footer__link"
                href="mailto:hello@morehomesgroup.com?subject=Request%20Portal%20Access"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}