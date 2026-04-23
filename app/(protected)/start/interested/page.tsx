"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const ROOM_TYPES = ["STUDIO_ROOM", "SINGLE_ROOM", "DOUBLE_ROOM", "ENSUITE_ROOM", "LOFT"] as const;
type RoomType = typeof ROOM_TYPES[number];

type Room = {
  roomType: RoomType;
  rentPerMonth: string;
  depositAmount: string;
  expectedCommissionAmt: string;
};

function calcRentPerWeek(monthly: string): string {
  const n = parseFloat(monthly);
  if (!n) return "";
  return (Math.round((n * 12 / 52) * 100) / 100).toFixed(2);
}

function InterestedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get("phone") ?? "";
  const prefillLandlordId = searchParams.get("landlordId") ?? "";
  const prefillPotentialLandlordId = searchParams.get("potentialLandlordId") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Landlord
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(prefillPhone);
  const [email, setEmail] = useState("");

  // Property type
  const [vacancyType, setVacancyType] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [propertyCategory, setPropertyCategory] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "AVAILABLE">("DRAFT");

  // Property address
  const [description, setDescription] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");

  // Single property financials
  const [rentPerMonth, setRentPerMonth] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [expectedCommissionAmt, setExpectedCommissionAmt] = useState("");

  // Shared property counts
  const [totalRooms, setTotalRooms] = useState("");
  const [availableRooms, setAvailableRooms] = useState("");

  // Amenities
  const [isFurnished, setIsFurnished] = useState(false);
  const [livingLandlord, setLivingLandlord] = useState(false);
  const [garden, setGarden] = useState(false);
  const [parking, setParking] = useState(false);
  const [billsIncluded, setBillsIncluded] = useState(false);
  const [balcony, setBalcony] = useState(false);
  const [disabledAccess, setDisabledAccess] = useState(false);
  const [broadbandIncluded, setBroadbandIncluded] = useState(false);
  const [couplesAllowed, setCouplesAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [dssAllowed, setDssAllowed] = useState(false);
  const [childrenAllowed, setChildrenAllowed] = useState(false);
  const [livingRoom, setLivingRoom] = useState<"PRIVATE" | "SHARED" | "NONE">("NONE");

  // Rooms (for MULTIPLE)
  const [rooms, setRooms] = useState<Room[]>([{ roomType: "SINGLE_ROOM", rentPerMonth: "", depositAmount: "", expectedCommissionAmt: "" }]);

  const isStudio = vacancyType === "SINGLE" && propertyCategory === "STUDIO_FLAT";
  const isShared = vacancyType === "MULTIPLE";

  function addRoom() {
    setRooms([...rooms, { roomType: "SINGLE_ROOM", rentPerMonth: "", depositAmount: "", expectedCommissionAmt: "" }]);
  }

  function removeRoom(idx: number) {
    setRooms(rooms.filter((_, i) => i !== idx));
  }

  function updateRoom(idx: number, field: keyof Room, value: string) {
    setRooms(rooms.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        landlord: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        },
        property: {
          vacancyType,
          propertyCategory: vacancyType === "SINGLE" && propertyCategory ? propertyCategory : undefined,
          description: description.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          postcode: postcode.trim().toUpperCase(),
          city: city.trim(),
          availabilityDate: availabilityDate ? new Date(availabilityDate).toISOString() : undefined,
          status,
          isFurnished: String(isFurnished),
          livingLandlord: String(livingLandlord),
          garden: String(garden),
          parking: String(parking),
          billsIncluded: String(billsIncluded),
          balcony: String(balcony),
          disabledAccess: String(disabledAccess),
          broadbandIncluded: String(broadbandIncluded),
          couplesAllowed: String(couplesAllowed),
          petsAllowed: String(petsAllowed),
          dssAllowed: String(dssAllowed),
          childrenAllowed: String(childrenAllowed),
          livingRoom,
          ...(vacancyType === "SINGLE" ? {
            rentPerMonth: rentPerMonth || undefined,
            depositAmount: depositAmount || undefined,
            expectedCommissionAmt: expectedCommissionAmt || undefined,
          } : {
            totalRooms: totalRooms || undefined,
            availableRooms: availableRooms || undefined,
            rooms: rooms.map((r) => ({
              roomType: r.roomType,
              rentPerMonth: r.rentPerMonth,
              depositAmount: r.depositAmount,
              expectedCommissionAmt: r.expectedCommissionAmt,
            })),
          }),
        },
        ...(prefillPotentialLandlordId ? { potentialLandlordId: prefillPotentialLandlordId } : {}),
      };

      const res = await fetch("/api/start/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.fieldErrors) setFieldErrors(data.details.fieldErrors);
        setError(data.message ?? "Something went wrong.");
        return;
      }

      router.push(`/landlords/${data.landlord.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const rentPerWeekDisplay = calcRentPerWeek(rentPerMonth);

  return (
    <form className="stack" onSubmit={handleSubmit} style={{ maxWidth: 760 }}>
      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.25rem" }}>Interested — Register Landlord &amp; Property</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Fill in landlord details and the property they want to list.
        </p>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      {/* ── Landlord Details ───────────────────────────────────── */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Landlord Details</p>
        <div className="form-grid-2">
          <label className="field">
            <span className="label">First Name <span className="required">*</span></span>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            {fieldErrors["landlord.firstName"] && <span className="field-error">{fieldErrors["landlord.firstName"]}</span>}
          </label>
          <label className="field">
            <span className="label">Last Name <span className="required">*</span></span>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Phone <span className="required">*</span></span>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            {fieldErrors["landlord.phone"] && <span className="field-error">{fieldErrors["landlord.phone"]}</span>}
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
      </div>

      {/* ── Property Type ──────────────────────────────────────── */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Property Type</p>
        <div className="form-grid-2">
          <label className="field">
            <span className="label">Vacancy Type <span className="required">*</span></span>
            <select className="input" value={vacancyType} onChange={(e) => setVacancyType(e.target.value as "SINGLE" | "MULTIPLE")}>
              <option value="SINGLE">Private (Single)</option>
              <option value="MULTIPLE">Shared (Multiple Rooms)</option>
            </select>
          </label>
          {vacancyType === "SINGLE" && (
            <label className="field">
              <span className="label">Property Category</span>
              <select className="input" value={propertyCategory} onChange={(e) => setPropertyCategory(e.target.value)}>
                <option value="">— Select —</option>
                <option value="HOUSE">House</option>
                <option value="FLAT">Flat</option>
                <option value="STUDIO_FLAT">Studio Flat</option>
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Listing Status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "AVAILABLE")}>
              <option value="DRAFT">Draft</option>
              <option value="AVAILABLE">Available</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Property Address ───────────────────────────────────── */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Property Address</p>
        <div className="stack" style={{ gap: "0.75rem" }}>
          <label className="field">
            <span className="label">Description <span className="required">*</span></span>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Address Line 1 <span className="required">*</span></span>
            <input className="input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Address Line 2</span>
            <input className="input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
          </label>
          <div className="form-grid-2">
            <label className="field">
              <span className="label">Postcode <span className="required">*</span></span>
              <input
                className="input"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase" }}
                required
              />
            </label>
            <label className="field">
              <span className="label">City <span className="required">*</span></span>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
            </label>
          </div>
          <label className="field">
            <span className="label">Availability Date <span className="required">*</span></span>
            <input className="input" type="datetime-local" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} required />
          </label>
        </div>
      </div>

      {/* ── Financials (single only) ───────────────────────────── */}
      {vacancyType === "SINGLE" && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>Financials</p>
          <div className="form-grid-2">
            <label className="field">
              <span className="label">Rent / Month (£) <span className="required">*</span></span>
              <input className="input" type="number" min="0" step="0.01" value={rentPerMonth} onChange={(e) => setRentPerMonth(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label">Rent / Week (auto)</span>
              <input className="input" readOnly value={rentPerWeekDisplay ? `£${rentPerWeekDisplay}` : ""} style={{ opacity: 0.6 }} />
            </label>
            <label className="field">
              <span className="label">Deposit (£) <span className="required">*</span></span>
              <input className="input" type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label">Expected Commission (£) <span className="required">*</span></span>
              <input className="input" type="number" min="0" step="0.01" value={expectedCommissionAmt} onChange={(e) => setExpectedCommissionAmt(e.target.value)} required />
            </label>
          </div>
        </div>
      )}

      {/* ── Shared room counts ─────────────────────────────────── */}
      {isShared && !isStudio && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>Room Counts</p>
          <div className="form-grid-2">
            <label className="field">
              <span className="label">Total Rooms</span>
              <input className="input" type="number" min="0" value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Available Rooms</span>
              <input className="input" type="number" min="0" value={availableRooms} onChange={(e) => setAvailableRooms(e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {/* ── Amenities ─────────────────────────────────────────── */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Amenities &amp; Rules</p>
        <div className="form-grid-2">
          <label className="field">
            <span className="label">Living Room</span>
            <select className="input" value={livingRoom} onChange={(e) => setLivingRoom(e.target.value as "PRIVATE" | "SHARED" | "NONE")}>
              <option value="NONE">None</option>
              <option value="PRIVATE">Private</option>
              <option value="SHARED">Shared</option>
            </select>
          </label>
        </div>
        <div className="checkbox-grid" style={{ marginTop: "0.75rem" }}>
          {([
            ["isFurnished", "Furnished", isFurnished, setIsFurnished],
            ["livingLandlord", "Landlord Lives Here", livingLandlord, setLivingLandlord],
            ["garden", "Garden", garden, setGarden],
            ["parking", "Parking", parking, setParking],
            ["billsIncluded", "Bills Included", billsIncluded, setBillsIncluded],
            ["balcony", "Balcony", balcony, setBalcony],
            ["disabledAccess", "Disabled Access", disabledAccess, setDisabledAccess],
            ["broadbandIncluded", "Broadband Included", broadbandIncluded, setBroadbandIncluded],
            ["couplesAllowed", "Couples Allowed", couplesAllowed, setCouplesAllowed],
            ["petsAllowed", "Pets Allowed", petsAllowed, setPetsAllowed],
            ["dssAllowed", "DSS Allowed", dssAllowed, setDssAllowed],
            ["childrenAllowed", "Children Allowed", childrenAllowed, setChildrenAllowed],
          ] as [string, string, boolean, (v: boolean) => void][]).map(([id, label, value, setter]) => (
            <label key={id} className="checkbox-label">
              <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Rooms (shared only) ────────────────────────────────── */}
      {isShared && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p className="section-label" style={{ margin: 0 }}>Rooms <span className="required">*</span></p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRoom}>+ Add Room</button>
          </div>
          {rooms.map((room, idx) => (
            <div key={idx} className="panel" style={{ padding: "1rem", marginBottom: "0.75rem", background: "var(--surface-raised)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Room {idx + 1}</span>
                {rooms.length > 1 && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeRoom(idx)} style={{ padding: "0.1rem 0.5rem" }}>Remove</button>
                )}
              </div>
              <div className="form-grid-2">
                <label className="field">
                  <span className="label">Room Type</span>
                  <select className="input" value={room.roomType} onChange={(e) => updateRoom(idx, "roomType", e.target.value as RoomType)}>
                    {ROOM_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Rent / Month (£)</span>
                  <input className="input" type="number" min="0" step="0.01" value={room.rentPerMonth} onChange={(e) => updateRoom(idx, "rentPerMonth", e.target.value)} />
                </label>
                <label className="field">
                  <span className="label">Deposit (£)</span>
                  <input className="input" type="number" min="0" step="0.01" value={room.depositAmount} onChange={(e) => updateRoom(idx, "depositAmount", e.target.value)} />
                </label>
                <label className="field">
                  <span className="label">Commission (£)</span>
                  <input className="input" type="number" min="0" step="0.01" value={room.expectedCommissionAmt} onChange={(e) => updateRoom(idx, "expectedCommissionAmt", e.target.value)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Registering..." : "Register Landlord & Property"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function InterestedPage() {
  return (
    <Suspense fallback={<div className="muted">Loading...</div>}>
      <InterestedForm />
    </Suspense>
  );
}
