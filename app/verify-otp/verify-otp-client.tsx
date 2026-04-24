"use client";

import Link from "next/link";
import { ClipboardEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type VerifyOtpClientProps = {
  initialEmail?: string;
  reason?: string;
};

type VerifyOtpResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
  role?: string;
  user?: {
    role?: string;
  };
};

const OTP_LENGTH = 6;

const progressSteps = ["Sign in", "Verify code", "Enter workspace"];

const securityNotes = [
  "The code expires after a short window for safety.",
  "Keep this tab open while you check your inbox.",
  "If you did not receive a code, request a resend or contact support.",
];

const reasonCopy: Record<string, string> = {
  "session-expired": "Your previous session expired, so we need one more secure step.",
  "otp-required": "A verification code has been sent to finish sign in.",
  default: "Enter the verification code sent to your email address.",
};

function normalizeRole(value?: string) {
  return String(value || "").trim().toUpperCase();
}

function maskEmail(email?: string) {
  if (!email) {
    return "your email inbox";
  }

  const [name, domain] = email.split("@");
  if (!name || !domain) {
    return email;
  }

  const visibleName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${visibleName}@${domain}`;
}

export default function VerifyOtpClient({ initialEmail, reason }: VerifyOtpClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (typeof initialEmail === "string") {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const code = digits.join("");
  const codeComplete = digits.every(Boolean);

  const headlineCopy = useMemo(() => {
    if (reason && reasonCopy[reason]) {
      return reasonCopy[reason];
    }

    return reasonCopy.default;
  }, [reason]);

  function focusInput(index: number) {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }

  function updateDigits(nextDigits: string[], focusIndex: number) {
    setDigits(nextDigits);
    window.requestAnimationFrame(() => {
      const target = Math.min(Math.max(focusIndex, 0), OTP_LENGTH - 1);
      focusInput(target);
    });
  }

  function handleDigitChange(index: number, value: string) {
    const cleanValue = value.replace(/\D/g, "");

    if (!cleanValue) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    if (cleanValue.length > 1) {
      const next = [...digits];
      cleanValue.slice(0, OTP_LENGTH - index).split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      updateDigits(next, Math.min(index + cleanValue.length, OTP_LENGTH - 1));
      return;
    }

    const next = [...digits];
    next[index] = cleanValue;
    updateDigits(next, index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }

    const next = [...digits];
    pasted.split("").forEach((digit, offset) => {
      if (index + offset < OTP_LENGTH) {
        next[index + offset] = digit;
      }
    });

    updateDigits(next, Math.min(index + pasted.length, OTP_LENGTH - 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!codeComplete) {
      setError("Enter the full 6-digit code before continuing.");
      return;
    }

    if (!email.trim()) {
      setError("Please return to the previous step and enter your email address.");
      return;
    }

    setError(null);
    setStatus("Verifying your secure code...");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code,
          otp: code,
          reason,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as VerifyOtpResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "The code could not be verified.");
      }

      const redirectTo = typeof data.redirectTo === "string" ? data.redirectTo : "";
      const role = normalizeRole(data.role || data.user?.role);

      if (redirectTo) {
        router.replace(redirectTo);
        return;
      }

      if (role === "ADMIN") {
        router.replace("/admin");
        return;
      }

      router.replace("/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The code could not be verified.",
      );
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) {
      return;
    }

    if (!email.trim()) {
      setError("Add your email address on the previous step to request a new code.");
      return;
    }

    setError(null);
    setStatus("Requesting a fresh verification code...");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          reason,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && !data?.success) {
        throw new Error(data?.message || "We couldn’t resend the code right now.");
      }

      setStatus("A new code should arrive shortly. Check spam if needed.");
      setResendCountdown(30);
    } catch (resendError) {
      setStatus("If the code has not arrived, check spam or contact support.");
      setResendCountdown(30);
      if (resendError instanceof Error) {
        setError(resendError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-shell auth-shell--otp">
      <aside className="auth-shell__panel auth-shell__panel--brand">
        <div className="auth-brand">
          <div className="auth-brand__mark">OTP</div>
          <div className="auth-brand__copy">
            <span className="auth-brand__eyebrow">Secure verification</span>
            <h2 className="auth-brand__title">We only open the workspace after verifying you</h2>
            <p className="auth-brand__text">
              This step protects your account and keeps the portal aligned with the right role and
              session state.
            </p>
          </div>
        </div>

        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual__panel auth-visual__panel--hero">
            <div className="auth-visual__badge">Verified access</div>
            <div className="auth-visual__meter">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-visual__headline">Enter the 6-digit code</div>
            <div className="auth-visual__subhead">Sent to {maskEmail(email)}</div>
          </div>

          <div className="auth-visual__grid">
            <article className="auth-visual__tile">
              <span className="auth-visual__tile-label">Step 2</span>
              <strong>Verification</strong>
              <p>{headlineCopy}</p>
            </article>
            <article className="auth-visual__tile">
              <span className="auth-visual__tile-label">Security</span>
              <strong>Protected</strong>
              <p>One code, one session, role-based access.</p>
            </article>
            <article className="auth-visual__tile">
              <span className="auth-visual__tile-label">Result</span>
              <strong>Fast redirect</strong>
              <p>Open your dashboard or admin console immediately after success.</p>
            </article>
          </div>
        </div>

        <div className="auth-trust">
          {securityNotes.map((item) => (
            <div key={item} className="auth-trust__item">
              <span className="auth-trust__dot" />
              {item}
            </div>
          ))}
        </div>
      </aside>

      <div className="auth-shell__panel auth-shell__panel--form">
        <div className="auth-card auth-card--otp">
          <div className="auth-progress" aria-label="Verification progress">
            {progressSteps.map((step, index) => (
              <div key={step} className={`auth-progress__step${index === 1 ? " is-active" : ""}`}>
                <span className="auth-progress__index">0{index + 1}</span>
                <span className="auth-progress__label">{step}</span>
              </div>
            ))}
          </div>

          <div className="auth-card__intro">
            <p className="auth-card__eyebrow">One-time code</p>
            <h1 className="auth-card__title">Check your inbox</h1>
            <p className="auth-card__copy">{headlineCopy}</p>
          </div>

          <div className="auth-code-summary">
            <span className="auth-code-summary__label">Code sent to</span>
            <strong>{maskEmail(email)}</strong>
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
            <div className="auth-code-grid" role="group" aria-label="Verification code">
              {digits.map((digit, index) => (
                <input
                  key={`digit-${index}`}
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  className="input auth-code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_LENGTH}
                  pattern="\d*"
                  value={digit}
                  onChange={(event) => handleDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => handlePaste(index, event)}
                  aria-label={`Verification code digit ${index + 1}`}
                />
              ))}
            </div>

            <div className="auth-form__meta auth-form__meta--stacked">
              <span className="auth-form__note">
                Didn’t get a code? You can request a new one after the short timer ends.
              </span>
              <button
                type="button"
                className="auth-form__link auth-form__link--button"
                onClick={handleResend}
                disabled={resendCountdown > 0 || isSubmitting}
              >
                {resendCountdown > 0 ? `Resend available in ${resendCountdown}s` : "Resend code"}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={isSubmitting || !codeComplete}
            >
              {isSubmitting ? "Verifying..." : "Verify and continue"}
            </button>
          </form>

          <div className="auth-footer">
            <span className="auth-footer__text">Need a different account or help from support?</span>
            <Link className="auth-footer__link" href="/login">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}