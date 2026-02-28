"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import {
  createPropertyIntake,
  checkLandlordNumber,
  type PropertyStatus,
  type VacancyType,
} from "@/lib/portal-api";

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

type RoomDraft = {
  roomName: string;
  landlordDemand: string;
  expectedCommissionPct: string;
};

const ROOM_TYPES = [
  "Studio Room",
  "Single Room",
  "Double Room",
  "Ensuite Room",
  "Loft",
] as const;

const PRIVATE_PROPERTY_TYPES = ["House", "Studio Flat", "Flat"] as const;

const STATUS_OPTIONS: { value: PropertyStatus; label: string; desc: string }[] = [
  { value: "DRAFT", label: "Draft", desc: "Saved but not yet available" },
  { value: "AVAILABLE", label: "Available", desc: "Active and available for rent" },
];

function createEmptyRoom(_index: number): RoomDraft {
  return {
    roomName: ROOM_TYPES[0],
    landlordDemand: "",
    expectedCommissionPct: "",
  };
}

export default function AddPropertyPage() {
  const router = useRouter();

  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [landlordEmail, setLandlordEmail] = useState("");
  const [landlordNotes, setLandlordNotes] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [county, setCounty] = useState("");
  const [privatePropertyType, setPrivatePropertyType] = useState<"House" | "Studio Flat" | "Flat" | "">("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [landlordDemand, setLandlordDemand] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [propertyRef, setPropertyRef] = useState("");
  const [status, setStatus] = useState<PropertyStatus>("DRAFT");
  const [vacancyType, setVacancyType] = useState<VacancyType>("SINGLE");
  const [rooms, setRooms] = useState<RoomDraft[]>([createEmptyRoom(0)]);

  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ checked: false });
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const normalizedPhone = useMemo(() => landlordPhone.trim(), [landlordPhone]);

  const canSubmit = useMemo(() => {
    if (!lookup.checked || lookup.ownershipConflict) return false;
    if (!lookup.landlordExists && !landlordName.trim()) return false;
    if (vacancyType === "MULTIPLE" && rooms.every((room) => !room.roomName.trim())) return false;
    return true;
  }, [landlordName, lookup, rooms, vacancyType]);

  function updateRoom(index: number, key: keyof RoomDraft, value: string) {
    setRooms((prev) => prev.map((room, i) => (i === index ? { ...room, [key]: value } : room)));
  }

  function addRoom() {
    setRooms((prev) => [...prev, createEmptyRoom(prev.length)]);
  }

  function removeRoom(index: number) {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  }

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
      phoneLast10: result.data.phoneLast10,
      ownershipConflict: result.data.ownershipConflict,
      landlordExists: result.data.landlordExists,
      landlord: result.data.landlord,
    });

    if (result.data.landlordExists && result.data.ownershipConflict) {
      setMessage({ type: "error", text: "Ownership conflict - see details below." });
      return;
    }

    setMessage(
      result.data.landlordExists
        ? { type: "success", text: "Existing landlord found - fill in property details below." }
        : { type: "success", text: "No landlord found - fill in landlord details, then property details." },
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
      setMessage({ type: "error", text: "Cannot create property - landlord is assigned to another agent." });
      return;
    }
    if (!lookup.landlordExists && !landlordName.trim()) {
      setMessage({ type: "error", text: "Landlord full name is required for new landlords." });
      return;
    }

    const roomRows =
      vacancyType === "MULTIPLE"
        ? rooms
            .filter((room) => room.roomName.trim().length > 0)
            .map((room) => ({
              roomName: room.roomName.trim(),
              landlordDemand: room.landlordDemand !== "" ? Number(room.landlordDemand) : undefined,
              expectedCommissionPct:
                room.expectedCommissionPct !== "" ? Number(room.expectedCommissionPct) : undefined,
            }))
        : [];

    if (vacancyType === "MULTIPLE" && roomRows.length === 0) {
      setMessage({ type: "error", text: "Add at least one room for shared properties." });
      return;
    }

    // Derive propertyType and beds from private property fields
    const resolvedPropertyType = vacancyType === "SINGLE" ? privatePropertyType || undefined : undefined;
    const resolvedBeds =
      vacancyType === "SINGLE" && privatePropertyType === "Flat" && numberOfRooms !== ""
        ? Number(numberOfRooms)
        : undefined;

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
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim() || undefined,
        postcode: postcode.trim() || undefined,
        county: county.trim() || undefined,
        propertyType: resolvedPropertyType,
        beds: resolvedBeds,
        vacancyType,
        landlordDemand: vacancyType === "SINGLE" && landlordDemand !== "" ? Number(landlordDemand) : undefined,
        expectedCommissionPct:
          vacancyType === "SINGLE" && commissionPct !== "" ? Number(commissionPct) : undefined,
        rooms: vacancyType === "MULTIPLE" ? roomRows : undefined,
        status,
      },
    });
    setSaving(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create property." });
      return;
    }

    router.push("/properties");
  }

  const showPropertySection = lookup.checked && !lookup.ownershipConflict;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Property</h1>
          <p className="page-subtitle">
            Enter landlord phone first. Existing landlords are matched automatically.
            New landlords are registered on first entry and assigned to you.
          </p>
        </div>
        <UIButton variant="secondary" onClick={() => router.push("/properties")}>
          Back to Properties
        </UIButton>
      </header>

      <UICard style={{ maxWidth: 980 }}>
        <UICardBody>
          <form className="field-grid" onSubmit={handleSubmit}>
            <div className="form-section-divider">
              <span className="form-section-label">Step 1 - Landlord</span>
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
                  {checking ? "Checking..." : "Look Up"}
                </UIButton>
              </div>
              <span className="hint-text">
                Enter UK mobile or landline. We will check whether the landlord already exists.
              </span>
            </label>

            {lookup.checked && lookup.landlordExists && !lookup.ownershipConflict && (
              <div className="landlord-found-card">
                <div className="landlord-found-badge">OK</div>
                <div>
                  <p className="landlord-found-name">{lookup.landlord?.landlordName}</p>
                  <p className="landlord-found-meta">
                    Existing landlord matched - {lookup.landlord?._count.properties ?? 0}{" "}
                    {(lookup.landlord?._count.properties ?? 0) === 1 ? "property" : "properties"}.
                  </p>
                </div>
              </div>
            )}

            {lookup.checked && lookup.ownershipConflict && (
              <div className="ownership-conflict-card">
                <div className="ownership-conflict-badge">X</div>
                <div>
                  <p className="ownership-conflict-title">Landlord assigned to another agent</p>
                  <p className="ownership-conflict-meta">
                    {lookup.landlord?.landlordName
                      ? `"${lookup.landlord.landlordName}" is `
                      : "This landlord is "}
                    currently managed by{" "}
                    <strong style={{ color: "var(--text)" }}>
                      {lookup.landlord?.ownerAgent?.agentDisplayName ?? "another agent"}
                    </strong>
                    . Contact admin to reassign ownership if needed.
                  </p>
                </div>
              </div>
            )}

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
                    <span className="label">Email (optional)</span>
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
                    placeholder="Any notes about this landlord..."
                    disabled={saving}
                  />
                </label>
              </>
            )}

            {showPropertySection && (
              <>
                <div className="form-section-divider">
                  <span className="form-section-label">Step 2 - Property Details</span>
                </div>

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
                    <UIInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Postcode</span>
                    <UIInput value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="SW1A 1AA" disabled={saving} />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">County (optional)</span>
                    <UIInput value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Greater London" disabled={saving} />
                  </label>
                </div>

                <div className="form-section-divider">
                  <span className="form-section-label">Property Type</span>
                </div>

                <div className="vacancy-toggle">
                  <label className={`vacancy-option${vacancyType === "SINGLE" ? " is-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={vacancyType === "SINGLE"}
                      onChange={() => setVacancyType("SINGLE")}
                      disabled={saving}
                    />
                    <span className="vacancy-option-title">Private Property</span>
                    <span className="vacancy-option-sub">One property with a single landlord demand and commission.</span>
                  </label>
                  <label className={`vacancy-option${vacancyType === "MULTIPLE" ? " is-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={vacancyType === "MULTIPLE"}
                      onChange={() => setVacancyType("MULTIPLE")}
                      disabled={saving}
                    />
                    <span className="vacancy-option-title">Shared Property</span>
                    <span className="vacancy-option-sub">Multiple rooms managed separately with demand and commission per room.</span>
                  </label>
                </div>

                <div className="form-section-divider">
                  <span className="form-section-label">Financial</span>
                </div>

                {vacancyType === "SINGLE" ? (
                  <>
                    <div className="field-grid-2">
                      <label className="field">
                        <span className="label">Landlord Demand (GBP / month)</span>
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
                          max={9999}
                          step="0.1"
                          placeholder="e.g. 10"
                          disabled={saving}
                        />
                      </label>
                    </div>

                    <div className="form-section-divider">
                      <span className="form-section-label">Property Category</span>
                    </div>

                    <div className="vacancy-toggle">
                      {PRIVATE_PROPERTY_TYPES.map((type) => (
                        <label
                          key={type}
                          className={`vacancy-option${privatePropertyType === type ? " is-active" : ""}`}
                        >
                          <input
                            type="radio"
                            name="privatePropertyType"
                            checked={privatePropertyType === type}
                            onChange={() => {
                              setPrivatePropertyType(type);
                              if (type !== "Flat") setNumberOfRooms("");
                            }}
                            disabled={saving}
                          />
                          <span className="vacancy-option-title">{type}</span>
                        </label>
                      ))}
                    </div>

                    {privatePropertyType === "Flat" && (
                      <label className="field" style={{ maxWidth: 280 }}>
                        <span className="label">Number of Rooms</span>
                        <UIInput
                          type="number"
                          value={numberOfRooms}
                          onChange={(e) => setNumberOfRooms(e.target.value)}
                          min={1}
                          max={50}
                          placeholder="e.g. 3"
                          disabled={saving}
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <div className="room-editor">
                    <div className="table-wrap room-editor-wrap">
                      <table className="room-editor-table">
                        <thead>
                          <tr>
                            <th>Room Type</th>
                            <th>Landlord Demand (GBP)</th>
                            <th>Expected Commission (%)</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map((room, index) => (
                            <tr key={`room-${index}`}>
                              <td>
                                <UISelect
                                  value={room.roomName}
                                  onChange={(e) => updateRoom(index, "roomName", e.target.value)}
                                  disabled={saving}
                                >
                                  {ROOM_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </UISelect>
                              </td>
                              <td>
                                <UIInput
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={room.landlordDemand}
                                  onChange={(e) => updateRoom(index, "landlordDemand", e.target.value)}
                                  placeholder="Optional"
                                  disabled={saving}
                                />
                              </td>
                              <td>
                                <UIInput
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={room.expectedCommissionPct}
                                  onChange={(e) => updateRoom(index, "expectedCommissionPct", e.target.value)}
                                  placeholder="Optional"
                                  disabled={saving}
                                />
                              </td>
                              <td>
                                <UIButton
                                  type="button"
                                  variant="secondary"
                                  onClick={() => removeRoom(index)}
                                  disabled={saving || rooms.length <= 1}
                                >
                                  Remove
                                </UIButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="inline-row">
                      <UIButton type="button" variant="secondary" onClick={addRoom} disabled={saving}>
                        Add Room Row
                      </UIButton>
                      <span className="hint-text">Each room can be closed and sold independently later.</span>
                    </div>
                  </div>
                )}

                <div className="form-section-divider">
                  <span className="form-section-label">Reference and Status</span>
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
                    <UISelect value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus)} disabled={saving}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.desc}
                        </option>
                      ))}
                    </UISelect>
                  </label>
                </div>
              </>
            )}

            {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

            <div className="inline-row" style={{ marginTop: "0.25rem" }}>
              <UIButton type="submit" disabled={!canSubmit || saving || checking}>
                {saving ? "Creating Property..." : "Create Property"}
              </UIButton>
              <UIButton type="button" variant="secondary" onClick={() => router.push("/properties")} disabled={saving}>
                Cancel
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
