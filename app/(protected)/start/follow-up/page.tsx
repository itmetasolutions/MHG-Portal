"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function FollowUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get("phone") ?? "";
  const prefillPotentialLandlordId = searchParams.get("potentialLandlordId") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(prefillPhone);
  const [email, setEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        ...(prefillPotentialLandlordId ? { potentialLandlordId: prefillPotentialLandlordId } : {}),
      };

      const res = await fetch("/api/start/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.fieldErrors) setFieldErrors(data.details.fieldErrors);
        setError(data.message ?? "Something went wrong.");
        return;
      }

      router.push("/potential-landlords");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="start-shell">
      <section className="start-hero panel">
        <div className="start-hero-copy">
          <p className="section-label" style={{ marginBottom: "0.5rem" }}>
            Follow-up branch
          </p>
          <h1 className="page-title">Schedule the next touchpoint</h1>
          <p className="page-subtitle">
            Lock the lead to a future reminder and keep the handoff clear for the next call.
          </p>
        </div>

        <div className="start-steps">
          <div className="start-step-card">
            <span className="start-step-index">01</span>
            <p className="start-step-copy">Capture the landlord details and preferred contact number.</p>
          </div>
          <div className="start-step-card">
            <span className="start-step-index">02</span>
            <p className="start-step-copy">Choose the exact follow-up date and time.</p>
          </div>
          <div className="start-step-card">
            <span className="start-step-index">03</span>
            <p className="start-step-copy">The lead stays reserved until the reminder window opens.</p>
          </div>
        </div>
      </section>

      {error && <div className="form-error-banner">{error}</div>}

      <form className="stack" onSubmit={handleSubmit}>
        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Landlord details</h2>
            <span className="badge badge-warning">Follow-up record</span>
          </div>
          <div className="form-grid-2">
            <label className="field">
              <span className="label">First Name</span>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              {fieldErrors.firstName && <span className="field-error">{fieldErrors.firstName}</span>}
            </label>
            <label className="field">
              <span className="label">Last Name</span>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label">Phone</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
            </label>
            <label className="field">
              <span className="label">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Follow-up schedule</h2>
            <span className="badge badge-active">Reminder enabled</span>
          </div>
          <label className="field">
            <span className="label">Follow-up Date & Time</span>
            <input
              className="input"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            {fieldErrors.scheduledAt && <span className="field-error">{fieldErrors.scheduledAt}</span>}
            <span className="hint-text" style={{ marginTop: "0.25rem" }}>
              Reminder emails will be sent 1 hour and 5 minutes before this time.
            </span>
          </label>
        </section>

        <div className="inline-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Scheduling..." : "Schedule Follow-up"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FollowUpPage() {
  return (
    <Suspense fallback={<div className="muted">Loading...</div>}>
      <FollowUpForm />
    </Suspense>
  );
}