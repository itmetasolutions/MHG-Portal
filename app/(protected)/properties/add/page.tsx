"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ─── Types ─── */
type LandlordRow = { id: string; landlordName: string; landlordNumber: string; phoneLast10: string; isPassive: boolean; _count: { properties: number } };
type MediaAsset = { id: string; name: string; dataUrl: string };

const ROOM_TYPES = ["STUDIO_ROOM", "SINGLE_ROOM", "DOUBLE_ROOM", "ENSUITE_ROOM", "LOFT"] as const;
const ROOM_TYPE_LABELS: Record<string, string> = {
  STUDIO_ROOM: "Studio Room", SINGLE_ROOM: "Single Room", DOUBLE_ROOM: "Double Room",
  ENSUITE_ROOM: "Ensuite Room", LOFT: "Loft",
};
const BUILDING_CATS = ["HOUSE", "FLAT", "STUDIO_FLAT"] as const;
const BUILDING_LABELS: Record<string, string> = { HOUSE: "House", FLAT: "Flat", STUDIO_FLAT: "Studio Flat" };
const LIVING_ROOM_OPTS = ["PRIVATE", "SHARED", "NONE"] as const;

type RoomRow = {
  roomType: string; rentPerMonth: string; depositAmount: string; expectedCommissionAmt: string;
};

function calcWeekly(monthly: string): string {
  const m = parseFloat(monthly);
  if (!m || isNaN(m)) return "";
  return ((m * 12) / 52).toFixed(2);
}

