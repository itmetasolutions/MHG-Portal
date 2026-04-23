"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { PropertyMediaLibrary } from "@/components/property-media-library";
import { fetchLandlordsForDropdown, type LandlordRow } from "@/lib/portal-api";

type RoomTypeVal = "STUDIO_ROOM" | "SINGLE_ROOM" | "DOUBLE_ROOM" | "ENSUITE_ROOM" | "LOFT";
type PropertyCategoryVal = "HOUSE" | "FLAT" | "STUDIO_FLAT";
type RoomDraft = { roomType: RoomTypeVal; rentPerMonth: string; depositAmount: string; expectedCommissionAmt: string };

const ROOM_TYPES: { value: RoomTypeVal; label: string }[] = [
  { value: "STUDIO_ROOM", label: "Studio Room" },
  { value: "SINGLE_ROOM", label: "Single Room" },
  { value: "DOUBLE_ROOM", label: "Double Room" },
  { value: "ENSUITE_ROOM", label: "Ensuite Room" },
  { value: "LOFT", label: "Loft" },
];

const PROP_CATEGORIES: { value: PropertyCategoryVal; label: string }[] = [
  { value: "HOUSE", label: "House" },
  { value: "FLAT", label: "Flat" },
  { value: "STUDIO_FLAT", label: "Studio Flat" },
];

function emptyRoom(): RoomDraft {
  return { roomType: "SINGLE_ROOM", rentPerMonth: "", depositAmount: "", expectedCommissionAmt: "" };
}

function calcWeekly(rpm: string): string {
  const n = parseFloat(rpm);
  if (!n || isNaN(n)) return "";
  return String(Math.round((n * 12 / 52) * 100) / 100);
}

function toIso(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toISOString();
}

