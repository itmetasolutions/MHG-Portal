"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import {
  closePropertySale,
  closePropertyRoomSale,
  createLandlordProperty,
  fetchLandlordProperties,
  updateProperty,
  type PropertyRow,
  type PropertyStatus,
  type SessionRole,
  type VacancyType,
} from "@/lib/portal-api";

type Props = {
  landlordId: string;
  currentRole: SessionRole;
};

type CloseSaleForm = {
  propertyId: string;
  roomId?: string;
  roomName?: string;
  finalAmount: string;
  commissionPct: string;
  otherCosts: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAddress: string;
  tenantMoveInDate: string;
  tenantRent: string;
  tenantDeposit: string;
  tenantNotes: string;
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

function createEmptyRoom(_index: number): RoomDraft {
  return {
    roomName: ROOM_TYPES[0],
    landlordDemand: "",
    expectedCommissionPct: "",
  };
}

function getSales(property: PropertyRow) {
  return property.sales ?? (property.sale ? [property.sale] : []);
}

function roomStatusBadge(status: "AVAILABLE" | "UNDER_OFFER" | "CLOSED") {
  if (status === "AVAILABLE") return "badge-active";
  if (status === "UNDER_OFFER") return "badge-offer";
  return "badge-sold";
}

const STATUS_CONFIG: Record<PropertyStatus, { label: string; badgeClass: string }> = {
  AVAILABLE: { label: "Available", badgeClass: "badge-active" },
  CLOSED:    { label: "Closed",    badgeClass: "badge-sold"   },
  DRAFT:     { label: "Draft",     badgeClass: "badge-draft"  },
};

export function LandlordPropertiesClient({ landlordId, currentRole }: Props) {
  const [landlordLabel, setLandlordLabel] = useState("");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [newPropertyRef, setNewPropertyRef] = useState("");
  const [newAddressLine1, setNewAddressLine1] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostcode, setNewPostcode] = useState("");
  const [newDemand, setNewDemand] = useState("");
  const [newStatus, setNewStatus] = useState<PropertyStatus>("DRAFT");
  const [newVacancyType, setNewVacancyType] = useState<VacancyType>("SINGLE");
  const [newRooms, setNewRooms] = useState<RoomDraft[]>([createEmptyRoom(0)]);

  const [editId, setEditId] = useState<string | null>(null);
  const [editPropertyRef, setEditPropertyRef] = useState("");
  const [editStatus, setEditStatus] = useState<PropertyStatus>("DRAFT");
  const [editCity, setEditCity] = useState("");
  const [editPostcode, setEditPostcode] = useState("");
  const [editDemand, setEditDemand] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [closingSale, setClosingSale] = useState<CloseSaleForm | null>(null);
  const [closeSaleBusy, setCloseSaleBusy] = useState(false);

  const roleLabel = useMemo(() => currentRole, [currentRole]);

  function updateNewRoom(index: number, key: keyof RoomDraft, value: string) {
    setNewRooms((prev) => prev.map((room, i) => (i === index ? { ...room, [key]: value } : room)));
  }

  function addNewRoom() {
    setNewRooms((prev) => [...prev, createEmptyRoom(prev.length)]);
  }

  function removeNewRoom(index: number) {
    setNewRooms((prev) => prev.filter((_, i) => i !== index));
  }

  async function load() {
    setLoading(true);
    const result = await fetchLandlordProperties(landlordId);
    setLoading(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load landlord properties." });
      return;
    }

    setLandlordLabel(`${result.data.landlord.fullName} (${result.data.landlord.phoneLast10})`);
    setProperties(result.data.properties);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const normalizedRooms =
      newVacancyType === "MULTIPLE"
        ? newRooms
            .filter((room) => room.roomName.trim().length > 0)
            .map((room) => ({
              roomName: room.roomName.trim(),
              landlordDemand: room.landlordDemand !== "" ? Number(room.landlordDemand) : undefined,
              expectedCommissionPct:
                room.expectedCommissionPct !== "" ? Number(room.expectedCommissionPct) : undefined,
            }))
        : [];

    if (newVacancyType === "MULTIPLE" && normalizedRooms.length === 0) {
      setMessage({ type: "error", text: "Add at least one room for Shared properties." });
      return;
    }

    setCreating(true);
    const result = await createLandlordProperty(landlordId, {
      propertyRef: newPropertyRef.trim() || undefined,
      addressLine1: newAddressLine1.trim() || undefined,
      city: newCity.trim() || undefined,
      postcode: newPostcode.trim() || undefined,
      status: newStatus,
      vacancyType: newVacancyType,
      landlordDemand: newVacancyType === "SINGLE" && newDemand.trim() ? Number(newDemand) : undefined,
      rooms: newVacancyType === "MULTIPLE" ? normalizedRooms : undefined,
    });
    setCreating(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create property." });
      return;
    }

    setNewPropertyRef("");
    setNewAddressLine1("");
    setNewCity("");
    setNewPostcode("");
    setNewDemand("");
    setNewStatus("DRAFT");
    setNewVacancyType("SINGLE");
    setNewRooms([createEmptyRoom(0)]);
    setMessage({ type: "success", text: "Property created." });
    await load();
  }

  async function saveEdit() {
    if (!editId) return;

    const property = properties.find((row) => row.id === editId);
    if (!property) return;

    setEditBusy(true);
    const result = await updateProperty(editId, {
      propertyRef: editPropertyRef.trim(),
      city: editCity.trim() || null,
      postcode: editPostcode.trim() || null,
      status: editStatus,
      landlordDemand:
        (property.vacancyType ?? "SINGLE") === "SINGLE"
          ? editDemand.trim()
            ? Number(editDemand)
            : null
          : null,
    });
    setEditBusy(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update property." });
      return;
    }

    setMessage({ type: "success", text: "Property updated." });
    setEditId(null);
    await load();
  }

  async function submitCloseSale() {
    if (!closingSale) return;

    const finalAmount = Number(closingSale.finalAmount);
    const commissionPct = Number(closingSale.commissionPct);
    const otherCosts = closingSale.otherCosts.trim() ? Number(closingSale.otherCosts) : undefined;

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      setMessage({ type: "error", text: "Final amount must be a positive number." });
      return;
    }

    if (!Number.isFinite(commissionPct) || commissionPct < 0) {
      setMessage({ type: "error", text: "Commission % must be zero or positive." });
      return;
    }

    if (!closingSale.tenantName.trim()) {
      setMessage({ type: "error", text: "Tenant full name is required." });
      return;
    }

    setCloseSaleBusy(true);

    const payload = {
      finalAmount,
      commissionPct,
      otherCosts,
      tenant: {
        fullName: closingSale.tenantName.trim(),
        email: closingSale.tenantEmail.trim() || undefined,
        phone: closingSale.tenantPhone.trim() || undefined,
        currentAddress: closingSale.tenantAddress.trim() || undefined,
        moveInDate: closingSale.tenantMoveInDate || undefined,
        rentAmount: closingSale.tenantRent.trim() ? Number(closingSale.tenantRent) : undefined,
        depositAmount: closingSale.tenantDeposit.trim() ? Number(closingSale.tenantDeposit) : undefined,
        notes: closingSale.tenantNotes.trim() || undefined,
      },
    };

    const result = closingSale.roomId
      ? await closePropertyRoomSale(closingSale.propertyId, closingSale.roomId, payload)
      : await closePropertySale(closingSale.propertyId, payload);

    setCloseSaleBusy(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to close sale." });
      return;
    }

    setClosingSale(null);
    if (closingSale.roomId) {
      const allRoomsClosed = "allRoomsClosed" in result.data && result.data.allRoomsClosed;
      setMessage({
        type: "success",
        text: allRoomsClosed
          ? "Room sale closed. All rooms are closed and property marked Closed."
          : "Room sale closed successfully.",
      });
    } else {
      setMessage({ type: "success", text: "Sale closed and property marked Closed. Tenant details recorded." });
    }
    await load();
  }

  if (loading) {
    return <p className="muted">Loading properties...</p>;
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Landlord Properties</h1>
          <p className="page-subtitle">{landlordLabel}</p>
        </div>
        <div className="inline-row">
          <Link className="btn btn-secondary" href={`/landlords/${landlordId}`}>
            Back to Landlord
          </Link>
          <Link className="btn btn-secondary" href="/landlords">
            Registry
          </Link>
        </div>
      </header>

      {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

      <UICard>
        <UICardBody>
          <form className="field-grid" onSubmit={onCreate}>
            <div className="field-grid-2">
              <label className="field">
                <span className="label">Property Reference (optional)</span>
                <UIInput
                  value={newPropertyRef}
                  onChange={(event) => setNewPropertyRef(event.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </label>
              <label className="field">
                <span className="label">Address Line 1</span>
                <UIInput value={newAddressLine1} onChange={(event) => setNewAddressLine1(event.target.value)} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">City</span>
                <UIInput value={newCity} onChange={(event) => setNewCity(event.target.value)} />
              </label>
              <label className="field">
                <span className="label">Postcode</span>
                <UIInput value={newPostcode} onChange={(event) => setNewPostcode(event.target.value)} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Status</span>
                <UISelect value={newStatus} onChange={(event) => setNewStatus(event.target.value as PropertyStatus)}>
                  <option value="DRAFT">Draft</option>
                  <option value="AVAILABLE">Available</option>
                </UISelect>
              </label>
              <label className="field">
                <span className="label">Property Type</span>
                <UISelect value={newVacancyType} onChange={(e) => setNewVacancyType(e.target.value as VacancyType)}>
                  <option value="SINGLE">Private Property</option>
                  <option value="MULTIPLE">Shared Property</option>
                </UISelect>
              </label>
            </div>

            {newVacancyType === "SINGLE" ? (
              <label className="field">
                <span className="label">Landlord Demand (GBP)</span>
                <UIInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={newDemand}
                  onChange={(event) => setNewDemand(event.target.value)}
                />
              </label>
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
                      {newRooms.map((room, index) => (
                        <tr key={`new-room-${index}`}>
                          <td>
                            <UISelect
                              value={room.roomName}
                              onChange={(e) => updateNewRoom(index, "roomName", e.target.value)}
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
                              onChange={(e) => updateNewRoom(index, "landlordDemand", e.target.value)}
                              placeholder="Optional"
                            />
                          </td>
                          <td>
                            <UIInput
                              type="number"
                              min={0}
                              step="0.1"
                              value={room.expectedCommissionPct}
                              onChange={(e) => updateNewRoom(index, "expectedCommissionPct", e.target.value)}
                              placeholder="Optional"
                            />
                          </td>
                          <td>
                            <UIButton
                              type="button"
                              variant="secondary"
                              onClick={() => removeNewRoom(index)}
                              disabled={newRooms.length <= 1}
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
                  <UIButton type="button" variant="secondary" onClick={addNewRoom}>
                    Add Room Row
                  </UIButton>
                </div>
              </div>
            )}

            <div className="inline-row">
              <UIButton type="submit" disabled={creating}>
                {creating ? "Adding..." : "Add Property"}
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>

      <UICard>
        <UICardBody>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>City / Postcode</th>
                  <th>Demand</th>
                  <th>Closed Sales</th>
                  <th>Rooms</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const editing = editId === property.id;
                  const vacancy = property.vacancyType ?? "SINGLE";
                  const sales = getSales(property);
                  const totalSalesAmount = sales.reduce((sum, sale) => sum + Number(sale.finalAmount ?? 0), 0);
                  const canCloseSale =
                    vacancy === "SINGLE" &&
                    sales.length === 0 &&
                    property.status === "AVAILABLE";

                  return (
                    <tr key={property.id}>
                      <td>
                        {editing ? (
                          <UIInput value={editPropertyRef} onChange={(event) => setEditPropertyRef(event.target.value)} />
                        ) : (
                          property.propertyRef
                        )}
                      </td>
                      <td>
                        <span className={`badge ${vacancy === "MULTIPLE" ? "badge-offer" : "badge-active"}`}>
                          {vacancy === "MULTIPLE" ? "Shared" : "Private"}
                        </span>
                      </td>
                      <td>
                        {editing ? (
                          <UISelect value={editStatus} onChange={(event) => setEditStatus(event.target.value as PropertyStatus)}>
                            <option value="DRAFT">Draft</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="CLOSED" disabled>
                              Closed (auto on sale close)
                            </option>
                          </UISelect>
                        ) : (
                          <span className={`badge ${STATUS_CONFIG[property.status]?.badgeClass ?? "badge-draft"}`}>
                            {STATUS_CONFIG[property.status]?.label ?? property.status}
                          </span>
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <div className="inline-row">
                            <UIInput value={editCity} onChange={(event) => setEditCity(event.target.value)} />
                            <UIInput value={editPostcode} onChange={(event) => setEditPostcode(event.target.value)} />
                          </div>
                        ) : (
                          `${property.city ?? "-"} / ${property.postcode ?? "-"}`
                        )}
                      </td>
                      <td>
                        {vacancy === "MULTIPLE" ? (
                          <span className="muted">Per room</span>
                        ) : editing ? (
                          <UIInput
                            type="number"
                            min={0}
                            step="0.01"
                            value={editDemand}
                            onChange={(event) => setEditDemand(event.target.value)}
                          />
                        ) : property.landlordDemand ? (
                          `\u00A3${property.landlordDemand}`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {sales.length > 0 ? (
                          <div>
                            <strong style={{ color: "#4ade80" }}>{sales.length}</strong>
                            <span className="muted" style={{ marginLeft: "0.35rem" }}>
                              ({'\u00A3'}{Math.round(totalSalesAmount).toLocaleString("en-GB")})
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {vacancy === "MULTIPLE" ? (
                          <div className="room-chip-list">
                            {(property.rooms ?? []).map((room) => {
                              const canCloseRoom =
                                !room.sale &&
                                room.status !== "CLOSED" &&
                                property.status === "AVAILABLE";
                              return (
                                <div key={room.id} className="room-chip">
                                  <div className="room-chip-head">
                                    <strong>{room.roomName}</strong>
                                    <span className={`badge ${roomStatusBadge(room.status)}`}>{room.status}</span>
                                  </div>
                                  <div className="room-chip-sub">
                                    {room.landlordDemand ? `\u00A3${room.landlordDemand}` : "No demand"}{" "}
                                    {room.expectedCommissionPct ? `| ${room.expectedCommissionPct}%` : ""}
                                  </div>
                                  {room.sale ? (
                                    <div className="room-chip-sub">
                                      Sold {'\u00A3'}{Math.round(Number(room.sale.finalAmount)).toLocaleString("en-GB")}
                                    </div>
                                  ) : canCloseRoom ? (
                                    <UIButton
                                      variant="secondary"
                                      onClick={() =>
                                        setClosingSale({
                                          propertyId: property.id,
                                          roomId: room.id,
                                          roomName: room.roomName,
                                          finalAmount: "",
                                          commissionPct: room.expectedCommissionPct ?? "",
                                          otherCosts: "",
                                          tenantName: "",
                                          tenantEmail: "",
                                          tenantPhone: "",
                                          tenantAddress: "",
                                          tenantMoveInDate: "",
                                          tenantRent: "",
                                          tenantDeposit: "",
                                          tenantNotes: "",
                                        })
                                      }
                                    >
                                      Close Room
                                    </UIButton>
                                  ) : null}
                                </div>
                              );
                            })}
                            {(property.rooms ?? []).length === 0 && <span className="muted">No rooms added.</span>}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{formatDate(property.createdAt)}</td>
                      <td>
                        <div className="inline-row">
                          {editing ? (
                            <>
                              <UIButton onClick={() => void saveEdit()} disabled={editBusy}>
                                {editBusy ? "Saving..." : "Save"}
                              </UIButton>
                              <UIButton variant="secondary" onClick={() => setEditId(null)} disabled={editBusy}>
                                Cancel
                              </UIButton>
                            </>
                          ) : (
                            <UIButton
                              variant="secondary"
                              onClick={() => {
                                setEditId(property.id);
                                setEditPropertyRef(property.propertyRef);
                                setEditStatus(property.status);
                                setEditCity(property.city ?? "");
                                setEditPostcode(property.postcode ?? "");
                                setEditDemand(property.landlordDemand ?? "");
                              }}
                            >
                              Edit
                            </UIButton>
                          )}

                          {canCloseSale ? (
                            <UIButton
                              variant="secondary"
                              onClick={() =>
                                setClosingSale({
                                  propertyId: property.id,
                                  finalAmount: "",
                                  commissionPct: property.expectedCommissionPct ?? "",
                                  otherCosts: "",
                                  tenantName: "",
                                  tenantEmail: "",
                                  tenantPhone: "",
                                  tenantAddress: "",
                                  tenantMoveInDate: "",
                                  tenantRent: "",
                                  tenantDeposit: "",
                                  tenantNotes: "",
                                })
                              }
                            >
                              Close Sale
                            </UIButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {properties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="muted">
                      No properties found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="muted">{properties.length} properties listed. Role: {roleLabel}</p>
        </UICardBody>
      </UICard>

      {closingSale ? (
        <UICard>
          <UICardBody>
            <div className="stack">
              <h3 style={{ margin: 0, color: "var(--brand-gold)" }}>
                {closingSale.roomId ? `Close Room Sale (${closingSale.roomName})` : "Close Property Sale"}
              </h3>

              <div className="form-section-divider">
                <span className="form-section-label">Sale Details</span>
              </div>
              <div className="field-grid-2">
                <label className="field">
                  <span className="label">Final Sale Amount (GBP) *</span>
                  <UIInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={closingSale.finalAmount}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, finalAmount: event.target.value } : prev))
                    }
                  />
                </label>
                <label className="field">
                  <span className="label">Commission % *</span>
                  <UIInput
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={closingSale.commissionPct}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, commissionPct: event.target.value } : prev))
                    }
                  />
                </label>
                <label className="field">
                  <span className="label">Other Costs (GBP, optional)</span>
                  <UIInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={closingSale.otherCosts}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, otherCosts: event.target.value } : prev))
                    }
                  />
                </label>
              </div>

              <div className="form-section-divider">
                <span className="form-section-label">Tenant Details</span>
              </div>
              <div className="field-grid-2">
                <label className="field">
                  <span className="label">Tenant Full Name *</span>
                  <UIInput
                    value={closingSale.tenantName}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, tenantName: event.target.value } : prev))
                    }
                    placeholder="Required"
                  />
                </label>
                <label className="field">
                  <span className="label">Tenant Email</span>
                  <UIInput
                    type="email"
                    value={closingSale.tenantEmail}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, tenantEmail: event.target.value } : prev))
                    }
                    placeholder="Optional"
                  />
                </label>
                <label className="field">
                  <span className="label">Tenant Phone</span>
                  <UIInput
                    value={closingSale.tenantPhone}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, tenantPhone: event.target.value } : prev))
                    }
                    placeholder="Optional"
                  />
                </label>
                <label className="field">
                  <span className="label">Move-In Date</span>
                  <UIInput
                    type="date"
                    value={closingSale.tenantMoveInDate}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, tenantMoveInDate: event.target.value } : prev))
                    }
                  />
                </label>
                <label className="field">
                  <span className="label">Monthly Rent (GBP)</span>
                  <UIInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={closingSale.tenantRent}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, tenantRent: event.target.value } : prev))
                    }
                    placeholder="Optional"
                  />
                </label>
                <label className="field">
                  <span className="label">Deposit (GBP)</span>
                  <UIInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={closingSale.tenantDeposit}
                    onChange={(event) =>
                      setClosingSale((prev) => (prev ? { ...prev, tenantDeposit: event.target.value } : prev))
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>
              <label className="field">
                <span className="label">Current Address</span>
                <UIInput
                  value={closingSale.tenantAddress}
                  onChange={(event) =>
                    setClosingSale((prev) => (prev ? { ...prev, tenantAddress: event.target.value } : prev))
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="field">
                <span className="label">Notes</span>
                <UIInput
                  value={closingSale.tenantNotes}
                  onChange={(event) =>
                    setClosingSale((prev) => (prev ? { ...prev, tenantNotes: event.target.value } : prev))
                  }
                  placeholder="Optional"
                />
              </label>

              <div className="inline-row">
                <UIButton onClick={() => void submitCloseSale()} disabled={closeSaleBusy}>
                  {closeSaleBusy ? "Closing..." : "Confirm Close Sale"}
                </UIButton>
                <UIButton variant="secondary" onClick={() => setClosingSale(null)} disabled={closeSaleBusy}>
                  Cancel
                </UIButton>
              </div>
            </div>
          </UICardBody>
        </UICard>
      ) : null}
    </div>
  );
}
