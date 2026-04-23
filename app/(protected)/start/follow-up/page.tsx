"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

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
    <form className="stack" onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.25rem" }}>Follow Up</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Schedule a follow-up call. The lead will be locked to your profile until the scheduled time + 1 day.
        </p>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      <div className="panel" style={{ padding: "1.25rem" }}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Landlord Details</p>
        <div className="form-grid-2">
          <label className="field">
            <span className="label">First Name <span className="required">*</span></span>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            {fieldErrors.firstName && <span className="field-error">{fieldErrors.firstName}</span>}
          </label>
          <label className="field">
            <span className="label">Last Name <span className="required">*</span></span>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Phone <span className="required">*</span></span>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel" style={{ padding: "1.25rem" }}>
        <label className="field">
          <span className="label">Follow-up Date &amp; Time <span className="required">*</span></span>
          <input
            className="input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
          {fieldErrors.scheduledAt && <span className="field-error">{fieldErrors.scheduledAt}</span>}
          <span style={{ fontSize: "0.78rem", color: "var(--text-subtle)", marginTop: "0.25rem" }}>
            Reminder emails will be sent 1 hour and 5 minutes before this time.
          </span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Scheduling..." : "Schedule Follow-up"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function FollowUpPage() {
  return (
    <Suspense fallback={<div className="muted">Loading...</div>}>
      <FollowUpForm />
    </Suspense>
  );
}
