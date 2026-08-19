"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  createTenant,
  fetchProperties,
  recordViewingOutcome,
  closeSaleForExistingTenant,
  updateTenant,
  type TenantRow,
} from "@/lib/portal-api";
import { apiGet } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

type TenantWithSale = TenantRow & {
  sale?: {
    property: {
      id: string;
      propertyRef: string;
      addressLine1: string | null;
      city: string | null;
      postcode: string | null;
      landlord: { id: string; landlordName: string };
    };
  } | null;
};

type PropertyOption = {
  id: string;
  propertyRef: string;
  title: string | null;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
  vacancyType: "SINGLE" | "MULTIPLE";
  landlord: { id: string; landlordName: string };
};

type ViewingFlowStep =
  | "select_property"
  | "initial_outcome"
  | "initial_fail_reason"
  | "verification_ready"
  | "verification_outcome"
  | "verification_fail_reason"
  | "close_sale";

type ViewingFlowState = {
  step: ViewingFlowStep;
  property?: PropertyOption;
};

// ── Helper ────────────────────────────────────────────────────────────────────

function money(val: string | number | null | undefined) {
  if (!val) return "—";
  const n = Number(val);
  return isNaN(n) ? "—" : `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

const MODAL_OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};

const MODAL_BOX: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem",
  padding: "1.75rem", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  // List state
  const [tenants, setTenants] = useState<TenantWithSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "", email: "", currentAddress: "",
    postcode: "", preferredArea: "", budgetMax: "",
    moveInDate: "", rentAmount: "", depositAmount: "", notes: "",
  });
  const [editBusy, setEditBusy] = useState(false);

  // Add Tenant modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "", phone: "", email: "", currentAddress: "",
    postcode: "", preferredArea: "", budgetMax: "", notes: "",
  });
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Viewing flow
  const [viewingTenant, setViewingTenant] = useState<TenantWithSale | null>(null);
  const [flow, setFlow] = useState<ViewingFlowState | null>(null);
  const [flowMessage, setFlowMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [flowBusy, setFlowBusy] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [closeSaleForm, setCloseSaleForm] = useState({ finalAmount: "", commissionPct: "", depositAmount: "" });

  // Property search
  const [propSearch, setPropSearch] = useState("");
  const [propOptions, setPropOptions] = useState<PropertyOption[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const propSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    query.set("page", String(page));
    query.set("pageSize", String(pageSize));

    const result = await apiGet<{
      tenants: TenantWithSale[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>(`/api/tenants?${query.toString()}`);

    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load tenants." });
      return;
    }
    setTenants(result.data.tenants);
    setTotal(result.data.pagination.total);
    setTotalPages(result.data.pagination.totalPages);
  }, [search, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function startEdit(tenant: TenantWithSale) {
    setEditId(tenant.id);
    setEditForm({
      fullName: tenant.fullName,
      email: tenant.email ?? "",
      currentAddress: tenant.currentAddress ?? "",
      postcode: tenant.postcode ?? "",
      preferredArea: tenant.preferredArea ?? "",
      budgetMax: tenant.budgetMax != null ? String(tenant.budgetMax) : "",
      moveInDate: tenant.moveInDate ? new Date(tenant.moveInDate).toISOString().slice(0, 10) : "",
      rentAmount: tenant.rentAmount ?? "",
      depositAmount: tenant.depositAmount ?? "",
      notes: tenant.notes ?? "",
    });
    setMessage(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setEditBusy(true);
    const result = await updateTenant(editId, {
      fullName: editForm.fullName.trim() || undefined,
      email: editForm.email.trim() || null,
      currentAddress: editForm.currentAddress.trim() || null,
      postcode: editForm.postcode.trim() || null,
      preferredArea: editForm.preferredArea.trim() || null,
      budgetMax: editForm.budgetMax.trim() ? Number(editForm.budgetMax) : null,
      moveInDate: editForm.moveInDate ? new Date(editForm.moveInDate).toISOString() : null,
      rentAmount: editForm.rentAmount.trim() ? Number(editForm.rentAmount) : null,
      depositAmount: editForm.depositAmount.trim() ? Number(editForm.depositAmount) : null,
      notes: editForm.notes.trim() || null,
    });
    setEditBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update tenant." });
      return;
    }
    if (result.data.approvalRequired) {
      setMessage({ type: "success", text: result.data.message ?? "Changes submitted for admin approval." });
      setEditId(null);
      return;
    }
    setMessage({ type: "success", text: "Tenant updated." });
    setEditId(null);
    await load();
  }

  // ── Add Tenant handlers ────────────────────────────────────────────────────

  function openAdd() {
    setAddForm({
      fullName: "", phone: "", email: "", currentAddress: "",
      postcode: "", preferredArea: "", budgetMax: "", notes: "",
    });
    setAddError(null);
    setShowAdd(true);
  }

  async function handleAddTenant() {
    if (!addForm.fullName.trim()) { setAddError("Full name is required."); return; }
    if (!addForm.phone.trim()) { setAddError("Phone number is required."); return; }
    setAddBusy(true);
    setAddError(null);
    const result = await createTenant({
      fullName: addForm.fullName.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim() || null,
      currentAddress: addForm.currentAddress.trim() || null,
      postcode: addForm.postcode.trim() || null,
      preferredArea: addForm.preferredArea.trim() || null,
      budgetMax: addForm.budgetMax.trim() ? Number(addForm.budgetMax) : null,
      notes: addForm.notes.trim() || null,
    });
    setAddBusy(false);
    if (!result.ok) {
      setAddError(result.message ?? "Failed to create tenant.");
      return;
    }
    setShowAdd(false);
    setMessage({ type: "success", text: `Tenant "${result.data.tenant.fullName}" added.` });
    await load();
  }

  // ── Property search for viewing flow ──────────────────────────────────────

  async function searchProperties(term: string) {
    setPropLoading(true);
    const result = await fetchProperties({ search: term || undefined, status: "AVAILABLE", pageSize: 30 });
    setPropLoading(false);
    if (!result.ok) return;
    const filtered = (result.data.properties as unknown as PropertyOption[]).filter(
      (p) => p.vacancyType === "SINGLE",
    );
    setPropOptions(filtered);
  }

  function handlePropSearchChange(val: string) {
    setPropSearch(val);
    if (propSearchTimer.current) clearTimeout(propSearchTimer.current);
    propSearchTimer.current = setTimeout(() => { void searchProperties(val); }, 300);
  }

  // ── Viewing flow handlers ──────────────────────────────────────────────────

  function openViewingFlow(tenant: TenantWithSale) {
    setViewingTenant(tenant);
    setFlow({ step: "select_property" });
    setFlowMessage(null);
    setFailReason("");
    setCloseSaleForm({ finalAmount: "", commissionPct: "", depositAmount: "" });
    setPropSearch("");
    void searchProperties("");
  }

  function closeViewingFlow() {
    setViewingTenant(null);
    setFlow(null);
    setFlowMessage(null);
    setFailReason("");
  }

  function selectProperty(prop: PropertyOption) {
    setFlow({ step: "initial_outcome", property: prop });
    setFlowMessage(null);
  }

  async function handleInitialSuccessful() {
    if (!flow?.property || !viewingTenant) return;
    setFlowBusy(true);
    setFlowMessage(null);
    const result = await recordViewingOutcome({
      propertyId: flow.property.id,
      tenantId: viewingTenant.id,
      status: "SUCCESSFUL",
      viewingType: "INITIAL",
    });
    setFlowBusy(false);
    if (!result.ok) {
      setFlowMessage({ type: "error", text: result.message ?? "Failed to record viewing." });
      return;
    }
    setFlow({ step: "verification_ready", property: flow.property });
  }

  function goToInitialFailReason() {
    if (!flow?.property) return;
    setFailReason("");
    setFlow({ step: "initial_fail_reason", property: flow.property });
    setFlowMessage(null);
  }

  async function handleInitialUnsuccessful() {
    if (!flow?.property || !viewingTenant || !failReason.trim()) {
      setFlowMessage({ type: "error", text: "Please provide a reason." });
      return;
    }
    setFlowBusy(true);
    setFlowMessage(null);
    const result = await recordViewingOutcome({
      propertyId: flow.property.id,
      tenantId: viewingTenant.id,
      status: "UNSUCCESSFUL",
      viewingType: "INITIAL",
      unsuccessfulReason: failReason.trim(),
    });
    setFlowBusy(false);
    if (!result.ok) {
      setFlowMessage({ type: "error", text: result.message ?? "Failed to record viewing." });
      return;
    }
    setFailReason("");
    setPropSearch("");
    void searchProperties("");
    setFlow({ step: "select_property" });
    setFlowMessage({ type: "error", text: "Viewing unsuccessful. Please select a property and try again." });
  }

  function startVerification() {
    if (!flow?.property) return;
    setFlow({ step: "verification_outcome", property: flow.property });
    setFlowMessage(null);
  }

  async function handleVerificationSuccessful() {
    if (!flow?.property || !viewingTenant) return;
    setFlowBusy(true);
    setFlowMessage(null);
    const result = await recordViewingOutcome({
      propertyId: flow.property.id,
      tenantId: viewingTenant.id,
      status: "SUCCESSFUL",
      viewingType: "VERIFICATION",
    });
    setFlowBusy(false);
    if (!result.ok) {
      setFlowMessage({ type: "error", text: result.message ?? "Failed to record verification." });
      return;
    }
    setCloseSaleForm({ finalAmount: "", commissionPct: "", depositAmount: "" });
    setFlow({ step: "close_sale", property: flow.property });
  }

  function goToVerificationFailReason() {
    if (!flow?.property) return;
    setFailReason("");
    setFlow({ step: "verification_fail_reason", property: flow.property });
    setFlowMessage(null);
  }

  async function handleVerificationUnsuccessful() {
    if (!flow?.property || !viewingTenant || !failReason.trim()) {
      setFlowMessage({ type: "error", text: "Please provide a reason." });
      return;
    }
    setFlowBusy(true);
    setFlowMessage(null);
    const result = await recordViewingOutcome({
      propertyId: flow.property.id,
      tenantId: viewingTenant.id,
      status: "UNSUCCESSFUL",
      viewingType: "VERIFICATION",
    });
    setFlowBusy(false);
    if (!result.ok) {
      setFlowMessage({ type: "error", text: result.message ?? "Failed to record verification." });
      return;
    }
    setFailReason("");
    setPropSearch("");
    void searchProperties("");
    setFlow({ step: "select_property" });
    setFlowMessage({ type: "error", text: "Verification unsuccessful. Please select a property and try again." });
  }

  async function handleCloseSale() {
    if (!flow?.property || !viewingTenant) return;
    if (!closeSaleForm.finalAmount || !closeSaleForm.commissionPct) {
      setFlowMessage({ type: "error", text: "Monthly rent and commission % are required." });
      return;
    }
    setFlowBusy(true);
    setFlowMessage(null);
    const result = await closeSaleForExistingTenant(flow.property.id, {
      finalAmount: Number(closeSaleForm.finalAmount),
      commissionPct: Number(closeSaleForm.commissionPct),
      depositAmount: closeSaleForm.depositAmount ? Number(closeSaleForm.depositAmount) : undefined,
      existingTenantId: viewingTenant.id,
    });
    setFlowBusy(false);
    if (!result.ok) {
      setFlowMessage({ type: "error", text: result.message ?? "Failed to close sale." });
      return;
    }
    closeViewingFlow();
    setMessage({
      type: "success",
      text: `Sale closed for ${flow.property.addressLine1 ?? flow.property.propertyRef}. Tenant "${viewingTenant.fullName}" linked.`,
    });
    await load();
  }

  // ── Step progress indicator ────────────────────────────────────────────────

  const STEPS = [
    { key: "select_property", label: "Select Property" },
    { key: "initial_outcome", label: "Initial Viewing" },
    { key: "verification_ready", label: "Verification" },
    { key: "close_sale", label: "Close Sale" },
  ];

  function stepIndex(step: ViewingFlowStep): number {
    if (step === "select_property") return 0;
    if (step === "initial_outcome" || step === "initial_fail_reason") return 1;
    if (step === "verification_ready" || step === "verification_outcome" || step === "verification_fail_reason") return 2;
    if (step === "close_sale") return 3;
    return 0;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">
            {total} tenant {total === 1 ? "record" : "records"}.
            Add tenants manually to book viewings and close sales.
          </p>
        </div>
        <UIButton onClick={openAdd} style={{ color: "var(--brand-gold)", borderColor: "var(--brand-gold)" }}>
          Add Tenant
        </UIButton>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <UIInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, phone, email, property, landlord, agent"
          />
        </label>
      </div>

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>All Tenants</h2>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Loading tenants...
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {search ? "No tenant records match your search." : "No tenant records yet. Add one to get started."}
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Area / Postcode</th>
                  <th>Budget</th>
                  <th>Property</th>
                  <th>Move-In</th>
                  <th>Rent / Deposit</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const editing = editId === tenant.id;
                  const hasSale = !!tenant.saleId;

                  return (
                    <tr key={tenant.id}>
                      <td style={{ fontWeight: 600 }}>
                        {editing ? (
                          <UIInput
                            value={editForm.fullName}
                            onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                            disabled={editBusy}
                          />
                        ) : (
                          <Link href={`/tenants/${tenant.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                            {tenant.fullName}
                          </Link>
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {tenant.phone ?? "—"}
                        <span className="hint-text" style={{ display: "block" }}>read-only</span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {editing ? (
                          <UIInput
                            placeholder="Email"
                            value={editForm.email}
                            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                            disabled={editBusy}
                          />
                        ) : (tenant.email ?? "—")}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {editing ? (
                          <div className="stack" style={{ gap: "0.35rem" }}>
                            <UIInput placeholder="Area" value={editForm.preferredArea} onChange={(e) => setEditForm((p) => ({ ...p, preferredArea: e.target.value }))} disabled={editBusy} />
                            <UIInput placeholder="Postcode" value={editForm.postcode} onChange={(e) => setEditForm((p) => ({ ...p, postcode: e.target.value.toUpperCase() }))} disabled={editBusy} />
                          </div>
                        ) : (
                          [tenant.preferredArea, tenant.postcode].filter(Boolean).join(" · ") || "—"
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {editing ? (
                          <UIInput type="number" min={0} step="0.01" placeholder="Budget" value={editForm.budgetMax} onChange={(e) => setEditForm((p) => ({ ...p, budgetMax: e.target.value }))} disabled={editBusy} />
                        ) : (
                          tenant.budgetMax ? money(tenant.budgetMax) : "—"
                        )}
                      </td>
                      <td>
                        {tenant.sale?.property ? (
                          <>
                            <Link
                              href={`/landlords/${tenant.sale.property.landlord.id}`}
                              style={{ color: "var(--brand-gold)", fontWeight: 600, display: "block" }}
                            >
                              {tenant.sale.property.addressLine1 ?? tenant.sale.property.propertyRef ?? "—"}
                            </Link>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {[tenant.sale.property.city, tenant.sale.property.postcode].filter(Boolean).join(", ")}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>No property yet</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {editing ? (
                          <UIInput
                            type="date"
                            value={editForm.moveInDate}
                            onChange={(e) => setEditForm((p) => ({ ...p, moveInDate: e.target.value }))}
                            disabled={editBusy}
                          />
                        ) : tenant.moveInDate
                          ? new Date(tenant.moveInDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {editing ? (
                          <div className="stack" style={{ gap: "0.35rem" }}>
                            <UIInput type="number" min={0} step="0.01" placeholder="Rent/mo" value={editForm.rentAmount} onChange={(e) => setEditForm((p) => ({ ...p, rentAmount: e.target.value }))} disabled={editBusy} />
                            <UIInput type="number" min={0} step="0.01" placeholder="Deposit" value={editForm.depositAmount} onChange={(e) => setEditForm((p) => ({ ...p, depositAmount: e.target.value }))} disabled={editBusy} />
                          </div>
                        ) : (
                          <>
                            {tenant.rentAmount
                              ? <span style={{ color: "#4ade80", fontWeight: 600 }}>{money(tenant.rentAmount)}/mo</span>
                              : <span className="muted">—</span>}
                            {tenant.depositAmount && (
                              <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                dep: {money(tenant.depositAmount)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "10rem" }}>
                        {editing ? (
                          <UIInput placeholder="Notes" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} disabled={editBusy} />
                        ) : tenant.notes
                          ? <span title={tenant.notes}>{tenant.notes.length > 40 ? tenant.notes.slice(0, 40) + "…" : tenant.notes}</span>
                          : "—"}
                      </td>
                      <td>
                        {editing ? (
                          <div className="inline-row">
                            <UIButton onClick={() => void saveEdit()} disabled={editBusy}>{editBusy ? "Saving..." : "Save"}</UIButton>
                            <UIButton variant="secondary" onClick={() => setEditId(null)} disabled={editBusy}>Cancel</UIButton>
                          </div>
                        ) : (
                          <div className="inline-row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
                            <UIButton variant="secondary" onClick={() => startEdit(tenant)} style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}>
                              Edit
                            </UIButton>
                            {hasSale ? (
                              <span className="badge badge-sold" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>
                                Closed
                              </span>
                            ) : (
                              <UIButton
                                variant="secondary"
                                onClick={() => openViewingFlow(tenant)}
                                style={{
                                  fontSize: "0.78rem", padding: "0.3rem 0.6rem",
                                  color: "var(--brand-gold)", borderColor: "var(--brand-gold)",
                                }}
                              >
                                Viewing
                              </UIButton>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            />
          </div>
        )}
      </div>

      {/* ── Add Tenant Modal ──────────────────────────────────────────────── */}
      {showAdd && (
        <div style={MODAL_OVERLAY}>
          <div style={{ ...MODAL_BOX, maxWidth: "480px" }}>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 700 }}>Add Tenant</h2>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Create a tenant record to start the viewing workflow.
            </p>

            {addError && <UIAlert type="error">{addError}</UIAlert>}

            <div className="field-grid" style={{ marginTop: "0.5rem" }}>
              <div className="field-grid-2">
                <label className="field">
                  <span className="label">Full Name <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput
                    value={addForm.fullName}
                    onChange={(e) => setAddForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Jane Doe"
                    disabled={addBusy}
                  />
                </label>
                <label className="field">
                  <span className="label">Phone <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput
                    value={addForm.phone}
                    onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="07911 122233"
                    disabled={addBusy}
                  />
                </label>
              </div>
              <label className="field">
                <span className="label">Email (optional)</span>
                <UIInput
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane@example.com"
                  disabled={addBusy}
                />
              </label>
              <label className="field">
                <span className="label">Current Address (optional)</span>
                <UIInput
                  value={addForm.currentAddress}
                  onChange={(e) => setAddForm((p) => ({ ...p, currentAddress: e.target.value }))}
                  placeholder="123 Old Road, London"
                  disabled={addBusy}
                />
              </label>
              <div className="field-grid-2">
                <label className="field">
                  <span className="label">Area (optional)</span>
                  <UIInput
                    value={addForm.preferredArea}
                    onChange={(e) => setAddForm((p) => ({ ...p, preferredArea: e.target.value }))}
                    placeholder="e.g. Canary Wharf"
                    disabled={addBusy}
                  />
                </label>
                <label className="field">
                  <span className="label">Post Code (optional)</span>
                  <UIInput
                    value={addForm.postcode}
                    onChange={(e) => setAddForm((p) => ({ ...p, postcode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. E14 5AB"
                    disabled={addBusy}
                  />
                </label>
              </div>
              <label className="field">
                <span className="label">Budget (£ per month, optional)</span>
                <UIInput
                  type="number" min={0} step="0.01"
                  value={addForm.budgetMax}
                  onChange={(e) => setAddForm((p) => ({ ...p, budgetMax: e.target.value }))}
                  placeholder="e.g. 1200"
                  disabled={addBusy}
                />
              </label>
              <label className="field">
                <span className="label">Notes (optional)</span>
                <UIInput
                  value={addForm.notes}
                  onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any notes..."
                  disabled={addBusy}
                />
              </label>

              <div className="inline-row" style={{ marginTop: "0.5rem" }}>
                <UIButton onClick={() => void handleAddTenant()} disabled={addBusy}>
                  {addBusy ? "Adding..." : "Add Tenant"}
                </UIButton>
                <UIButton variant="secondary" onClick={() => setShowAdd(false)} disabled={addBusy}>
                  Cancel
                </UIButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Viewing Flow Modal ────────────────────────────────────────────── */}
      {viewingTenant && flow && (
        <div style={MODAL_OVERLAY}>
          <div style={{ ...MODAL_BOX, maxWidth: "560px" }}>

            {/* Header */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.05rem", fontWeight: 700 }}>
                    Viewing Workflow
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Tenant: <strong style={{ color: "var(--text)" }}>{viewingTenant.fullName}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeViewingFlow}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem", padding: "0.1rem 0.3rem", lineHeight: 1 }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Step progress */}
              <div style={{ display: "flex", gap: "0", marginTop: "1rem", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border)" }}>
                {STEPS.map((s, i) => {
                  const active = i === stepIndex(flow.step);
                  const done = i < stepIndex(flow.step);
                  return (
                    <div
                      key={s.key}
                      style={{
                        flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.7rem", fontWeight: 600, textAlign: "center",
                        background: done ? "rgba(201,168,76,0.15)" : active ? "var(--brand-gold)" : "transparent",
                        color: active ? "#000" : done ? "var(--brand-gold)" : "var(--text-muted)",
                        borderRight: i < STEPS.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      {done ? "✓ " : ""}{s.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {flowMessage && <UIAlert type={flowMessage.type}>{flowMessage.text}</UIAlert>}

            {/* ── Step: Select Property ── */}
            {flow.step === "select_property" && (
              <div>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 600 }}>
                  Select an available property
                </p>
                <UIInput
                  value={propSearch}
                  onChange={(e) => handlePropSearchChange(e.target.value)}
                  placeholder="Search by title, address or postcode..."
                  style={{ marginBottom: "0.75rem" }}
                />
                {propLoading ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    Searching...
                  </div>
                ) : propOptions.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    No available single-vacancy properties found.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
                    {propOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProperty(p)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "0.7rem 0.85rem", borderRadius: "0.5rem",
                          border: "1px solid var(--border)", background: "var(--bg)",
                          cursor: "pointer", transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand-gold)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)", marginBottom: "0.15rem" }}>
                          {p.addressLine1 ?? p.title ?? p.propertyRef}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {[p.city, p.postcode].filter(Boolean).join(", ")}
                          {p.landlord ? ` · ${p.landlord.landlordName}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <UIButton variant="secondary" onClick={closeViewingFlow} style={{ width: "100%", marginTop: "1rem" }}>
                  Cancel
                </UIButton>
              </div>
            )}

            {/* ── Step: Initial Viewing Outcome ── */}
            {flow.step === "initial_outcome" && flow.property && (
              <div>
                <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "var(--brand-gold)" }}>Property</p>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", color: "var(--text)" }}>
                    {flow.property.addressLine1 ?? flow.property.title ?? flow.property.propertyRef}
                  </p>
                  <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {[flow.property.city, flow.property.postcode].filter(Boolean).join(", ")}
                    {flow.property.landlord ? ` · ${flow.property.landlord.landlordName}` : ""}
                  </p>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>How did the initial viewing go?</p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <UIButton
                    onClick={() => void handleInitialSuccessful()}
                    disabled={flowBusy}
                    style={{ flex: 1, background: "var(--success)", borderColor: "var(--success)" }}
                  >
                    {flowBusy ? "Recording..." : "Successful Viewing"}
                  </UIButton>
                  <UIButton
                    variant="secondary"
                    onClick={goToInitialFailReason}
                    disabled={flowBusy}
                    style={{ flex: 1, borderColor: "var(--danger)", color: "var(--danger)" }}
                  >
                    Unsuccessful Viewing
                  </UIButton>
                </div>
                <UIButton
                  variant="secondary"
                  onClick={() => setFlow({ step: "select_property" })}
                  disabled={flowBusy}
                  style={{ width: "100%", marginTop: "0.65rem" }}
                >
                  ← Back to Property Selection
                </UIButton>
              </div>
            )}

            {/* ── Step: Initial Fail Reason ── */}
            {flow.step === "initial_fail_reason" && flow.property && (
              <div>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 600 }}>
                  Reason for unsuccessful viewing
                </p>
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {flow.property.addressLine1 ?? flow.property.propertyRef}
                </p>
                <label className="field">
                  <span className="label">Reason <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput
                    value={failReason}
                    onChange={(e) => setFailReason(e.target.value)}
                    placeholder="e.g. Tenant not interested, property not suitable..."
                    disabled={flowBusy}
                  />
                </label>
                <div className="inline-row" style={{ marginTop: "1rem" }}>
                  <UIButton
                    onClick={() => void handleInitialUnsuccessful()}
                    disabled={flowBusy || !failReason.trim()}
                    style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                  >
                    {flowBusy ? "Recording..." : "Confirm Unsuccessful"}
                  </UIButton>
                  <UIButton
                    variant="secondary"
                    onClick={() => setFlow({ step: "initial_outcome", property: flow.property })}
                    disabled={flowBusy}
                  >
                    Back
                  </UIButton>
                </div>
              </div>
            )}

            {/* ── Step: Verification Ready ── */}
            {flow.step === "verification_ready" && flow.property && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✓</div>
                <h3 style={{ margin: "0 0 0.3rem", fontSize: "1rem", fontWeight: 700, color: "var(--success)" }}>
                  Initial Viewing Successful
                </h3>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {flow.property.addressLine1 ?? flow.property.propertyRef}
                </p>
                <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem" }}>
                  Proceed to the verification viewing to confirm the tenant.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <UIButton
                    onClick={startVerification}
                    style={{ background: "var(--brand-gold)", borderColor: "var(--brand-gold)", color: "#000", fontWeight: 700 }}
                  >
                    Begin Verification
                  </UIButton>
                  <UIButton variant="secondary" onClick={closeViewingFlow} style={{ width: "100%" }}>
                    Done for Now
                  </UIButton>
                </div>
              </div>
            )}

            {/* ── Step: Verification Outcome ── */}
            {flow.step === "verification_outcome" && flow.property && (
              <div>
                <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "var(--brand-gold)" }}>Verification — Property</p>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", color: "var(--text)" }}>
                    {flow.property.addressLine1 ?? flow.property.title ?? flow.property.propertyRef}
                  </p>
                  <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {[flow.property.city, flow.property.postcode].filter(Boolean).join(", ")}
                    {flow.property.landlord ? ` · ${flow.property.landlord.landlordName}` : ""}
                  </p>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>How did the verification viewing go?</p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <UIButton
                    onClick={() => void handleVerificationSuccessful()}
                    disabled={flowBusy}
                    style={{ flex: 1, background: "var(--success)", borderColor: "var(--success)" }}
                  >
                    {flowBusy ? "Recording..." : "Successful Verification"}
                  </UIButton>
                  <UIButton
                    variant="secondary"
                    onClick={goToVerificationFailReason}
                    disabled={flowBusy}
                    style={{ flex: 1, borderColor: "var(--danger)", color: "var(--danger)" }}
                  >
                    Unsuccessful Verification
                  </UIButton>
                </div>
                <UIButton
                  variant="secondary"
                  onClick={() => setFlow({ step: "verification_ready", property: flow.property })}
                  disabled={flowBusy}
                  style={{ width: "100%", marginTop: "0.65rem" }}
                >
                  ← Back
                </UIButton>
              </div>
            )}

            {/* ── Step: Verification Fail Reason ── */}
            {flow.step === "verification_fail_reason" && flow.property && (
              <div>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 600 }}>
                  Reason for unsuccessful verification
                </p>
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {flow.property.addressLine1 ?? flow.property.propertyRef}
                </p>
                <label className="field">
                  <span className="label">Reason <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput
                    value={failReason}
                    onChange={(e) => setFailReason(e.target.value)}
                    placeholder="e.g. Tenant changed mind, references failed..."
                    disabled={flowBusy}
                  />
                </label>
                <div className="inline-row" style={{ marginTop: "1rem" }}>
                  <UIButton
                    onClick={() => void handleVerificationUnsuccessful()}
                    disabled={flowBusy || !failReason.trim()}
                    style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                  >
                    {flowBusy ? "Recording..." : "Confirm Unsuccessful"}
                  </UIButton>
                  <UIButton
                    variant="secondary"
                    onClick={() => setFlow({ step: "verification_outcome", property: flow.property })}
                    disabled={flowBusy}
                  >
                    Back
                  </UIButton>
                </div>
              </div>
            )}

            {/* ── Step: Close Sale ── */}
            {flow.step === "close_sale" && flow.property && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>🎉</div>
                  <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--success)" }}>
                    Verification Successful!
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Ready to close the sale.
                  </p>
                </div>

                {/* Sale summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  {[
                    { label: "Property", value: flow.property.addressLine1 ?? flow.property.propertyRef },
                    { label: "Tenant", value: viewingTenant.fullName },
                    { label: "Landlord", value: flow.property.landlord?.landlordName ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: "0.6rem 0.75rem", borderRadius: "0.4rem", background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "var(--text)", fontWeight: 600, wordBreak: "break-word" }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="form-section-divider"><span className="form-section-label">Sale Details</span></div>

                <div className="field-grid" style={{ marginTop: "0.75rem" }}>
                  <div className="field-grid-2">
                    <label className="field">
                      <span className="label">Monthly Rent (£) <span style={{ color: "var(--danger)" }}>*</span></span>
                      <UIInput
                        type="number" min={0} step="0.01"
                        value={closeSaleForm.finalAmount}
                        onChange={(e) => setCloseSaleForm((p) => ({ ...p, finalAmount: e.target.value }))}
                        placeholder="e.g. 900"
                        disabled={flowBusy}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Commission % <span style={{ color: "var(--danger)" }}>*</span></span>
                      <UIInput
                        type="number" min={0} max={100} step="0.1"
                        value={closeSaleForm.commissionPct}
                        onChange={(e) => setCloseSaleForm((p) => ({ ...p, commissionPct: e.target.value }))}
                        placeholder="e.g. 10"
                        disabled={flowBusy}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span className="label">Deposit (£) (optional)</span>
                    <UIInput
                      type="number" min={0} step="0.01"
                      value={closeSaleForm.depositAmount}
                      onChange={(e) => setCloseSaleForm((p) => ({ ...p, depositAmount: e.target.value }))}
                      placeholder="e.g. 1200"
                      disabled={flowBusy}
                    />
                  </label>

                  {closeSaleForm.finalAmount && closeSaleForm.commissionPct && (
                    <div style={{ padding: "0.6rem 0.85rem", borderRadius: "0.4rem", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", fontSize: "0.82rem" }}>
                      Commission: <strong style={{ color: "var(--brand-gold)" }}>
                        £{(Number(closeSaleForm.finalAmount) * Number(closeSaleForm.commissionPct) / 100).toFixed(2)}
                      </strong>
                    </div>
                  )}

                  <div className="inline-row" style={{ marginTop: "0.5rem" }}>
                    <UIButton
                      onClick={() => void handleCloseSale()}
                      disabled={flowBusy || !closeSaleForm.finalAmount || !closeSaleForm.commissionPct}
                      style={{ background: "var(--brand-gold)", borderColor: "var(--brand-gold)", color: "#000", fontWeight: 700 }}
                    >
                      {flowBusy ? "Closing Sale..." : "Confirm Close Sale"}
                    </UIButton>
                    <UIButton variant="secondary" onClick={closeViewingFlow} disabled={flowBusy}>
                      Cancel
                    </UIButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