function BoolField({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select className="input" value={value ? "true" : "false"} onChange={(e) => onChange(e.target.value === "true")} disabled={disabled}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

export default function AddPropertyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLandlordId = searchParams.get("landlordId") ?? "";

  /* ── Landlord state ── */
  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [landlordSearch, setLandlordSearch] = useState("");
  const [selectedLandlordId, setSelectedLandlordId] = useState(preselectedLandlordId);
  const [loadingLandlords, setLoadingLandlords] = useState(true);

  /* ── Property type ── */
  const [propType, setPropType] = useState<"PRIVATE" | "SHARED">("PRIVATE");
  const [buildingCategory, setBuildingCategory] = useState<string>("HOUSE");

  /* ── Core fields ── */
  const [description, setDescription] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postCode, setPostCode] = useState("");
  const [city, setCity] = useState("");
  const [noOfRooms, setNoOfRooms] = useState("");
  const [availableRooms, setAvailableRooms] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "AVAILABLE">("DRAFT");

  /* ── PRIVATE-only financials ── */
  const [rentPerMonth, setRentPerMonth] = useState("");
  const rentPerWeek = calcWeekly(rentPerMonth);
  const [depositAmount, setDepositAmount] = useState("");
  const [expectedCommissionAmt, setExpectedCommissionAmt] = useState("");

  /* ── Amenities ── */
  const [furnished, setFurnished] = useState(false);
  const [livingLandlord, setLivingLandlord] = useState(false);
  const [garden, setGarden] = useState(false);
  const [parking, setParking] = useState(false);
  const [billsIncluded, setBillsIncluded] = useState(false);
  const [balconyRoofTerrace, setBalconyRoofTerrace] = useState(false);
  const [disabledAccess, setDisabledAccess] = useState(false);
  const [livingRoom, setLivingRoom] = useState<string>("NONE");
  const [broadbandIncluded, setBroadbandIncluded] = useState(false);
  const [couplesAllowed, setCouplesAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [dssAllowed, setDssAllowed] = useState(false);
  const [childrenAllowed, setChildrenAllowed] = useState(false);

  /* ── Shared rooms ── */
  const [rooms, setRooms] = useState<RoomRow[]>([{ roomType: "SINGLE_ROOM", rentPerMonth: "", depositAmount: "", expectedCommissionAmt: "" }]);

  /* ── Media ── */
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{ id: string; altText: string }[]>([]);

  /* ── UI state ── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStudioFlat = propType === "PRIVATE" && buildingCategory === "STUDIO_FLAT";

  /* ── Load landlords ── */
  useEffect(() => {
    fetch("/api/properties/add-landlords")
      .then((r) => r.json())
      .then((d) => { setLandlords(d.landlords ?? []); setLoadingLandlords(false); })
      .catch(() => setLoadingLandlords(false));
  }, []);

  /* ── Load media ── */
  useEffect(() => {
    fetch("/api/media-library")
      .then((r) => r.json())
      .then((d) => setMediaAssets(d.assets ?? []))
      .catch(() => {});
  }, []);

  const filteredLandlords = useMemo(() => {
    const q = landlordSearch.trim().toLowerCase();
    if (!q) return landlords;
    return landlords.filter((l) =>
      l.landlordName.toLowerCase().includes(q) || l.phoneLast10.includes(q) || l.landlordNumber.includes(q)
    );
  }, [landlords, landlordSearch]);

  const selectedLandlord = landlords.find((l) => l.id === selectedLandlordId);

  function addRoom() {
    setRooms((prev) => [...prev, { roomType: "SINGLE_ROOM", rentPerMonth: "", depositAmount: "", expectedCommissionAmt: "" }]);
  }
  function removeRoom(i: number) {
    setRooms((prev) => prev.filter((_, j) => j !== i));
  }
  function updateRoom(i: number, key: keyof RoomRow, value: string) {
    setRooms((prev) => prev.map((r, j) => j === i ? { ...r, [key]: value } : r));
  }

  function toggleMedia(assetId: string) {
    setSelectedMedia((prev) => {
      const exists = prev.find((m) => m.id === assetId);
      if (exists) return prev.filter((m) => m.id !== assetId);
      return [...prev, { id: assetId, altText: "" }];
    });
  }
  function setAltText(assetId: string, text: string) {
    setSelectedMedia((prev) => prev.map((m) => m.id === assetId ? { ...m, altText: text } : m));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedLandlordId) { setError("Please select a landlord."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    if (!addressLine1.trim()) { setError("Address Line 1 is required."); return; }
    if (!postCode.trim()) { setError("Post code is required."); return; }
    if (!city.trim()) { setError("City is required."); return; }
    if (selectedMedia.length === 0) { setError("At least one photo is required."); return; }
    if (selectedMedia.some((m) => !m.altText.trim())) { setError("All photos require alt text."); return; }
    if (!availabilityDate) { setError("Availability date is required."); return; }

    if (propType === "PRIVATE") {
      if (!rentPerMonth) { setError("Rent per month is required."); return; }
      if (!depositAmount) { setError("Deposit amount is required."); return; }
      if (!expectedCommissionAmt) { setError("Expected commission is required."); return; }
    }

    if (propType === "SHARED") {
      if (rooms.length === 0) { setError("At least one room is required for shared properties."); return; }
      for (const r of rooms) {
        if (!r.rentPerMonth || !r.depositAmount || !r.expectedCommissionAmt) {
          setError("All room rows require rent, deposit, and commission."); return;
        }
      }
    }

    setSaving(true);
    try {
      const photos = selectedMedia.map((m, i) => ({ mediaAssetId: m.id, altText: m.altText, sortOrder: i }));
      const roomRows = propType === "SHARED"
        ? rooms.map((r) => ({
            roomType: r.roomType,
            roomName: ROOM_TYPE_LABELS[r.roomType] ?? r.roomType,
            rentPerMonth: parseFloat(r.rentPerMonth),
            rentPerWeek: parseFloat(calcWeekly(r.rentPerMonth) || "0"),
            depositAmount: parseFloat(r.depositAmount),
            expectedCommissionAmt: parseFloat(r.expectedCommissionAmt),
          }))
        : undefined;

      const payload = {
        landlordId: selectedLandlordId,
        property: {
          propType,
          buildingCategory: propType === "PRIVATE" ? buildingCategory : undefined,
          description,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          postcode: postCode.toUpperCase(),
          city,
          rentPerMonth: propType === "PRIVATE" ? parseFloat(rentPerMonth) : undefined,
          rentPerWeek: propType === "PRIVATE" ? parseFloat(rentPerWeek || "0") : undefined,
          depositAmount: propType === "PRIVATE" ? parseFloat(depositAmount) : undefined,
          expectedCommissionAmt: propType === "PRIVATE" ? parseFloat(expectedCommissionAmt) : undefined,
          noOfRooms: !isStudioFlat && noOfRooms ? parseInt(noOfRooms) : undefined,
          availableRooms: !isStudioFlat && availableRooms ? parseInt(availableRooms) : undefined,
          furnished, livingLandlord, garden, parking, billsIncluded,
          balconyRoofTerrace, disabledAccess, livingRoom, broadbandIncluded,
          couplesAllowed, petsAllowed, dssAllowed, childrenAllowed,
          availabilityDate: new Date(availabilityDate).toISOString(),
          status,
          photos,
          rooms: roomRows,
        },
      };

      const res = await fetch("/api/workflow/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create property."); setSaving(false); return; }
      router.push(`/properties`);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  const L = ({ text, req }: { text: string; req?: boolean }) => (
    <span className="label">{text}{req && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}</span>
  );

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Property</h1>
          <p className="page-subtitle">Select one of your landlords, then fill in property details.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/properties")}>Back</button>
      </header>

      <form onSubmit={handleSubmit} className="stack">

        {/* ── Step 1: Landlord Selection ── */}
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>Step 1 — Select Landlord</p>

          {loadingLandlords ? (
            <p className="muted">Loading landlords…</p>
          ) : landlords.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
              You have no landlords yet. Use the dashboard lookup to add your first landlord.
            </div>
          ) : selectedLandlord ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", background: "rgba(201,168,76,0.08)", borderRadius: "0.5rem", border: "1px solid rgba(201,168,76,0.3)" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: "var(--brand-gold)" }}>{selectedLandlord.landlordName}</span>
                <span style={{ marginLeft: "0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>{selectedLandlord.landlordNumber}</span>
                <span style={{ marginLeft: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>{selectedLandlord._count.properties} {selectedLandlord._count.properties === 1 ? "property" : "properties"}</span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedLandlordId(""); setLandlordSearch(""); }} disabled={saving}>Change</button>
            </div>
          ) : (
            <div className="stack" style={{ gap: "0.5rem" }}>
              <input className="input" placeholder="Search by name or phone…" value={landlordSearch} onChange={(e) => setLandlordSearch(e.target.value)} />
              <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
                {filteredLandlords.length === 0 ? (
                  <div style={{ padding: "1rem", color: "var(--text-muted)", textAlign: "center", fontSize: "0.85rem" }}>No landlords match.</div>
                ) : filteredLandlords.map((l) => (
                  <button key={l.id} type="button" onClick={() => setSelectedLandlordId(l.id)}
                    style={{ display: "flex", width: "100%", padding: "0.65rem 1rem", gap: "0.75rem", alignItems: "center", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)", flex: 1 }}>{l.landlordName}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{l.landlordNumber}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>{l._count.properties} props</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedLandlordId && (
          <>
            {/* ── Step 2: Property Type ── */}
            <div className="panel" style={{ padding: "1.25rem" }}>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Step 2 — Property Type</p>
              <div className="vacancy-toggle">
                {(["PRIVATE", "SHARED"] as const).map((t) => (
                  <label key={t} className={`vacancy-option${propType === t ? " is-active" : ""}`}>
                    <input type="radio" name="propType" checked={propType === t} onChange={() => setPropType(t)} disabled={saving} />
                    <span className="vacancy-option-title">{t === "PRIVATE" ? "Private Property" : "Shared Property"}</span>
                    <span className="vacancy-option-sub">{t === "PRIVATE" ? "Single landlord with one rent." : "Multiple rooms, separate rents."}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Step 3: Photos ── */}
            <div className="panel" style={{ padding: "1.25rem" }}>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Step 3 — Photos <span style={{ color: "var(--danger)" }}>*</span></p>
              {mediaAssets.length === 0 ? (
                <p className="muted">No photos in your media library. Upload photos first via the media library.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
                  {mediaAssets.map((a) => {
                    const sel = selectedMedia.find((m) => m.id === a.id);
                    return (
                      <div key={a.id} style={{ border: `2px solid ${sel ? "var(--brand-gold)" : "var(--border)"}`, borderRadius: "0.5rem", overflow: "hidden" }}>
                        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => toggleMedia(a.id)}>
                          <img src={a.dataUrl} alt={a.name} style={{ width: "100%", height: "90px", objectFit: "cover", display: "block" }} />
                          {sel && (
                            <div style={{ position: "absolute", top: 4, right: 4, background: "var(--brand-gold)", color: "#000", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>✓</div>
                          )}
                        </div>
                        {sel && (
                          <div style={{ padding: "0.4rem" }}>
                            <input className="input" style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }} placeholder="Alt text *" value={sel.altText}
                              onChange={(e) => setAltText(a.id, e.target.value)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Step 4: Details ── */}
            <div className="panel" style={{ padding: "1.25rem" }}>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Step 4 — Property Details</p>
              <div className="field-grid">

                <label className="field">
                  <L text="Description" req />
                  <textarea className="textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the property…" disabled={saving} />
                </label>

                {/* PRIVATE: financial fields */}
                {propType === "PRIVATE" && (
                  <>
                    <div className="field-grid-2">
                      <label className="field">
                        <L text="Rent Per Month (£)" req />
                        <input className="input" type="number" min={0} step="0.01" value={rentPerMonth} onChange={(e) => setRentPerMonth(e.target.value)} disabled={saving} />
                      </label>
                      <label className="field">
                        <span className="label">Rent Per Week (£) — auto</span>
                        <input className="input" value={rentPerWeek ? `£${rentPerWeek}` : "—"} readOnly style={{ background: "var(--surface-2, #1a1a24)", color: "var(--text-muted)" }} />
                      </label>
                    </div>
                    <div className="field-grid-2">
                      <label className="field">
                        <L text="Deposit Amount (£)" req />
                        <input className="input" type="number" min={0} step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} disabled={saving} />
                      </label>
                      <label className="field">
                        <L text="Expected Commission (£)" req />
                        <input className="input" type="number" min={0} step="0.01" value={expectedCommissionAmt} onChange={(e) => setExpectedCommissionAmt(e.target.value)} disabled={saving} />
                      </label>
                    </div>
                  </>
                )}

                {/* PRIVATE: building category */}
                {propType === "PRIVATE" && (
                  <>
                    <div className="form-section-divider"><span className="form-section-label">Property Category</span></div>
                    <div className="vacancy-toggle">
                      {BUILDING_CATS.map((c) => (
                        <label key={c} className={`vacancy-option${buildingCategory === c ? " is-active" : ""}`}>
                          <input type="radio" name="buildingCat" checked={buildingCategory === c} onChange={() => setBuildingCategory(c)} disabled={saving} />
                          <span className="vacancy-option-title">{BUILDING_LABELS[c]}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {/* SHARED: room rows */}
                {propType === "SHARED" && (
                  <>
                    <div className="form-section-divider"><span className="form-section-label">Rooms</span></div>
                    {rooms.map((room, i) => (
                      <div key={i} style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "0.5rem", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                          <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>Room {i + 1}</span>
                          {rooms.length > 1 && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRoom(i)} disabled={saving} style={{ color: "#f87171" }}>Remove</button>
                          )}
                        </div>
                        <div className="field-grid-2">
                          <label className="field">
                            <L text="Room Type" req />
                            <select className="input" value={room.roomType} onChange={(e) => updateRoom(i, "roomType", e.target.value)} disabled={saving}>
                              {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                            </select>
                          </label>
                          <label className="field">
                            <L text="Rent Per Month (£)" req />
                            <input className="input" type="number" min={0} step="0.01" value={room.rentPerMonth} onChange={(e) => updateRoom(i, "rentPerMonth", e.target.value)} disabled={saving} />
                          </label>
                          <label className="field">
                            <span className="label">Rent Per Week (£) — auto</span>
                            <input className="input" value={calcWeekly(room.rentPerMonth) ? `£${calcWeekly(room.rentPerMonth)}` : "—"} readOnly style={{ background: "var(--surface-2, #1a1a24)", color: "var(--text-muted)" }} />
                          </label>
                          <label className="field">
                            <L text="Deposit Amount (£)" req />
                            <input className="input" type="number" min={0} step="0.01" value={room.depositAmount} onChange={(e) => updateRoom(i, "depositAmount", e.target.value)} disabled={saving} />
                          </label>
                          <label className="field">
                            <L text="Expected Commission (£)" req />
                            <input className="input" type="number" min={0} step="0.01" value={room.expectedCommissionAmt} onChange={(e) => updateRoom(i, "expectedCommissionAmt", e.target.value)} disabled={saving} />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary" onClick={addRoom} disabled={saving}>+ Add Room</button>
                  </>
                )}

                {/* Address */}
                <div className="form-section-divider"><span className="form-section-label">Address</span></div>
                <div className="field-grid-2">
                  <label className="field">
                    <L text="Address Line 1" req />
                    <input className="input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 High Street" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Address Line 2</span>
                    <input className="input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Flat 4B" disabled={saving} />
                  </label>
                  <label className="field">
                    <L text="Post Code" req />
                    <input className="input" value={postCode} onChange={(e) => setPostCode(e.target.value.toUpperCase())} placeholder="SW1A 1AA" disabled={saving} />
                  </label>
                  <label className="field">
                    <L text="City" req />
                    <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" disabled={saving} />
                  </label>
                </div>

                {/* Room counts — hidden for STUDIO_FLAT */}
                {!isStudioFlat && (
                  <div className="field-grid-2">
                    <label className="field">
                      <L text="No. of Rooms" req={propType === "SHARED"} />
                      <input className="input" type="number" min={1} step={1} value={noOfRooms} onChange={(e) => setNoOfRooms(e.target.value)} disabled={saving} />
                    </label>
                    <label className="field">
                      <L text="Available Rooms" req={propType === "SHARED"} />
                      <input className="input" type="number" min={0} step={1} value={availableRooms} onChange={(e) => setAvailableRooms(e.target.value)} disabled={saving} />
                    </label>
                  </div>
                )}

                {/* Amenities */}
                <div className="form-section-divider"><span className="form-section-label">Amenities & Policies</span></div>
                <div className="field-grid-2">
                  <BoolField label="Furnished" value={furnished} onChange={setFurnished} disabled={saving} />
                  <BoolField label="Living Landlord" value={livingLandlord} onChange={setLivingLandlord} disabled={saving} />
                  <BoolField label="Garden" value={garden} onChange={setGarden} disabled={saving} />
                  <BoolField label="Parking" value={parking} onChange={setParking} disabled={saving} />
                  <BoolField label="Bills Included" value={billsIncluded} onChange={setBillsIncluded} disabled={saving} />
                  <BoolField label="Balcony / Roof Terrace" value={balconyRoofTerrace} onChange={setBalconyRoofTerrace} disabled={saving} />
                  <BoolField label="Disabled Access" value={disabledAccess} onChange={setDisabledAccess} disabled={saving} />
                  <BoolField label="Broadband Included" value={broadbandIncluded} onChange={setBroadbandIncluded} disabled={saving} />
                  <BoolField label="Couples Allowed" value={couplesAllowed} onChange={setCouplesAllowed} disabled={saving} />
                  <BoolField label="Pets Allowed" value={petsAllowed} onChange={setPetsAllowed} disabled={saving} />
                  <BoolField label="DSS Allowed" value={dssAllowed} onChange={setDssAllowed} disabled={saving} />
                  <BoolField label="Children Allowed" value={childrenAllowed} onChange={setChildrenAllowed} disabled={saving} />
                  <label className="field">
                    <span className="label">Living Room</span>
                    <select className="input" value={livingRoom} onChange={(e) => setLivingRoom(e.target.value)} disabled={saving}>
                      {LIVING_ROOM_OPTS.map((o) => <option key={o} value={o}>{o === "NONE" ? "None" : o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
                    </select>
                  </label>
                </div>

                {/* Availability & Status */}
                <div className="form-section-divider"><span className="form-section-label">Availability & Status</span></div>
                <div className="field-grid-2">
                  <label className="field">
                    <L text="Availability Date" req />
                    <input className="input" type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} disabled={saving} />
                  </label>
                  <label className="field">
                    <L text="Initial Status" req />
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "AVAILABLE")} disabled={saving}>
                      <option value="DRAFT">Draft — saved, not listed</option>
                      <option value="AVAILABLE">Available — active listing</option>
                    </select>
                  </label>
                </div>

              </div>
            </div>

            {error && (
              <div style={{ padding: "0.85rem 1rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating Property…" : "Create Property"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => router.push("/properties")} disabled={saving}>Cancel</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
