"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { NumberCheckCard } from "@/components/number-check-card";

function StartOptions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const potentialLandlordId = searchParams.get("potentialLandlordId") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function notInterested() {
    if (!phone || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/start/not-interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          ...(potentialLandlordId ? { potentialLandlordId } : {}),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message ?? "Could not log Not Interested.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!phone) {
    return (
      <div className="start-shell">
        <section className="workspace-panel start-hero">
          <div className="start-hero-copy">
            <p className="section-label">Landlord lookup first</p>
            <h1 className="page-title">Enter the landlord number before choosing an outcome</h1>
            <p className="page-subtitle">
              The new flow starts with a number lookup so ownership, locks, and call logs stay clean.
            </p>
          </div>
        </section>
        <NumberCheckCard />
      </div>
    );
  }

  const query = `phone=${encodeURIComponent(phone)}${potentialLandlordId ? `&potentialLandlordId=${encodeURIComponent(potentialLandlordId)}` : ""}`;

  return (
    <div className="start-shell">
      <section className="workspace-panel start-hero">
        <div className="start-hero-copy">
          <p className="section-label">Start call</p>
          <h1 className="page-title">Choose one outcome for this landlord number</h1>
          <p className="page-subtitle">Number checked: {phone}</p>
        </div>
      </section>

      {error ? <div className="form-error-banner">{error}</div> : null}

      <div className="start-options">
        <Link href={`/start/interested?${query}`} className="start-option-card is-interest">
          <div className="start-option-head">
            <span className="start-option-tag">Confirmed</span>
            <span className="start-option-arrow">Start</span>
          </div>
          <h2 className="start-option-title">Interested</h2>
          <p className="start-option-copy">Create landlord and property, then log the call as Confirmed.</p>
        </Link>

        <button type="button" className="start-option-card is-muted" onClick={notInterested} disabled={busy}>
          <div className="start-option-head">
            <span className="start-option-tag">Closed</span>
            <span className="start-option-arrow">{busy ? "Saving" : "Log"}</span>
          </div>
          <h2 className="start-option-title">Not Interested</h2>
          <p className="start-option-copy">Return to dashboard and log this call as Not Interested.</p>
        </button>

        <Link href={`/start/follow-up?${query}`} className="start-option-card is-follow-up">
          <div className="start-option-head">
            <span className="start-option-tag">Scheduled</span>
            <span className="start-option-arrow">Plan</span>
          </div>
          <h2 className="start-option-title">Follow Up</h2>
          <p className="start-option-copy">Create a potential landlord, lock it, and schedule reminders.</p>
        </Link>
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<div className="muted">Loading...</div>}>
      <StartOptions />
    </Suspense>
  );
}