export default function AddPropertyPage() {
  const router = useRouter();

  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [landlordSearch, setLandlordSearch] = useState("");
  const [selectedLandlordId, setSelectedLandlordId] = useState("");
  const [loadingLandlords, setLoadingLandlords] = useState(true);

  const [vacancyType, setVacancyType] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategoryVal | "">("");
  const [description, setDescription] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [rentPerMonth, setRentPerMonth] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [expectedCommissionAmt, setExpectedCommissionAmt] = useState("");
  const [totalRooms, setTotalRooms] = useState("");
  const [availableRooms, setAvailableRooms] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "AVAILABLE">("DRAFT");
  const [rooms, setRooms] = useState<RoomDraft[]>([emptyRoom()]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const [isFurnished, setIsFurnished] = useState<"true" | "false">("true");
  const [livingLandlord, setLivingLandlord] = useState<"true" | "false">("false");
  const [couplesAllowed, setCouplesAllowed] = useState<"true" | "false">("true");
  const [petsAllowed, setPetsAllowed] = useState<"true" | "false">("false");
  const [dssAllowed, setDssAllowed] = useState<"true" | "false">("true");
  const [childrenAllowed, setChildrenAllowed] = useState<"true" | "false">("true");
  const [livingRoom, setLivingRoom] = useState<"PRIVATE" | "SHARED" | "NONE">("NONE");

  const [garden, setGarden] = useState(false);
  const [parking, setParking] = useState(false);
  const [billsIncluded, setBillsIncluded] = useState(false);
  const [balcony, setBalcony] = useState(false);
  const [disabledAccess, setDisabledAccess] = useState(false);
  const [broadbandIncluded, setBroadbandIncluded] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void fetchLandlordsForDropdown().then((r) => {
      if (r.ok) setLandlords(r.data.landlords);
      setLoadingLandlords(false);
    });
  }, []);

  const rentPerWeek = calcWeekly(rentPerMonth);
  const isStudio = vacancyType === "SINGLE" && propertyCategory === "STUDIO_FLAT";

  const filteredLandlords = useMemo(() => {
    const q = landlordSearch.trim().toLowerCase();
    if (!q) return landlords;
    return landlords.filter(
      (l) => l.landlordName.toLowerCase().includes(q) || l.phoneLast10.includes(q),
    );
  }, [landlords, landlordSearch]);

  const selectedLandlord = landlords.find((l) => l.id === selectedLandlordId);

  function updateRoom(i: number, key: keyof RoomDraft, value: string) {
    setRooms((prev) => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedLandlordId) { setMessage({ type: "error", text: "Select a landlord first." }); return; }
    if (!description.trim()) { setMessage({ type: "error", text: "Description is required." }); return; }
    if (!addressLine1.trim()) { setMessage({ type: "error", text: "Address Line 1 is required." }); return; }
    if (!postcode.trim()) { setMessage({ type: "error", text: "Postcode is required." }); return; }
    if (!city.trim()) { setMessage({ type: "error", text: "City is required." }); return; }
    if (!availabilityDate) { setMessage({ type: "error", text: "Availability date is required." }); return; }
    if (vacancyType === "SINGLE") {
      if (!rentPerMonth) { setMessage({ type: "error", text: "Rent per month is required." }); return; }
      if (!depositAmount) { setMessage({ type: "error", text: "Deposit is required." }); return; }
      if (!expectedCommissionAmt) { setMessage({ type: "error", text: "Expected commission is required." }); return; }
    }
    if (vacancyType === "MULTIPLE" && rooms.every((r) => !r.rentPerMonth)) {
      setMessage({ type: "error", text: "Add at least one room with rent." }); return;
    }

    setSaving(true);
    setMessage(null);

    const validRooms = rooms.filter((r) => r.rentPerMonth);

    const body = {
      landlordId: selectedLandlordId,
      property: {
        vacancyType,
        propertyCategory: vacancyType === "SINGLE" && propertyCategory ? propertyCategory : undefined,
        description: description.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        postcode: postcode.trim().toUpperCase(),
        city: city.trim(),
        rentPerMonth: vacancyType === "SINGLE" && rentPerMonth ? Number(rentPerMonth) : null,
        depositAmount: vacancyType === "SINGLE" && depositAmount ? Number(depositAmount) : null,
        expectedCommissionAmt: vacancyType === "SINGLE" && expectedCommissionAmt ? Number(expectedCommissionAmt) : null,
        totalRooms: !isStudio && totalRooms ? Number(totalRooms) : null,
        availableRooms: !isStudio && availableRooms ? Number(availableRooms) : null,
        isFurnished,
        livingLandlord,
        garden: garden ? "true" : "false",
        parking: parking ? "true" : "false",
        billsIncluded: billsIncluded ? "true" : "false",
        balcony: balcony ? "true" : "false",
        disabledAccess: disabledAccess ? "true" : "false",
        broadbandIncluded: broadbandIncluded ? "true" : "false",
        livingRoom,
        couplesAllowed,
        petsAllowed,
        dssAllowed,
        childrenAllowed,
        availabilityDate: toIso(availabilityDate),
        status,
        mediaAssetIds: selectedMediaIds,
        rooms: vacancyType === "MULTIPLE" ? validRooms.map((r) => ({
          roomType: r.roomType,
          rentPerMonth: Number(r.rentPerMonth),
          depositAmount: Number(r.depositAmount) || 0,
          expectedCommissionAmt: Number(r.expectedCommissionAmt) || 0,
        })) : undefined,
      },
    };

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: (data as { message?: string }).message ?? "Failed to create property." });
        setSaving(false);
        return;
      }
      router.push("/properties");
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Add Property</h1>
          <p className="page-subtitle">Select a landlord, then fill in the property details.</p>
        </div>
        <UIButton variant="secondary" onClick={() => router.push("/properties")} disabled={saving}>
          Back
        </UIButton>
      </header>

      <UICard>
        <UICardBody>
          <form className="field-grid" onSubmit={handleSubmit}>

            {/* ── Step 1: Landlord ── */}
            <div className="form-section-divider">
              <span className="form-section-label">Step 1 — Select Landlord</span>
            </div>

            {selectedLandlord ? (
              <div className="landlord-selected-row">
                <div className="landlord-selected-info">
                  <span className="landlord-selected-name">{selectedLandlord.landlordName}</span>
                  <span className="landlord-selected-phone">{selectedLandlord.phoneLast10}</span>
                  {selectedLandlord.isPassive && <span className="landlord-passive-badge">Passive</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSelectedLandlordId(""); setLandlordSearch(""); }}
                  disabled={saving}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="field">
                <span className="label">Search Landlord <span style={{ color: "var(--danger)" }}>*</span></span>
                {loadingLandlords ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading landlords...</p>
                ) : (
                  <div className="landlord-search-wrap">
                    <UIInput
                      value={landlordSearch}
                      onChange={(e) => setLandlordSearch(e.target.value)}
                      placeholder="Search by name or phone..."
                      disabled={saving}
                    />
                    {landlords.length > 0 && (
                      <div className="landlord-search-list">
                        {filteredLandlords.length === 0 ? (
                          <div className="landlord-search-empty">No landlords match &ldquo;{landlordSearch}&rdquo;</div>
                        ) : (
                          filteredLandlords.map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              className="landlord-search-item"
                              onClick={() => { setSelectedLandlordId(l.id); setLandlordSearch(""); }}
                              disabled={saving}
                            >
                              <span className="landlord-search-item-name">{l.landlordName}</span>
                              <span className="landlord-search-item-meta">
                                {l.phoneLast10}{l.isPassive ? " · Passive" : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                {landlords.length === 0 && !loadingLandlords && (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    No landlords yet. Add one via the <strong>Start Call → Interested</strong> flow.
                  </p>
                )}
              </div>
            )}

            {selectedLandlord && (
              <>
                {/* ── Step 2: Property Type ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Step 2 — Property Type</span>
                </div>

                <div className="vacancy-toggle">
                  <label className={`vacancy-option${vacancyType === "SINGLE" ? " is-active" : ""}`}>
                    <input type="radio" name="vt" checked={vacancyType === "SINGLE"} onChange={() => setVacancyType("SINGLE")} disabled={saving} />
                    <span className="vacancy-option-title">Private (Single Tenancy)</span>
                    <span className="vacancy-option-sub">One landlord demand and commission for the whole property.</span>
                  </label>
                  <label className={`vacancy-option${vacancyType === "MULTIPLE" ? " is-active" : ""}`}>
                    <input type="radio" name="vt" checked={vacancyType === "MULTIPLE"} onChange={() => setVacancyType("MULTIPLE")} disabled={saving} />
                    <span className="vacancy-option-title">Shared (Multiple Rooms)</span>
                    <span className="vacancy-option-sub">Rooms managed and let individually.</span>
                  </label>
                </div>

                {vacancyType === "SINGLE" && (
                  <>
                    <div className="form-section-divider">
                      <span className="form-section-label">Property Category</span>
                    </div>
                    <div className="vacancy-toggle">
                      {PROP_CATEGORIES.map((c) => (
                        <label key={c.value} className={`vacancy-option${propertyCategory === c.value ? " is-active" : ""}`}>
                          <input type="radio" name="pc" checked={propertyCategory === c.value}
                            onChange={() => setPropertyCategory(c.value)} disabled={saving} />
                          <span className="vacancy-option-title">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Step 3: Property Details ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Step 3 — Property Details</span>
                </div>

                <label className="field">
                  <span className="label">Description <span style={{ color: "var(--danger)" }}>*</span></span>
                  <textarea
                    className="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the property, layout, and standout features."
                    rows={4}
                    disabled={saving}
                  />
                </label>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Address Line 1 <span style={{ color: "var(--danger)" }}>*</span></span>
                    <UIInput value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 High Street" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Address Line 2</span>
                    <UIInput value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Flat 4B" disabled={saving} />
                  </label>
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">City / Town <span style={{ color: "var(--danger)" }}>*</span></span>
                    <UIInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" disabled={saving} />
                  </label>
                  <label className="field">
                    <span className="label">Postcode <span style={{ color: "var(--danger)" }}>*</span></span>
                    <UIInput
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                      placeholder="SW1A 1AA"
                      disabled={saving}
                    />
                  </label>
                </div>

                {/* ── Financials ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Financials</span>
                </div>

                {vacancyType === "SINGLE" ? (
                  <div className="field-grid-2">
                    <label className="field">
                      <span className="label">Rent / Month (£) <span style={{ color: "var(--danger)" }}>*</span></span>
                      <UIInput type="number" min={0} step="0.01" value={rentPerMonth}
                        onChange={(e) => setRentPerMonth(e.target.value)} placeholder="e.g. 1200" disabled={saving} />
                    </label>
                    <label className="field">
                      <span className="label">Rent / Week (£) — auto-calculated</span>
                      <UIInput value={rentPerWeek || "—"} readOnly style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }} />
                    </label>
                    <label className="field">
                      <span className="label">Deposit (£) <span style={{ color: "var(--danger)" }}>*</span></span>
                      <UIInput type="number" min={0} step="0.01" value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 1500" disabled={saving} />
                    </label>
                    <label className="field">
                      <span className="label">Expected Commission (£) <span style={{ color: "var(--danger)" }}>*</span></span>
                      <UIInput type="number" min={0} step="0.01" value={expectedCommissionAmt}
                        onChange={(e) => setExpectedCommissionAmt(e.target.value)} placeholder="e.g. 500" disabled={saving} />
                    </label>
                  </div>
                ) : (
                  <div className="room-editor">
                    <div className="table-wrap room-editor-wrap">
                      <table className="room-editor-table">
                        <thead>
                          <tr>
                            <th>Room Type</th>
                            <th>Rent/mo (£) *</th>
                            <th>Deposit (£) *</th>
                            <th>Commission (£) *</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map((room, i) => (
                            <tr key={i}>
                              <td>
                                <UISelect value={room.roomType} onChange={(e) => updateRoom(i, "roomType", e.target.value as RoomTypeVal)} disabled={saving}>
                                  {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </UISelect>
                              </td>
                              <td><UIInput type="number" min={0} step="0.01" value={room.rentPerMonth} onChange={(e) => updateRoom(i, "rentPerMonth", e.target.value)} placeholder="e.g. 600" disabled={saving} /></td>
                              <td><UIInput type="number" min={0} step="0.01" value={room.depositAmount} onChange={(e) => updateRoom(i, "depositAmount", e.target.value)} placeholder="e.g. 700" disabled={saving} /></td>
                              <td><UIInput type="number" min={0} step="0.01" value={room.expectedCommissionAmt} onChange={(e) => updateRoom(i, "expectedCommissionAmt", e.target.value)} placeholder="e.g. 300" disabled={saving} /></td>
                              <td>
                                <UIButton type="button" variant="secondary" onClick={() => setRooms((p) => p.filter((_, j) => j !== i))} disabled={saving || rooms.length <= 1}>
                                  Remove
                                </UIButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <UIButton type="button" variant="secondary" onClick={() => setRooms((p) => [...p, emptyRoom()])} disabled={saving}>
                      + Add Room
                    </UIButton>
                  </div>
                )}

                {/* ── Room Counts ── */}
                {!isStudio && (
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
                )}

                {/* ── Amenities ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Amenities &amp; Features</span>
                </div>

                <div className="checkbox-grid">
                  {([
                    ["garden", garden, setGarden, "Garden"],
                    ["parking", parking, setParking, "Parking"],
                    ["billsIncluded", billsIncluded, setBillsIncluded, "Bills Included"],
                    ["balcony", balcony, setBalcony, "Balcony"],
                    ["disabledAccess", disabledAccess, setDisabledAccess, "Disabled Access"],
                    ["broadbandIncluded", broadbandIncluded, setBroadbandIncluded, "Broadband Included"],
                  ] as [string, boolean, (v: boolean) => void, string][]).map(([key, val, setter, label]) => (
                    <label key={key} className="checkbox-label">
                      <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} disabled={saving} />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="field-grid-2">
                  <label className="field">
                    <span className="label">Living Room</span>
                    <UISelect value={livingRoom} onChange={(e) => setLivingRoom(e.target.value as "PRIVATE" | "SHARED" | "NONE")} disabled={saving}>
                      <option value="NONE">None</option>
                      <option value="PRIVATE">Private</option>
                      <option value="SHARED">Shared</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Furnished</span>
                    <UISelect value={isFurnished} onChange={(e) => setIsFurnished(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Living Landlord</span>
                    <UISelect value={livingLandlord} onChange={(e) => setLivingLandlord(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">DSS Accepted</span>
                    <UISelect value={dssAllowed} onChange={(e) => setDssAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Pets Allowed</span>
                    <UISelect value={petsAllowed} onChange={(e) => setPetsAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Children Allowed</span>
                    <UISelect value={childrenAllowed} onChange={(e) => setChildrenAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Couples Allowed</span>
                    <UISelect value={couplesAllowed} onChange={(e) => setCouplesAllowed(e.target.value as "true" | "false")} disabled={saving}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </UISelect>
                  </label>
                  <label className="field">
                    <span className="label">Availability Date <span style={{ color: "var(--danger)" }}>*</span></span>
                    <UIInput type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} disabled={saving} />
                  </label>
                </div>

                {/* ── Images ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Property Images</span>
                </div>
                <PropertyMediaLibrary selectedAssetIds={selectedMediaIds} onChange={setSelectedMediaIds} disabled={saving} />

                {/* ── Status ── */}
                <div className="form-section-divider">
                  <span className="form-section-label">Listing Status</span>
                </div>
                <div className="vacancy-toggle">
                  <label className={`vacancy-option${status === "DRAFT" ? " is-active" : ""}`}>
                    <input type="radio" name="st" checked={status === "DRAFT"} onChange={() => setStatus("DRAFT")} disabled={saving} />
                    <span className="vacancy-option-title">Draft</span>
                    <span className="vacancy-option-sub">Saved but not listed publicly.</span>
                  </label>
                  <label className={`vacancy-option${status === "AVAILABLE" ? " is-active" : ""}`}>
                    <input type="radio" name="st" checked={status === "AVAILABLE"} onChange={() => setStatus("AVAILABLE")} disabled={saving} />
                    <span className="vacancy-option-title">Available</span>
                    <span className="vacancy-option-sub">Live and visible as an active listing.</span>
                  </label>
                </div>
              </>
            )}

            {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

            <div className="inline-row" style={{ marginTop: "0.25rem" }}>
              <UIButton type="submit" disabled={!selectedLandlordId || saving}>
                {saving ? "Creating..." : "Create Property"}
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
