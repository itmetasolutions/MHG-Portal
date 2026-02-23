"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { createPropertyIntake, checkLandlordNumber, type PropertyStatus } from "@/lib/portal-api";

type LookupState =
  | { checked: false }
  | {
      checked: true;
      phoneLast10: string;
      ownershipConflict: boolean;
      landlordExists: boolean;
      landlord: {
        id: string;
        landlordName: string;
        phoneLast10: string;
        ownerAgentId: string;
        ownerAgent: { id: string; agentDisplayName: string };
        _count: { properties: number };
      } | null;
    };

const PROPERTY_TYPES = [
  "Flat",
  "Terraced House",
  "Semi-Detached House",
  "Detached House",
  "Bungalow",
  "Maisonette",
  "Studio",
  "HMO",
  "Other",
] as const;

const STATUS_OPTIONS: { value: PropertyStatus; label: string; desc: string }[] = [
  { value: "DRAFT",       label: "Draft",       desc: "Saved but not yet live"    },
  { value: "LIVE",        label: "Live",        desc: "Active on the market"      },
  { value: "UNDER_OFFER", label: "Under Offer", desc: "Offer accepted"            },
  { value: "WITHDRAWN",   label: "Withdrawn",   desc: "Withdrawn from market"     },
];

export default function AddPropertyPage() {
  const router = useRouter();

  // ── Landlord fields ────────────────────────────────────────────────────
  const [landlordPhone,  setLandlordPhone]  = useState("");
  const [landlordName,   setLandlordName]   = useState("");
  const [landlordEmail,  setLandlordEmail]  = useState("");
  const [landlordNotes,  setLandlordNotes]  = useState("");

  // ── Property fields ────────────────────────────────────────────────────
  const [addressLine1,   setAddressLine1]   = useState("");
  const [addressLine2,   setAddressLine2]   = useState("");
  const [city,           setCity]           = useState("");
  const [postcode,       setPostcode]       = useState("");
  const [county,         setCounty]         = useState("");
  const [propertyType,   setPropertyType]   = useState("");
  const [beds,           setBeds]           = useState("");
  const [baths,          setBaths]          = useState("");
  const [landlordDemand, setLandlordDemand] = useState("");
  const [commissionPct,  setCommissionPct]  = useState("");
  const [propertyRef,    setPropertyRef]    = useState("");
  const [status,         setStatus]         = useState<PropertyStatus>("DRAFT");

  // ── UI state ───────────────────────────────────────────────────────────
  const [checking, setChecking] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [lookup,   setLookup]   = useState<LookupState>({ checked: false });
  const [message,  setMessage]  = useState<{ type: "error" | "success"; text: string } | null>(null);

  const normalizedPhone = useMemo(() => landlordPhone.trim(), [landlordPhone]);

  const canSubmit = useMemo(() => {
    if (!lookup.checked) return false;
    if (lookup.ownershipConflict) return false;
    if (lookup.landlordExists) return true;
    return Boolean(landlordName.trim());
  }, [landlordName, lookup]);

  async function runPhoneLookup() {
    if (!normalizedPhone) {
      setLookup({ checked: false });
      return;
    }
    setChecking(true);
    setMessage(null);
    const result = await checkLandlordNumber(normalizedPhone);
    setChecking(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to validate phone number." });
      return;
    }

    setLookup({
      checked: true,
      phoneLast10:       result.data.phoneLast10,
      ownershipConflict: result.data.ownershipConflict,
      landlordExists:    result.data.landlordExists,
      landlord:          result.data.landlord,
    });

    if (result.data.landlordExists && result.data.ownershipConflict) {
      setMessage({ type: "error", text: "Ownership conflict — see details below." });
      return;
    }

    setMessage(
      result.data.landlordExists
        ? { type: "success", text: "Existing landlord found — fill in property details below." }
        : { type: "success", text: "No landlord found — fill in landlord details, then property details." },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!lookup.checked) {
      setMessage({ type: "error", text: "Please look up the landlord phone number first." });
      return;
    }
    if (lookup.ownershipConflict) {
      setMessage({ type: "error", text: "Cannot create property — landlord is assigned to another agent." });
      return;
    }
    if (!lookup.landlordExists && !landlordName.trim()) {
      setMessage({ type: "error", text: "Landlord full name is required for new landlords." });
      return;
    }

    setSaving(true);
    const result = await createPropertyIntake({
      landlord: {
        phone:    landlordPhone.trim(),
        fullName: landlordName.trim()  || undefined,
        email:    landlordEmail.trim() || undefined,
        notes:    landlordNotes.trim() || undefined,
      },
      property: {
        propertyRef:          propertyRef.trim()    || undefined,
        addressLine1:         addressLine1.trim()   || undefined,
        addressLine2:         addressLine2.trim()   || undefined,
        city:                 city.trim()           || undefined,
        postcode:             postcode.trim()       || undefined,
        county:               county.trim()         || undefined,
        propertyType:         propertyType          || undefined,
        beds:                 beds    !== "" ? Number(beds)    : undefined,
        baths:                baths   !== "" ? Number(baths)   : undefined,
        landlordDemand:        landlordDemand !== "" ? landlordDemand : undefined,
        expectedCommissionPct: commissionPct  !== "" ? commissionPct  : undefined,
        status,
      },
    });
    setSaving(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create property." });
      return;
    }

    router.push(`/landlords/${result.data.landlord.id}/properties`);
  }

  const showPropertySection = lookup.checked && !lookup.ownershipConflict;

  return (
    <div className="stack">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Property</h1>
          <p className="page-subtitle">
            Enter the landlord&apos;s phone number first — existing landlords are matched automatically.
            New landlords are registered on first entry and assigned to you.
          </p>
        </div>
        <UIButton variant="secondary" onClick={() => router.push("/landlords")}>
          ← Back to Landlords
        </UIButton>
      </header>

      <UICard style={{ maxWidth: 920 }}>
        <UICardBody>
          <form className="field-grid" onSubmit={handleSubmit}>

            {/* ── Step 1: Landlord Phone Lookup ─────────────────────── */}
            <div className="form-section-divider">
              <span className="form-section-label">Step 1 — Landlord</span>
            </div>

            <label className="field">
              <span className="label">Landlord Phone Number</span>
              <div className="inline-row">
                <UIInput
                  style={{ flex: 1 }}
                  value={landlordPhone}
                  onChange={(e) => {
                    setLandlordPhone(e.target.value);
                    setLookup({ checked: false });
                    setMessage(null);
                  }}
                  onBlur={() => void runPhoneLookup()}
                  placeholder="+44 7911 122 233 or 07911122233"
                  disabled={saving}
                />
                <UIButton
                  type="button"
                  variant="secondary"
                  onClick={() => void runPhoneLookup()}
                  disabled={checking || saving || !normalizedPhone}
                >
                  {checking ? "Checking…" : "Look Up"}
                </UIButton>
              </div>
              <span className="hint-text">
                Enter the landlord&apos;s UK mobile or landline. We&apos;ll check if they already exist.
              </span>
            </label>

            {/* Existing landlord found ✓ */}
            {lookup.checked && lookup.landlordExists && !lookup.ownershipConflict && (
              <div className="landlord-found-card">
                <div className="landlord-found-badge">✓</div>
                <div>
                  <p className="landlord-found-name">{lookup.landlord?.landlordName}</p>
                  <p className="landlord-found-meta">
                    Existing landlord matched ·{" "}
                    {lookup.landlord?._count.properties ?? 0}{" "}
                    {(lookup.landlord?._count.properties ?? 0) === 1 ? "property" : "properties"} ·
                    New property will be added under this landlord.
                  </p>
                </div>
              </div>
            )}

            {/* Ownership conflict ✗ */}
            {lookup.checked && lookup.ownershipConflict && (
              <div className="ownership-conflict-card">
                <div className="ownership-conflict-badge">✗</div>
                <div>
                  <p className="ownership-conflict-title">Landlord Assigned to Another Agent</p>
                  <p className="ownership-conflict-meta">
                    {lookup.landlord?.landlordName
                      ? `"${lookup.landlord.landlordName}" is `
                      : "This landlord is "}
                    currently managed by{" "}
                    <strong style={{ color: "var(--text)" }}>
                      {lookup.landlord?.ownerAgent?.agentDisplayName ?? "another agent"}
                    </strong>.
                    {" "}Contact an admin to reassign ownership if needed.
                  </p>
                </div>
              </div>
            )}

            {/* New landlord — fill in details */}
            {lookup.checked && !lookup.ownershipConflict && !lookup.landlordExists && (
              <>
                <div className="form-section-divider">
                  <span className="form-section-label">New Landlord Details</span>
                </div>
                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">
                      Full Name <span style={{ color: "var(--danger)" }}>*</span>
                    </span>
                    <UIInput
                      value={landlordName}
                      onChange={(e) => setLandlordName(e.target.value)}
                      placeholder="John Smith"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Email Address (optional)</span>
                    <UIInput
                      type="email"
                      value={landlordEmail}
                      onChange={(e) => setLandlordEmail(e.target.value)}
                      placeholder="john@example.com"
                      disabled={saving}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="label">Notes (optional)</span>
                  <UIInput
                    value={landlordNotes}
                    onChange={(e) => setLandlordNotes(e.target.value)}
                    placeholder="Any notes about this landlord…"
                    disabled={saving}
                  />
                </label>
              </>
            )}

            {/* ── Step 2: Property Details (shown after successful lookup) ── */}
            {showPropertySection && (
              <>
                <div className="form-section-divider">
                  <span className="form-section-label">Step 2 — Property Details</span>
                </div>

                {/* Address */}
                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Address Line 1</span>
                    <UIInput
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="123 High Street"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Address Line 2 (optional)</span>
                    <UIInput
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Flat 4B"
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">City / Town</span>
                    <UIInput
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="London"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Postcode</span>
                    <UIInput
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="SW1A 1AA"
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">County (optional)</span>
                    <UIInput
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      placeholder="Greater London"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Property Type</span>
                    <UISelect
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Select type…</option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </UISelect>
                  </label>
                </div>

                {/* Beds / Baths */}
                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Bedrooms</span>
                    <UIInput
                      type="number"
                      value={beds}
                      onChange={(e) => setBeds(e.target.value)}
                      min={0}
                      max={20}
                      placeholder="e.g. 3"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Bathrooms</span>
                    <UIInput
                      type="number"
                      value={baths}
                      onChange={(e) => setBaths(e.target.value)}
                      min={0}
                      max={10}
                      placeholder="e.g. 2"
                      disabled={saving}
                    />
                  </label>
                </div>

                {/* Financial */}
                <div className="form-section-divider">
                  <span className="form-section-label">Financial</span>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Landlord Demand (£ / month)</span>
                    <UIInput
                      type="number"
                      value={landlordDemand}
                      onChange={(e) => setLandlordDemand(e.target.value)}
                      min={0}
                      step="0.01"
                      placeholder="e.g. 1200"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Expected Commission (%)</span>
                    <UIInput
                      type="number"
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      min={0}
                      max={100}
                      step="0.1"
                      placeholder="e.g. 10"
                      disabled={saving}
                    />
                  </label>
                </div>

                {/* Reference & Status */}
                <div className="form-section-divider">
                  <span className="form-section-label">Reference &amp; Status</span>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Property Reference (optional)</span>
                    <UIInput
                      value={propertyRef}
                      onChange={(e) => setPropertyRef(e.target.value)}
                      placeholder="Auto-generated if left blank"
                      disabled={saving}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Initial Status</span>
                    <UISelect
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} — {o.desc}
                        </option>
                      ))}
                    </UISelect>
                  </label>
                </div>
              </>
            )}

            {/* Message */}
            {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

            {/* Actions */}
            <div className="inline-row" style={{ marginTop: "0.25rem" }}>
              <UIButton
                type="submit"
                disabled={!canSubmit || saving || checking}
              >
                {saving ? "Creating Property…" : "Create Property"}
              </UIButton>
              <UIButton
                type="button"
                variant="secondary"
                onClick={() => router.push("/landlords")}
                disabled={saving}
              >
                Cancel
              </UIButton>
            </div>

          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
