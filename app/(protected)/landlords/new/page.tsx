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

export default function NewLandlordPage() {
  const router = useRouter();
  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [landlordEmail, setLandlordEmail] = useState("");
  const [landlordNotes, setLandlordNotes] = useState("");

  const [propertyRef, setPropertyRef] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [landlordDemand, setLandlordDemand] = useState("");
  const [status, setStatus] = useState<PropertyStatus>("DRAFT");

  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ checked: false });
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const normalizedPhoneInput = useMemo(() => landlordPhone.trim(), [landlordPhone]);

  const canSubmit = useMemo(() => {
    if (!lookup.checked) return false;
    if (lookup.ownershipConflict) return false;
    if (lookup.landlordExists) return true;
    return Boolean(landlordName.trim());
  }, [landlordName, lookup]);

  async function runPhoneLookup() {
    if (!normalizedPhoneInput) {
      setLookup({ checked: false });
      return;
    }

    setChecking(true);
    setMessage(null);
    const result = await checkLandlordNumber(normalizedPhoneInput);
    setChecking(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to validate phone." });
      return;
    }

    setLookup({
      checked: true,
      phoneLast10: result.data.phoneLast10,
      ownershipConflict: result.data.ownershipConflict,
      landlordExists: result.data.landlordExists,
      landlord: result.data.landlord,
    });

    if (result.data.landlordExists && result.data.ownershipConflict) {
      setMessage({
        type: "error",
        text: "This landlord is assigned to another agent. Ask admin to reassign ownership.",
      });
      return;
    }

    if (result.data.landlordExists) {
      setMessage({
        type: "success",
        text: "Existing landlord found. You can add a property under this landlord.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "No landlord found for this phone. Fill landlord details and continue.",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!lookup.checked) {
      setMessage({ type: "error", text: "Run phone lookup first." });
      return;
    }

    if (lookup.ownershipConflict) {
      setMessage({
        type: "error",
        text: "This landlord is assigned to another agent. Request admin reassignment.",
      });
      return;
    }

    if (!lookup.landlordExists && !landlordName.trim()) {
      setMessage({
        type: "error",
        text: "Landlord name is required when creating a new landlord.",
      });
      return;
    }

    setSaving(true);
    const result = await createPropertyIntake({
      landlord: {
        phone: landlordPhone.trim(),
        fullName: landlordName.trim() || undefined,
        email: landlordEmail.trim() || undefined,
        notes: landlordNotes.trim() || undefined,
      },
      property: {
        propertyRef: propertyRef.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        postcode: postcode.trim() || undefined,
        landlordDemand: landlordDemand.trim() || undefined,
        status,
      },
    });
    setSaving(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create property flow." });
      return;
    }

    setMessage({
      type: "success",
      text: result.data.landlordCreated
        ? "Landlord and property created."
        : "Property created under existing landlord.",
    });
    router.push(`/landlords/${result.data.landlord.id}/properties`);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Property</h1>
          <p className="page-subtitle">
            Phone-first flow: lookup landlord, then create property with ownership enforcement.
          </p>
        </div>
      </header>

      <UICard style={{ maxWidth: 860 }}>
        <UICardBody>
          <form className="field-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">Landlord Phone</span>
              <div className="inline-row">
                <UIInput
                  style={{ flex: 1 }}
                  value={landlordPhone}
                  onChange={(event) => {
                    setLandlordPhone(event.target.value);
                    setLookup({ checked: false });
                  }}
                  placeholder="+44 7911 122233"
                  onBlur={() => {
                    void runPhoneLookup();
                  }}
                />
                <UIButton type="button" variant="secondary" onClick={() => void runPhoneLookup()} disabled={checking}>
                  {checking ? "Checking..." : "Lookup"}
                </UIButton>
              </div>
            </label>

            {lookup.checked ? (
              <UIAlert type={lookup.ownershipConflict ? "error" : "success"}>
                Normalized phone key: <strong>{lookup.phoneLast10}</strong>.{" "}
                {lookup.landlordExists
                  ? `Landlord found (${lookup.landlord?.landlordName ?? "Unknown"}).`
                  : "No landlord found; a new landlord will be created."}
              </UIAlert>
            ) : null}

            {!lookup.checked || !lookup.landlordExists ? (
              <>
                <label className="field">
                  <span className="label">Landlord Name</span>
                  <UIInput value={landlordName} onChange={(event) => setLandlordName(event.target.value)} />
                </label>
                <label className="field">
                  <span className="label">Landlord Email (optional)</span>
                  <UIInput
                    type="email"
                    value={landlordEmail}
                    onChange={(event) => setLandlordEmail(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">Landlord Notes (optional)</span>
                  <UIInput value={landlordNotes} onChange={(event) => setLandlordNotes(event.target.value)} />
                </label>
              </>
            ) : null}

            <label className="field">
              <span className="label">Property Reference (optional)</span>
              <UIInput
                value={propertyRef}
                onChange={(event) => setPropertyRef(event.target.value)}
                placeholder="Auto-generated if empty"
              />
            </label>
            <label className="field">
              <span className="label">Address Line 1</span>
              <UIInput value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">City</span>
              <UIInput value={city} onChange={(event) => setCity(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Postcode</span>
              <UIInput value={postcode} onChange={(event) => setPostcode(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Landlord Demand</span>
              <UIInput
                type="number"
                value={landlordDemand}
                onChange={(event) => setLandlordDemand(event.target.value)}
                min={0}
                step="0.01"
              />
            </label>
            <label className="field">
              <span className="label">Property Status</span>
              <UISelect value={status} onChange={(event) => setStatus(event.target.value as PropertyStatus)}>
                <option value="DRAFT">DRAFT</option>
                <option value="LIVE">LIVE</option>
                <option value="UNDER_OFFER">UNDER_OFFER</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
              </UISelect>
            </label>

            {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

            <div className="inline-row">
              <UIButton type="submit" disabled={!canSubmit || saving || checking}>
                {saving ? "Saving..." : "Create Property"}
              </UIButton>
              <UIButton type="button" variant="secondary" onClick={() => router.push("/landlords")} disabled={saving}>
                Cancel
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
