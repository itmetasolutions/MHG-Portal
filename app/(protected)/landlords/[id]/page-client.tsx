"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIStatusBadge } from "@/components/ui/badge";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UIConfirmModal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/format";
import {
  fetchLandlordDetails,
  setLandlordPassive,
  updateLandlord,
  type LandlordDetails,
  type SessionRole,
} from "@/lib/portal-api";

type Props = {
  landlordId: string;
  currentUserId: string;
  currentRole: SessionRole;
};

export function LandlordDetailClient({ landlordId, currentUserId, currentRole }: Props) {
  const [landlord, setLandlord] = useState<LandlordDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passiveBusy, setPassiveBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState({
    landlordName: "",
    landlordNumber: "",
    propertyId: "",
    url: "",
  });
  const [confirmPassive, setConfirmPassive] = useState(false);
  const [passiveConfirmText, setPassiveConfirmText] = useState("");

  const isLocked = useMemo(
    () => Boolean(landlord && (landlord.status === "PASSIVE" || landlord.lockedAt)),
    [landlord],
  );
  const canEditFields = useMemo(
    () => Boolean(landlord?.canEdit) && !isLocked,
    [isLocked, landlord?.canEdit],
  );

  const canSetPassive = useMemo(() => {
    if (!landlord) return false;
    return (
      landlord.status === "ACTIVE" &&
      (currentRole === "ADMIN" || landlord.ownerAgent.id === currentUserId)
    );
  }, [currentRole, currentUserId, landlord]);

  const passiveConfirmValid = useMemo(() => {
    if (!landlord) return false;
    const typed = passiveConfirmText.trim().toUpperCase();
    const landlordNumber = landlord.landlordNumber.trim().toUpperCase();
    return typed === "PASSIVE" || typed === landlordNumber;
  }, [landlord, passiveConfirmText]);

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

    setLandlord(result.data.landlord);
    setForm({
      landlordName: result.data.landlord.landlordName,
      landlordNumber: result.data.landlord.landlordNumber,
      propertyId: result.data.landlord.propertyId,
      url: result.data.landlord.url,
    });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditFields) {
      return;
    }

    setSaving(true);
    const result = await updateLandlord(landlordId, {
      landlordName: form.landlordName.trim(),
      landlordNumber: form.landlordNumber.trim(),
      propertyId: form.propertyId.trim(),
      url: form.url.trim(),
    });
    setSaving(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update landlord." });
      return;
    }

    setLandlord(result.data.landlord);
    setMessage({ type: "success", text: "Landlord updated successfully." });
  }

  async function markPassive() {
    if (!passiveConfirmValid) {
      setMessage({
        type: "error",
        text: `Type PASSIVE or landlord number ${landlord?.landlordNumber ?? ""} to confirm.`,
      });
      return;
    }

    setPassiveBusy(true);
    const result = await setLandlordPassive(landlordId);
    setPassiveBusy(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to set PASSIVE." });
      return;
    }

    setConfirmPassive(false);
    setPassiveConfirmText("");
    setMessage({ type: "success", text: "Landlord set to PASSIVE and locked." });
    await load();
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
            Landlord #{landlord.landlordNumber} owned by {landlord.ownerAgent.agentDisplayName}
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
            <UIStatusBadge status={landlord.status} />
            {isLocked ? <span className="badge badge-locked">Locked</span> : null}
            <span className="muted">Created {formatDateTime(landlord.createdAt)}</span>
            {landlord.lockedAt ? <span className="muted">Locked {formatDateTime(landlord.lockedAt)}</span> : null}
            {currentRole === "ADMIN" ? <span className="muted">Admin view</span> : null}
          </div>

          {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

          <form className="field-grid" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">landlordName</span>
              <UIInput
                value={form.landlordName}
                onChange={(event) => setForm((prev) => ({ ...prev, landlordName: event.target.value }))}
                disabled={!canEditFields}
              />
            </label>

            <label className="field">
              <span className="label">landlordNumber</span>
              <UIInput
                value={form.landlordNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, landlordNumber: event.target.value }))}
                disabled={!canEditFields}
              />
            </label>

            <label className="field">
              <span className="label">propertyId</span>
              <UIInput
                value={form.propertyId}
                onChange={(event) => setForm((prev) => ({ ...prev, propertyId: event.target.value }))}
                disabled={!canEditFields}
              />
            </label>

            <label className="field">
              <span className="label">url</span>
              <UIInput
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                disabled={!canEditFields}
              />
            </label>

            <div className="inline-row">
              {canEditFields ? (
                <UIButton type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </UIButton>
              ) : isLocked ? (
                <span className="hint-text">This landlord is locked (PASSIVE). No further edits allowed.</span>
              ) : (
                <span className="hint-text">This landlord is read-only for your account.</span>
              )}
              {canSetPassive ? (
                <UIButton
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setPassiveConfirmText("");
                    setConfirmPassive(true);
                  }}
                >
                  Set Passive
                </UIButton>
              ) : null}
            </div>
          </form>
        </UICardBody>
      </UICard>

      {confirmPassive ? (
        <UIConfirmModal
          title="Set Landlord to PASSIVE"
          body={
            <div className="field-grid">
              <p style={{ margin: 0 }}>
                This action is irreversible. Type <strong>PASSIVE</strong> or{" "}
                <strong>{landlord.landlordNumber}</strong> to confirm locking this landlord.
              </p>
              <label className="field">
                <span className="label">Confirmation</span>
                <UIInput
                  value={passiveConfirmText}
                  onChange={(event) => setPassiveConfirmText(event.target.value)}
                  placeholder={`Type PASSIVE or ${landlord.landlordNumber}`}
                />
              </label>
            </div>
          }
          confirmLabel="Confirm PASSIVE"
          confirmDisabled={!passiveConfirmValid}
          busy={passiveBusy}
          onCancel={() => {
            setPassiveConfirmText("");
            setConfirmPassive(false);
          }}
          onConfirm={() => {
            void markPassive();
          }}
        />
      ) : null}
    </div>
  );
}
