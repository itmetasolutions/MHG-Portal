"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { fetchLandlordDetails, updateLandlord, type LandlordDetails } from "@/lib/portal-api";

type Props = {
  landlordId: string;
};

export function LandlordDetailClient({ landlordId }: Props) {
  const [landlord, setLandlord] = useState<LandlordDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
  });

  const canEdit = useMemo(() => Boolean(landlord?.canEdit), [landlord?.canEdit]);

  async function load() {
    setLoading(true);
    setMessage(null);
    const result = await fetchLandlordDetails(landlordId);
    setLoading(false);

    if (!result.ok) {
      setMessage({
        type: "error",
        text: result.message ?? "Failed to load landlord details.",
      });
      return;
    }

    const row = result.data.landlord;
    setLandlord(row);
    setForm({
      fullName: row.landlordName,
      phone: row.phoneE164 ?? row.phoneLast10,
      email: row.email ?? "",
      notes: row.notes ?? "",
    });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    const result = await updateLandlord(landlordId, {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update landlord." });
      return;
    }

    setLandlord(result.data.landlord);
    setMessage({ type: "success", text: "Landlord updated successfully." });
  }

  if (loading) {
    return <p className="muted">Loading landlord...</p>;
  }

  if (!landlord) {
    return (
      <div className="stack">
        {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : <UIAlert type="error">Landlord not found.</UIAlert>}
        <Link href="/landlords" className="btn btn-secondary">
          Back to Landlords
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{landlord.landlordName}</h1>
          <p className="page-subtitle">
            Phone key: {landlord.phoneLast10} • Owner: {landlord.ownerAgent.agentDisplayName}
          </p>
        </div>
        <div className="inline-row">
          <Link className="btn btn-secondary" href={`/landlords/${landlord.id}/properties`}>
            View Properties
          </Link>
          <Link className="btn btn-secondary" href="/landlords">
            Back to Registry
          </Link>
        </div>
      </header>

      <UICard>
        <UICardBody className="stack">
          <div className="inline-row">
            <span className="muted">Created {formatDateTime(landlord.createdAt)}</span>
            <span className="muted">Updated {formatDateTime(landlord.updatedAt)}</span>
            <span className="muted">{landlord._count?.properties ?? 0} properties</span>
          </div>

          {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

          <form className="field-grid" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">Full Name</span>
              <UIInput
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                disabled={!canEdit}
              />
            </label>

            <label className="field">
              <span className="label">Phone</span>
              <UIInput
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                disabled={!canEdit}
              />
            </label>

            <label className="field">
              <span className="label">Email</span>
              <UIInput
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                disabled={!canEdit}
              />
            </label>

            <label className="field">
              <span className="label">Notes</span>
              <UIInput
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                disabled={!canEdit}
              />
            </label>

            <div className="inline-row">
              {canEdit ? (
                <UIButton type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </UIButton>
              ) : (
                <span className="hint-text">Read-only for your account.</span>
              )}
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
