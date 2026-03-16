"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import {
  fetchLandlordsForDropdown,
  createLandlord,
  checkLandlordNumber,
  createPropertyIntake,
  type PropertyStatus,
  type VacancyType,
  type LandlordRow,
} from "@/lib/portal-api";

type RoomDraft = { roomName: string; landlordDemand: string; expectedCommissionPct: string };

const ROOM_TYPES = ["Studio Room", "Single Room", "Double Room", "Ensuite Room", "Loft"] as const;
const PRIVATE_PROPERTY_TYPES = ["House", "Studio Flat", "Flat"] as const;

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft (saved, not listed)" },
  { value: "AVAILABLE", label: "Available (active listing)" },
];

function createEmptyRoom(): RoomDraft {
  return { roomName: ROOM_TYPES[0], landlordDemand: "", expectedCommissionPct: "" };
}

export default function AddPropertyPage() {
  const router = useRouter();

  // Landlord selection
  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [selectedLandlordId, setSelectedLandlordId] = useState("");
  const [showNewLandlordForm, setShowNewLandlordForm] = useState(false);

  // New landlord inline form
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [phoneConflict, setPhoneConflict] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [creatingLandlord, setCreatingLandlord] = useState(false);

  // Property fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [county, setCounty] = useState("");
  const [privatePropertyType, setPrivatePropertyType] = useState<"House" | "Studio Flat" | "Flat" | "">("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [landlordDemand, setLandlordDemand] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [commissionAmt, setCommissionAmt] = useState("");
  const [commissionType, setCommissionType] = useState<"pct" | "amt">("pct");
  const [propertyRef, setPropertyRef] = useState("");
  const [status, setStatus] = useState<PropertyStatus>("DRAFT");
  const [vacancyType, setVacancyType] = useState<VacancyType>("SINGLE");
  const [rooms, setRooms] = useState<RoomDraft[]>([createEmptyRoom()]);
  const [totalRooms, setTotalRooms] = useState("");
  const [availableRooms, setAvailableRooms] = useState("");
  const [rentPerMonth, setRentPerMonth] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isFurnished, setIsFurnished] = useState<"true" | "false">("true");
  const [personsAllowed, setPersonsAllowed] = useState("");
  const [petsAllowed, setPetsAllowed] = useState<"true" | "false">("true");
  const [dssAllowed, setDssAllowed] = useState<"true" | "false">("true");
  const [childrenAllowed, setChildrenAllowed] = useState<"true" | "false">("true");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [livingLandlord, setLivingLandlord] = useState<"true" | "false">("false");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Load existing landlords on mount
  useEffect(() => {
    void fetchLandlordsForDropdown().then((r) => {
      if (r.ok) setLandlords(r.data.landlords);
    });
  }, []);

  const canSubmit = useMemo(() => {
    if (!selectedLandlordId) return false;
    if (!addressLine1.trim()) return false;
    if (vacancyType === "MULTIPLE" && rooms.every((r) => !r.roomName.trim())) return false;
    return true;
  }, [selectedLandlordId, addressLine1, vacancyType, rooms]);

  function updateRoom(index: number, key: keyof RoomDraft, value: string) {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function checkNewPhone() {
    if (!newPhone.trim()) return;
    setChecking(true);
    setPhoneConflict(null);
    setPhoneChecked(false);
    const result = await checkLandlordNumber(newPhone.trim());
    setChecking(false);
    if (!result.ok) {
      setPhoneConflict(result.message ?? "Invalid phone number.");
      return;
    }
    if (result.data.landlordExists) {
      setPhoneConflict(
        `Already registered: ${result.data.landlord?.landlordName ?? "existing landlord"}. Select them from the dropdown instead.`,
      );
      return;
    }
    setPhoneChecked(true);
  }

  async function createInlineLandlord() {
    if (!phoneChecked || phoneConflict || !newName.trim()) return;
    setCreatingLandlord(true);
    const result = await createLandlord({
      fullName: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    setCreatingLandlord(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create landlord." });
      return;
    }
    // Add new landlord to list and select them
    const created = result.data.landlord;
    setLandlords((prev) => [created, ...prev]);
    setSelectedLandlordId(created.id);
    setShowNewLandlordForm(false);
    setNewPhone(""); setNewName(""); setNewEmail(""); setNewNotes("");
    setPhoneChecked(false); setPhoneConflict(null);
    setMessage({ type: "success", text: `Landlord "${created.landlordName}" created and selected.` });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const selectedLandlord = landlords.find((l) => l.id === selectedLandlordId);
    if (!selectedLandlord) {
      setMessage({ type: "error", text: "Please select a landlord." });
      return;
    }

    const roomRows =
      vacancyType === "MULTIPLE"
        ? rooms.filter((r) => r.roomName.trim()).map((r) => ({
            roomName: r.roomName.trim(),
            landlordDemand: r.landlordDemand !== "" ? Number(r.landlordDemand) : undefined,
            expectedCommissionPct: r.expectedCommissionPct !== "" ? Number(r.expectedCommissionPct) : undefined,
          }))
        : [];

    if (vacancyType === "MULTIPLE" && roomRows.length === 0) {
      setMessage({ type: "error", text: "Add at least one room for shared properties." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const resolvedPropertyType = vacancyType === "SINGLE" ? privatePropertyType || undefined : undefined;
    const resolvedBeds = vacancyType === "SINGLE" && privatePropertyType === "Flat" && numberOfRooms ? Number(numberOfRooms) : undefined;

    const result = await createPropertyIntake({
      landlord: { phone: selectedLandlord.phoneLast10 },
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
        landlordDemand: vacancyType === "SINGLE" && landlordDemand ? Number(landlordDemand) : undefined,
        expectedCommissionPct: vacancyType === "SINGLE" && commissionType === "pct" && commissionPct ? Number(commissionPct) : undefined,
        expectedCommissionAmt: vacancyType === "SINGLE" && commissionType === "amt" && commissionAmt ? Number(commissionAmt) : undefined,
        totalRooms: totalRooms ? Number(totalRooms) : null,
        availableRooms: availableRooms ? Number(availableRooms) : null,
        rentPerMonth: rentPerMonth ? Number(rentPerMonth) : null,
        depositAmount: depositAmount ? Number(depositAmount) : null,
        isFurnished: isFurnished === "true",
        personsAllowed: personsAllowed ? Number(personsAllowed) : null,
        petsAllowed: petsAllowed === "true",
        dssAllowed: dssAllowed === "true",
        childrenAllowed: childrenAllowed === "true",
        availabilityDate: availabilityDate ? new Date(availabilityDate).toISOString() : null,
        livingLandlord: livingLandlord === "true",
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

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Property</h1>
          <p className="page-subtitle">Select an existing landlord or add a new one, then fill in property details.</p>
        </div>
        <UIButton variant="secondary" onClick={() => router.push("/properties")}>
          Back to Properties
        </UIButton>
      </header>

      <UICard>
        <UICardBody>
          <form className="field-grid" onSubmit={handleSubmit}>
            {/* ── Step 1: Landlord ── */}
            <div className="form-section-divider">
              <span className="form-section-label">Step 1 — Landlord</span>
            </div>

            <label className="field">
              <span className="label">Select Existing Landlord <span style={{ color: "var(--danger)" }}>*</span></span>
              <div className="inline-row">
                <UISelect
                  style={{ flex: 1 }}
                  value={selectedLandlordId}
                  onChange={(e) => { setSelectedLandlordId(e.target.value); setShowNewLandlordForm(false); setMessage(null); }}
                  disabled={saving}
                >
                  <option value="">— Choose a landlord —</option>
                  {landlords.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.landlordName} ({l.phoneLast10}){l.isPassive ? " [Passive]" : ""}
                    </option>
                  ))}
                </UISelect>
                <UIButton
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowNewLandlordForm((v) => !v); setSelectedLandlordId(""); setMessage(null); }}
                  disabled={saving}
                >
                  {showNewLandlordForm ? "Cancel" : "+ Add New"}
                </UIButton>
              </div>
            </label>

            {/* Inline add new landlord */}
            {showNewLandlordForm && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1rem" }}>
                <p className="section-label" style={{ marginBottom: "0.75rem" }}>New Landlord Details</p>
                <div className="field-grid">
                  <label className="field">
                    <span className="label">Phone Number <span style={{ color: "var(--danger)" }}>*</span></span>
                    <div className="inline-row">
                      <UIInput
                        style={{ flex: 1 }}
                        value={newPhone}
                        onChange={(e) => { setNewPhone(e.target.value); setPhoneChecked(false); setPhoneConflict(null); }}
                        onBlur={() => void checkNewPhone()}
                        placeholder="07911 122233"
                        disabled={creatingLandlord}
                      />
                      <UIButton type="button" variant="secondary" onClick={() => void checkNewPhone()} disabled={checking || creatingLandlord || !newPhone.trim()}>
                        {checking ? "..." : "Check"}
                      </UIButton>
                    </div>
                  </label>
                  {phoneConflict && <UIAlert type="error">{phoneConflict}</UIAlert>}
                  {phoneChecked && !phoneConflict && (
                    <div className="field-grid-2">
                      <label className="field">
                        <span className="label">Full Name <span style={{ color: "var(--danger)" }}>*</span></span>
                        <UIInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Smith" disabled={creatingLandlord} />
                      </label>
                      <label className="field">
                        <span className="label">Email (optional)</span>
                        <UIInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" disabled={creatingLandlord} />
                      </label>
                    </div>
                  )}
                  {phoneChecked && !phoneConflict && (
                    <>
                      <label className="field">
                        <span className="label">Notes (optional)</span>
                        <UIInput value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="..." disabled={creatingLandlord} />
                      </label>
                      <div className="inline-row">
                        <UIButton type="button" onClick={() => void createInlineLandlord()} disabled={creatingLandlord || !newName.trim()}>
                          {creatingLandlord ? "Creating..." : "Create & Select Landlord"}
                        </UIButton>
                        <UIButton type="button" variant="secondary" onClick={() => setShowNewLandlordForm(false)} disabled={creatingLandlord}>Cancel</UIButton>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedLandlordId && !showNewLandlordForm && (
              <>
                {/* ── Step 2: Property Details ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Step 2 — Property Details</span>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Address Line 1 <span style={{ color: "var(--danger)" }}>*</span></span>
                    <UIInput value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 High Street" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Address Line 2 (optional)</span>
                    <UIInput value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Flat 4B" disabled={saving} />
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

                <label className="field" style={{ maxWidth: "280px" }}>
                  <span className="label">County (optional)</span>
                  <UIInput value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Greater London" disabled={saving} />
                </label>

                <div className="form-section-divider">
                  <span className="form-section-label">Occupancy Details</span>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Total Rooms</span>
                    <UIInput type="number" min={0} step="1" value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} placeholder="e.g. 4" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Available Rooms</span>
                    <UIInput type="number" min={0} step="1" value={availableRooms} onChange={(e) => setAvailableRooms(e.target.value)} placeholder="e.g. 2" disabled={saving} />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Rent / Month (£)</span>
                    <UIInput type="number" min={0} step="0.01" value={rentPerMonth} onChange={(e) => setRentPerMonth(e.target.value)} placeholder="e.g. 1200" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Deposit (£)</span>
                    <UIInput type="number" min={0} step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 1500" disabled={saving} />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Furnished</span>
                    <UISelect value={isFurnished} onChange={(e) => setIsFurnished(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Persons Allowed</span>
                    <UIInput type="number" min={1} step="1" value={personsAllowed} onChange={(e) => setPersonsAllowed(e.target.value)} placeholder="e.g. 3" disabled={saving} />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Pets Allowed</span>
                    <UISelect value={petsAllowed} onChange={(e) => setPetsAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option><option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">DSS Allowed</span>
                    <UISelect value={dssAllowed} onChange={(e) => setDssAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option><option value="false">No</option>
                    </UISelect>
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Children Allowed</span>
                    <UISelect value={childrenAllowed} onChange={(e) => setChildrenAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option><option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Living Landlord</span>
                    <UISelect value={livingLandlord} onChange={(e) => setLivingLandlord(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="false">No</option><option value="true">Yes</option>
                    </UISelect>
                  </label>
                </div>

                <label className="field" style={{ maxWidth: "280px" }}>
                  <span className="label">Availability Date</span>
                  <UIInput type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} disabled={saving} />
                </label>

                <div className="form-section-divider">
                  <span className="form-section-label">Property Type</span>
                </div>

                <div className="vacancy-toggle">
                  <label className={`vacancy-option${vacancyType === "SINGLE" ? " is-active" : ""}`}>
                    <input type="checkbox" checked={vacancyType === "SINGLE"} onChange={() => setVacancyType("SINGLE")} disabled={saving} />
                    <span className="vacancy-option-title">Private Property</span>
                    <span className="vacancy-option-sub">Single landlord demand and commission.</span>
                  </label>
                  <label className={`vacancy-option${vacancyType === "MULTIPLE" ? " is-active" : ""}`}>
                    <input type="checkbox" checked={vacancyType === "MULTIPLE"} onChange={() => setVacancyType("MULTIPLE")} disabled={saving} />
                    <span className="vacancy-option-title">Shared Property</span>
                    <span className="vacancy-option-sub">Multiple rooms managed separately.</span>
                  </label>
                </div>

                <div className="form-section-divider">
                  <span className="form-section-label">Financial</span>
                </div>

                {vacancyType === "SINGLE" ? (
                  <>
                    <div className="field-grid-2">
                      <label className="field">
                        <span className="label">Landlord Demand (£/mo)</span>
                        <UIInput type="number" value={landlordDemand} onChange={(e) => setLandlordDemand(e.target.value)} min={0} step="0.01" placeholder="e.g. 1200" disabled={saving} />
                      </label>
                      <label className="field">
                        <span className="label">
                          Expected Commission
                          <span style={{ display: "inline-flex", gap: "0.25rem", marginLeft: "0.5rem" }}>
                            {(["pct", "amt"] as const).map((t) => (
                              <button key={t} type="button" onClick={() => setCommissionType(t)} disabled={saving}
                                style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.1rem 0.4rem", border: "1px solid var(--border)", borderRadius: "0.25rem",
                                  background: commissionType === t ? "var(--brand-gold)" : "transparent",
                                  color: commissionType === t ? "#000" : "var(--text-muted)", cursor: "pointer" }}>
                                {t === "pct" ? "%" : "£"}
                              </button>
                            ))}
                          </span>
                        </span>
                        {commissionType === "pct"
                          ? <UIInput type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} min={0} max={9999} step="0.1" placeholder="e.g. 10" disabled={saving} />
                          : <UIInput type="number" value={commissionAmt} onChange={(e) => setCommissionAmt(e.target.value)} min={0} step="0.01" placeholder="e.g. 500" disabled={saving} />}
                      </label>
                    </div>

                    <div className="form-section-divider">
                      <span className="form-section-label">Property Category</span>
                    </div>
                    <div className="vacancy-toggle">
                      {PRIVATE_PROPERTY_TYPES.map((type) => (
                        <label key={type} className={`vacancy-option${privatePropertyType === type ? " is-active" : ""}`}>
                          <input type="radio" name="ppt" checked={privatePropertyType === type}
                            onChange={() => { setPrivatePropertyType(type); if (type !== "Flat") setNumberOfRooms(""); }} disabled={saving} />
                          <span className="vacancy-option-title">{type}</span>
                        </label>
                      ))}
                    </div>
                    {privatePropertyType === "Flat" && (
                      <label className="field" style={{ maxWidth: 280 }}>
                        <span className="label">Number of Rooms</span>
                        <UIInput type="number" value={numberOfRooms} onChange={(e) => setNumberOfRooms(e.target.value)} min={1} max={50} placeholder="e.g. 3" disabled={saving} />
                      </label>
                    )}
                  </>
                ) : (
                  <div className="room-editor">
                    <div className="table-wrap room-editor-wrap">
                      <table className="room-editor-table">
                        <thead>
                          <tr><th>Room Type</th><th>Demand (£)</th><th>Commission (%)</th><th /></tr>
                        </thead>
                        <tbody>
                          {rooms.map((room, i) => (
                            <tr key={i}>
                              <td>
                                <UISelect value={room.roomName} onChange={(e) => updateRoom(i, "roomName", e.target.value)} disabled={saving}>
                                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </UISelect>
                              </td>
                              <td>
                                <UIInput type="number" min={0} step="0.01" value={room.landlordDemand} onChange={(e) => updateRoom(i, "landlordDemand", e.target.value)} placeholder="Optional" disabled={saving} />
                              </td>
                              <td>
                                <UIInput type="number" min={0} step="0.1" value={room.expectedCommissionPct} onChange={(e) => updateRoom(i, "expectedCommissionPct", e.target.value)} placeholder="Optional" disabled={saving} />
                              </td>
                              <td>
                                <UIButton type="button" variant="secondary" onClick={() => setRooms((p) => p.filter((_, j) => j !== i))} disabled={saving || rooms.length <= 1}>Remove</UIButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <UIButton type="button" variant="secondary" onClick={() => setRooms((p) => [...p, createEmptyRoom()])} disabled={saving}>
                      Add Room Row
                    </UIButton>
                  </div>
                )}

                <div className="form-section-divider">
                  <span className="form-section-label">Reference &amp; Status</span>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Property Reference (optional)</span>
                    <UIInput value={propertyRef} onChange={(e) => setPropertyRef(e.target.value)} placeholder="Auto-generated if blank" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Initial Status</span>
                    <UISelect value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus)} disabled={saving}>
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </UISelect>
                  </label>
                </div>
              </>
            )}

            {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

            <div className="inline-row" style={{ marginTop: "0.25rem" }}>
              <UIButton type="submit" disabled={!canSubmit || saving}>
                {saving ? "Creating..." : "Create Property"}
              </UIButton>
              <UIButton type="button" variant="secondary" onClick={() => router.push("/properties")} disabled={saving}>Cancel</UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>
    </div>
  );
}
