"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import {
  closePropertySale,
  createLandlordProperty,
  fetchLandlordProperties,
  updateProperty,
  type PropertyRow,
  type PropertyStatus,
  type SessionRole,
} from "@/lib/portal-api";

type Props = {
  landlordId: string;
  currentRole: SessionRole;
};

type CloseSaleForm = {
  propertyId: string;
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

  const [editId, setEditId] = useState<string | null>(null);
  const [editPropertyRef, setEditPropertyRef] = useState("");
  const [editStatus, setEditStatus] = useState<PropertyStatus>("DRAFT");
  const [editCity, setEditCity] = useState("");
  const [editPostcode, setEditPostcode] = useState("");
  const [editDemand, setEditDemand] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [closingSale, setClosingSale] = useState<CloseSaleForm | null>(null);
  const [closeSaleBusy, setCloseSaleBusy] = useState(false);

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

    setCreating(true);
    const result = await createLandlordProperty(landlordId, {
      propertyRef: newPropertyRef.trim() || undefined,
      addressLine1: newAddressLine1.trim() || undefined,
      city: newCity.trim() || undefined,
      postcode: newPostcode.trim() || undefined,
      landlordDemand: newDemand.trim() ? (Number(newDemand) as never) : undefined,
      status: newStatus,
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
    setMessage({ type: "success", text: "Property created." });
    await load();
  }

  async function saveEdit() {
    if (!editId) return;

    setEditBusy(true);
    const result = await updateProperty(editId, {
      propertyRef: editPropertyRef.trim(),
      city: editCity.trim() || null,
      postcode: editPostcode.trim() || null,
      status: editStatus,
      landlordDemand: editDemand.trim() ? (Number(editDemand) as never) : null,
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
    const result = await closePropertySale(closingSale.propertyId, {
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
    });
    setCloseSaleBusy(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to close sale." });
      return;
    }

    setClosingSale(null);
    setMessage({ type: "success", text: "Sale closed and property marked SOLD. Tenant details recorded." });
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
            <label className="field">
              <span className="label">City</span>
              <UIInput value={newCity} onChange={(event) => setNewCity(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Postcode</span>
              <UIInput value={newPostcode} onChange={(event) => setNewPostcode(event.target.value)} />
            </label>
            <label className="field">
              <span className="label">Landlord Demand</span>
              <UIInput
                type="number"
                min={0}
                step="0.01"
                value={newDemand}
                onChange={(event) => setNewDemand(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Status</span>
              <UISelect value={newStatus} onChange={(event) => setNewStatus(event.target.value as PropertyStatus)}>
                <option value="DRAFT">DRAFT</option>
                <option value="LIVE">LIVE</option>
                <option value="UNDER_OFFER">UNDER_OFFER</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
              </UISelect>
            </label>

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
                  <th>Status</th>
                  <th>City / Postcode</th>
                  <th>Demand</th>
                  <th>Sale</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const editing = editId === property.id;
                  const canCloseSale =
                    !property.sale &&
                    (property.status === "LIVE" || property.status === "UNDER_OFFER");

                  return (
                    <tr key={property.id}>
                      <td>
                        {editing ? (
                          <UIInput
                            value={editPropertyRef}
                            onChange={(event) => setEditPropertyRef(event.target.value)}
                          />
                        ) : (
                          property.propertyRef
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <UISelect
                            value={editStatus}
                            onChange={(event) => setEditStatus(event.target.value as PropertyStatus)}
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="LIVE">LIVE</option>
                            <option value="UNDER_OFFER">UNDER_OFFER</option>
                            <option value="WITHDRAWN">WITHDRAWN</option>
                            <option value="SOLD" disabled>
                              SOLD (use Close Sale)
                            </option>
                          </UISelect>
                        ) : (
                          property.status
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
                        {editing ? (
                          <UIInput
                            type="number"
                            min={0}
                            step="0.01"
                            value={editDemand}
                            onChange={(event) => setEditDemand(event.target.value)}
                          />
                        ) : property.landlordDemand ? (
                          `£${property.landlordDemand}`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {property.sale ? (
                          <span className="muted">£{property.sale.finalAmount}</span>
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
                    <td colSpan={7} className="muted">
                      No properties found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="muted">{properties.length} properties listed. Role: {currentRole}</p>
        </UICardBody>
      </UICard>

      {closingSale ? (
        <UICard>
          <UICardBody>
            <div className="stack">
              <h3 style={{ margin: 0, color: "var(--gold)" }}>Close Sale</h3>

              <div className="form-section-divider">
                <span className="form-section-label">Sale Details</span>
              </div>
              <div className="field-grid-2">
                <label className="field">
                  <span className="label">Final Sale Amount (£) *</span>
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
                  <span className="label">Other Costs (£, optional)</span>
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
                  <span className="label">Monthly Rent (£)</span>
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
                  <span className="label">Deposit (£)</span>
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
                  placeholder="Tenant's current address (optional)"
                />
              </label>
              <label className="field">
                <span className="label">Notes</span>
                <UIInput
                  value={closingSale.tenantNotes}
                  onChange={(event) =>
                    setClosingSale((prev) => (prev ? { ...prev, tenantNotes: event.target.value } : prev))
                  }
                  placeholder="Any notes about the tenant (optional)"
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
