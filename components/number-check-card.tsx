"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type LookupResult = {
  phoneLast10?: string;
  landlordExists?: boolean;
  ownershipConflict?: boolean;
  canCreateLandlord?: boolean;
  canCreateProperty?: boolean;
  landlord?: {
    id: string;
    landlordName?: string | null;
    ownerAgent?: { agentDisplayName?: string | null } | null;
    _count?: { properties?: number };
  } | null;
};

export function NumberCheckCard() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Enter a landlord number to check.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/landlords/check-number?phone=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data?.message ?? "Could not check this number.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not check this number.");
    } finally {
      setLoading(false);
    }
  }

  const status = !result
    ? null
    : !result.landlordExists
      ? { label: "New lead", tone: "warning" }
      : result.ownershipConflict
        ? { label: "Owned by another", tone: "info" }
        : { label: "Available to continue", tone: "success" };

  return (
    <section className="workspace-panel number-check-card">
      <div className="workspace-panel__header">
        <div>
          <p className="workspace-kicker">Number check</p>
          <h2 className="workspace-panel__title">Check landlord ownership</h2>
        </div>
      </div>

      <form className="number-check-form" onSubmit={handleSubmit}>
        <input
          className="input number-check-input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Landlord phone number"
          inputMode="tel"
          autoComplete="tel"
        />
        <button className="btn btn-primary number-check-button" type="submit" disabled={loading}>
          {loading ? "Checking..." : "Check"}
        </button>
      </form>

      {error ? <p className="number-check-message number-check-message--error">{error}</p> : null}

      {result && status ? (
        <div className={`number-check-result number-check-result--${status.tone}`}>
          <div>
            <span className="number-check-status">{status.label}</span>
            <strong>{result.landlord?.landlordName ?? `Number ending ${result.phoneLast10 ?? "unknown"}`}</strong>
            <p>
              {result.landlordExists
                ? `${result.landlord?._count?.properties ?? 0} properties${result.landlord?.ownerAgent?.agentDisplayName ? ` - ${result.landlord.ownerAgent.agentDisplayName}` : ""}`
                : "No landlord exists for this number yet."}
            </p>
          </div>
          <div className="number-check-actions">
            {result.landlord?.id && result.canCreateProperty ? (
              <Link className="btn btn-primary btn-sm" href={`/landlords/${result.landlord.id}/properties`}>Add property</Link>
            ) : null}
            {result.landlord?.id && !result.ownershipConflict ? (
              <Link className="btn btn-secondary btn-sm" href={`/landlords/${result.landlord.id}`}>Open</Link>
            ) : null}
            {result.canCreateLandlord ? (
              <Link className="btn btn-primary btn-sm" href={`/start?phone=${encodeURIComponent(phone)}`}>Start</Link>
            ) : null}
            {result.canCreateProperty ? (
              <Link className="btn btn-ghost btn-sm" href={`/start/follow-up?phone=${encodeURIComponent(phone)}`}>Follow up</Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
