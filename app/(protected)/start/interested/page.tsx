"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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
  return (Math.round((n * 12) / 52 * 100) / 100).toFixed(2);
}

function InterestedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get("phone") ?? "";
  const prefillPotentialLandlordId = searchParams.get("potentialLandlordId") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(prefillPhone);
  const [email, setEmail] = useState("");

  const [vacancyType, setVacancyType] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [propertyCategory, setPropertyCategory] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "AVAILABLE">("DRAFT");

  const [description, setDescription] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");

  const [rentPerMonth, setRentPerMonth] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [expectedCommissionAmt, setExpectedCommissionAmt] = useState("");

  const [totalRooms, setTotalRooms] = useState("");
  const [availableRooms, setAvailableRooms] = useState("");

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
    setRooms(rooms.map((room, i) => (i === idx ? { ...room, [field]: value } : room)));
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
          ...(vacancyType === "SINGLE"
            ? {
                rentPerMonth: rentPerMonth || undefined,
                depositAmount: depositAmount || undefined,
                expectedCommissionAmt: expectedCommissionAmt || undefined,
              }
            : {
                totalRooms: totalRooms || undefined,
                availableRooms: availableRooms || undefined,
                rooms: rooms.map((room) => ({
                  roomType: room.roomType,
                  rentPerMonth: room.rentPerMonth,
                  depositAmount: room.depositAmount,
                  expectedCommissionAmt: room.expectedCommissionAmt,
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
    <div className="start-shell">
      <section className="start-hero panel">
        <div className="start-hero-copy">
          <p className="section-label" style={{ marginBottom: "0.5rem" }}>
            Interested branch
          </p>
          <h1 className="page-title">Register landlord and property details</h1>
          <p className="page-subtitle">
            Capture the landlord once, classify the property clearly, and move directly into the listing workflow.
          </p>
        </div>

        <div className="start-steps">
          <div className="start-step-card">
            <span className="start-step-index">01</span>
            <p className="start-step-copy">Confirm the landlord details and the best callback number.</p>
          </div>
          <div className="start-step-card">
            <span className="start-step-index">02</span>
            <p className="start-step-copy">Capture the property type, address, and commercial context.</p>
          </div>
          <div className="start-step-card">
            <span className="start-step-index">03</span>
            <p className="start-step-copy">Submit into the landlord record so the team can continue immediately.</p>
          </div>
        </div>
      </section>

      {error && <div className="form-error-banner">{error}</div>}

      <form className="stack" onSubmit={handleSubmit}>
        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Landlord details</h2>
            <span className="badge badge-active">Required</span>
          </div>
          <div className="form-grid-2">
            <label className="field">
              <span className="label">First Name</span>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              {fieldErrors["landlord.firstName"] && <span className="field-error">{fieldErrors["landlord.firstName"]}</span>}
            </label>
            <label className="field">
              <span className="label">Last Name</span>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label">Phone</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              {fieldErrors["landlord.phone"] && <span className="field-error">{fieldErrors["landlord.phone"]}</span>}
            </label>
            <label className="field">
              <span className="label">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Property type</h2>
            <span className={`badge ${vacancyType === "SINGLE" ? "badge-active" : "badge-warning"}`}>
              {vacancyType === "SINGLE" ? "Single" : "Shared"}
            </span>
          </div>
          <div className="form-grid-2">
            <label className="field">
              <span className="label">Vacancy Type</span>
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
        </section>

        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Property address</h2>
            <span className="badge badge-warning">Context</span>
          </div>
          <div className="stack" style={{ gap: "0.75rem" }}>
            <label className="field">
              <span className="label">Description</span>
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label">Address Line 1</span>
              <input className="input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
            </label>
            <label className="field">
              <span className="label">Address Line 2</span>
              <input className="input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            </label>
            <div className="form-grid-2">
              <label className="field">
                <span className="label">Postcode</span>
                <input
                  className="input"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  style={{ textTransform: "uppercase" }}
                  required
                />
              </label>
              <label className="field">
                <span className="label">City</span>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
              </label>
            </div>
            <label className="field">
              <span className="label">Availability Date</span>
              <input className="input" type="datetime-local" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} required />
            </label>
          </div>
        </section>

        {vacancyType === "SINGLE" && (
          <section className="dialer-card">
            <div className="dialer-card-head">
              <h2 className="dialer-card-title">Financials</h2>
              <span className="badge badge-active">Single property</span>
            </div>
            <div className="form-grid-2">
              <label className="field">
                <span className="label">Rent / Month (£)</span>
                <input className="input" type="number" min="0" step="0.01" value={rentPerMonth} onChange={(e) => setRentPerMonth(e.target.value)} required />
              </label>
              <label className="field">
                <span className="label">Rent / Week (auto)</span>
                <input className="input" readOnly value={rentPerWeekDisplay ? `£${rentPerWeekDisplay}` : ""} style={{ opacity: 0.6 }} />
              </label>
              <label className="field">
                <span className="label">Deposit (£)</span>
                <input className="input" type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
              </label>
              <label className="field">
                <span className="label">Expected Commission (£)</span>
                <input className="input" type="number" min="0" step="0.01" value={expectedCommissionAmt} onChange={(e) => setExpectedCommissionAmt(e.target.value)} required />
              </label>
            </div>
          </section>
        )}

        {isShared && !isStudio && (
          <section className="dialer-card">
            <div className="dialer-card-head">
              <h2 className="dialer-card-title">Room counts</h2>
              <span className="badge badge-warning">Shared</span>
            </div>
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
          </section>
        )}

        <section className="dialer-card">
          <div className="dialer-card-head">
            <h2 className="dialer-card-title">Amenities and rules</h2>
            <span className="badge badge-active">Profile</span>
          </div>
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
            {(
              [
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
              ] as [string, string, boolean, (value: boolean) => void][]
            ).map(([id, label, value, setter]) => (
              <label key={id} className="checkbox-label">
                <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {isShared && (
          <section className="dialer-card">
            <div className="dialer-card-head">
              <h2 className="dialer-card-title">Rooms</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRoom}>
                + Add Room
              </button>
            </div>

            <div className="stack">
              {rooms.map((room, idx) => (
                <article key={idx} className="dialer-card" style={{ padding: "1rem" }}>
                  <div className="page-header" style={{ alignItems: "flex-start" }}>
                    <div>
                      <p className="section-label" style={{ marginBottom: "0.4rem" }}>
                        Room {idx + 1}
                      </p>
                    </div>
                    {rooms.length > 1 && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeRoom(idx)}>
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-grid-2">
                    <label className="field">
                      <span className="label">Room Type</span>
                      <select className="input" value={room.roomType} onChange={(e) => updateRoom(idx, "roomType", e.target.value as RoomType)}>
                        {ROOM_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.replace(/_/g, " ")}
                          </option>
                        ))}
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
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="inline-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Registering..." : "Register Landlord & Property"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InterestedPage() {
  return (
    <Suspense fallback={<div className="muted">Loading...</div>}>
      <InterestedForm />
    </Suspense>
  );
}