"use client";

import { useEffect, useRef, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { checkLandlordNumber, createLandlord, createTenant } from "@/lib/portal-api";

type CallRecord = {
  id: string;
  phoneNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  convertedToLandlordId: string | null;
  convertedToTenantId: string | null;
  convertedLandlord: { id: string; landlordName: string } | null;
  convertedTenant: { id: string; fullName: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  CONNECTED: "Connected",
  FAILED: "Failed",
  NO_ANSWER: "No Answer",
  FOLLOW_UP: "Follow Up",
  RESCHEDULED: "Rescheduled",
  VOICEMAIL: "Voicemail",
};

const STATUS_COLORS: Record<string, string> = {
  CONNECTED: "#4ade80",
  FAILED: "var(--danger)",
  NO_ANSWER: "var(--text-muted)",
  FOLLOW_UP: "var(--brand-gold)",
  RESCHEDULED: "#60a5fa",
  VOICEMAIL: "#a78bfa",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

export default function CallRecordsPage() {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Add new record
  const [showAdd, setShowAdd] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addStatus, setAddStatus] = useState("CONNECTED");
  const [addNotes, setAddNotes] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  // Inline status edit
  const [editStatusId, setEditStatusId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  // 3-dot menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Add Landlord modal
  const [landlordModal, setLandlordModal] = useState<{ recordId: string; phone: string } | null>(null);
  const [llName, setLlName] = useState("");
  const [llEmail, setLlEmail] = useState("");
  const [llNotes, setLlNotes] = useState("");
  const [llChecking, setLlChecking] = useState(false);
  const [llChecked, setLlChecked] = useState(false);
  const [llConflict, setLlConflict] = useState<string | null>(null);
  const [llBusy, setLlBusy] = useState(false);
  const [llMsg, setLlMsg] = useState<string | null>(null);

  // Add Tenant modal
  const [tenantModal, setTenantModal] = useState<{ recordId: string; phone: string } | null>(null);
  const [tnName, setTnName] = useState("");
  const [tnEmail, setTnEmail] = useState("");
  const [tnNotes, setTnNotes] = useState("");
  const [tnBusy, setTnBusy] = useState(false);
  const [tnMsg, setTnMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await apiGet<{ records: CallRecord[] }>("/api/call-records");
    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load call records." });
      return;
    }
    setRecords(result.data.records);
  }

  useEffect(() => { void load(); }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleAdd() {
    if (!addPhone.trim()) {
      setMessage({ type: "error", text: "Phone number is required." });
      return;
    }
    setAddBusy(true);
    setMessage(null);
    const result = await apiPost<object, { record: CallRecord }>("/api/call-records", {
      phoneNumber: addPhone.trim(),
      status: addStatus,
      notes: addNotes.trim() || null,
    });
    setAddBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to add call record." });
      return;
    }
    setMessage({ type: "success", text: "Call record added." });
    setShowAdd(false);
    setAddPhone("");
    setAddStatus("CONNECTED");
    setAddNotes("");
    await load();
  }

  async function saveStatus(id: string) {
    setEditBusy(true);
    const result = await apiPatch<object, { record: CallRecord }>(`/api/call-records/${id}`, { status: editStatus });
    setEditBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update status." });
      return;
    }
    setEditStatusId(null);
    await load();
  }

  // ── Add Landlord ──
  function openLandlordModal(record: CallRecord) {
    setMenuOpenId(null);
    setLandlordModal({ recordId: record.id, phone: record.phoneNumber });
    setLlName("");
    setLlEmail("");
    setLlNotes("");
    setLlChecked(false);
    setLlConflict(null);
    setLlMsg(null);
  }

  async function checkLlPhone(phone: string) {
    if (!phone.trim()) return;
    setLlChecking(true);
    setLlConflict(null);
    setLlChecked(false);
    setLlMsg(null);
    const result = await checkLandlordNumber(phone.trim());
    setLlChecking(false);
    if (!result.ok) { setLlMsg("Could not verify phone number."); return; }
    if (result.data.landlordExists) {
      const ll = result.data.landlord;
      setLlConflict(`Already exists: ${ll?.landlordName} (${ll?.ownerAgent?.agentDisplayName ?? "another agent"}).`);
      return;
    }
    setLlChecked(true);
    setLlMsg("Phone available.");
  }

  async function handleAddLandlord() {
    if (!landlordModal || !llName.trim()) return;
    setLlBusy(true);
    const result = await createLandlord({
      fullName: llName.trim(),
      phone: landlordModal.phone,
      email: llEmail.trim() || undefined,
      notes: llNotes.trim() || undefined,
    });
    if (!result.ok) { setLlMsg(result.message ?? "Failed to create landlord."); setLlBusy(false); return; }
    // Link call record to landlord
    await apiPatch(`/api/call-records/${landlordModal.recordId}`, { convertedToLandlordId: result.data.landlord.id });
    setLlBusy(false);
    setLandlordModal(null);
    setMessage({ type: "success", text: `Landlord "${result.data.landlord.landlordName}" created and linked.` });
    await load();
  }

  // ── Add Tenant ──
  function openTenantModal(record: CallRecord) {
    setMenuOpenId(null);
    setTenantModal({ recordId: record.id, phone: record.phoneNumber });
    setTnName("");
    setTnEmail("");
    setTnNotes("");
    setTnMsg(null);
  }

  async function handleAddTenant() {
    if (!tenantModal || !tnName.trim()) { setTnMsg("Full name is required."); return; }
    setTnBusy(true);
    const result = await createTenant({
      fullName: tnName.trim(),
      phone: tenantModal.phone,
      email: tnEmail.trim() || null,
      notes: tnNotes.trim() || null,
    });
    if (!result.ok) { setTnMsg(result.message ?? "Failed to create tenant."); setTnBusy(false); return; }
    // Link call record to tenant
    await apiPatch(`/api/call-records/${tenantModal.recordId}`, { convertedToTenantId: result.data.tenant.id });
    setTnBusy(false);
    setTenantModal(null);
    setMessage({ type: "success", text: `Tenant "${result.data.tenant.fullName}" created and linked.` });
    await load();
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Call Records</h1>
          <p className="page-subtitle">{records.length} call{records.length !== 1 ? "s" : ""} logged.</p>
        </div>
        <UIButton onClick={() => { setShowAdd((v) => !v); setMessage(null); }}>
          {showAdd ? "Cancel" : "+ Log a Call"}
        </UIButton>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      {showAdd && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "1rem" }}>Log New Call</p>
          <div className="field-grid">
            <div className="field-grid-2">
              <label className="field">
                <span className="label">Phone Number <span style={{ color: "var(--danger)" }}>*</span></span>
                <UIInput value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="07911 122233" disabled={addBusy} />
              </label>
              <label className="field">
                <span className="label">Status</span>
                <select
                  className="input"
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value)}
                  disabled={addBusy}
                >
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </label>
            </div>
            <label className="field">
              <span className="label">Notes (optional)</span>
              <UIInput value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Any notes about this call..." disabled={addBusy} />
            </label>
            <div className="inline-row">
              <UIButton onClick={() => void handleAdd()} disabled={addBusy}>{addBusy ? "Saving..." : "Log Call"}</UIButton>
              <UIButton variant="secondary" onClick={() => { setShowAdd(false); setAddPhone(""); setAddStatus("CONNECTED"); setAddNotes(""); }}>Cancel</UIButton>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>All Calls</h2>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>No call records yet.</div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Linked To</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const editingStatus = editStatusId === rec.id;
                  return (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.9rem" }}>
                        {rec.phoneNumber}
                      </td>
                      <td>
                        {editingStatus ? (
                          <div className="inline-row" style={{ gap: "0.4rem" }}>
                            <select
                              className="input"
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.82rem" }}
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              disabled={editBusy}
                            >
                              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                            <UIButton onClick={() => void saveStatus(rec.id)} disabled={editBusy}>
                              {editBusy ? "..." : "Save"}
                            </UIButton>
                            <UIButton variant="secondary" onClick={() => setEditStatusId(null)} disabled={editBusy}>✕</UIButton>
                          </div>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background: `${STATUS_COLORS[rec.status] ?? "var(--text-muted)"}22`,
                              color: STATUS_COLORS[rec.status] ?? "var(--text-muted)",
                              border: `1px solid ${STATUS_COLORS[rec.status] ?? "var(--text-muted)"}44`,
                              cursor: "pointer",
                            }}
                            onClick={() => { setEditStatusId(rec.id); setEditStatus(rec.status); }}
                            title="Click to change status"
                          >
                            {STATUS_LABELS[rec.status] ?? rec.status}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "14rem" }}>
                        {rec.notes ? <span title={rec.notes}>{rec.notes.length > 50 ? rec.notes.slice(0, 50) + "…" : rec.notes}</span> : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rec.convertedLandlord ? (
                          <span style={{ color: "var(--brand-gold)" }}>Landlord: {rec.convertedLandlord.landlordName}</span>
                        ) : rec.convertedTenant ? (
                          <span style={{ color: "#4ade80" }}>Tenant: {rec.convertedTenant.fullName}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fmt(rec.createdAt)}
                      </td>
                      <td style={{ position: "relative" }}>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "1.1rem",
                            lineHeight: 1,
                          }}
                          onClick={() => setMenuOpenId(menuOpenId === rec.id ? null : rec.id)}
                          title="More options"
                        >
                          ⋮
                        </button>
                        {menuOpenId === rec.id && (
                          <div
                            ref={menuRef}
                            style={{
                              position: "absolute",
                              right: "0.5rem",
                              top: "2rem",
                              zIndex: 100,
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                              minWidth: "170px",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              style={menuItemStyle}
                              onClick={() => { setEditStatusId(rec.id); setEditStatus(rec.status); setMenuOpenId(null); }}
                            >
                              Change Status
                            </button>
                            {!rec.convertedToLandlordId && (
                              <button style={menuItemStyle} onClick={() => openLandlordModal(rec)}>
                                Add to Landlords
                              </button>
                            )}
                            {!rec.convertedToTenantId && (
                              <button style={menuItemStyle} onClick={() => openTenantModal(rec)}>
                                Add to Tenants
                              </button>
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
      </div>

      {/* ── Add Landlord Modal ── */}
      {landlordModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>Add to Landlords</h2>
              <button style={closeBtn} onClick={() => setLandlordModal(null)}>✕</button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="label">Phone Number</span>
                <div className="inline-row">
                  <UIInput
                    style={{ flex: 1 }}
                    value={landlordModal.phone}
                    readOnly
                    disabled
                  />
                  <UIButton
                    variant="secondary"
                    onClick={() => void checkLlPhone(landlordModal.phone)}
                    disabled={llChecking || llBusy}
                  >
                    {llChecking ? "Checking..." : "Check"}
                  </UIButton>
                </div>
                <span className="hint-text">Pre-filled from call record. Click Check to verify availability.</span>
              </label>

              {llConflict && <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "0.5rem", background: "#ef444422", borderRadius: 6 }}>{llConflict}</div>}
              {llMsg && !llConflict && <div style={{ color: llChecked ? "#4ade80" : "var(--text-muted)", fontSize: "0.82rem" }}>{llMsg}</div>}

              {llChecked && !llConflict && (
                <>
                  <div className="field-grid-2">
                    <label className="field">
                      <span className="label">Full Name <span style={{ color: "var(--danger)" }}>*</span></span>
                      <UIInput value={llName} onChange={(e) => setLlName(e.target.value)} placeholder="John Smith" disabled={llBusy} />
                    </label>
                    <label className="field">
                      <span className="label">Email (optional)</span>
                      <UIInput type="email" value={llEmail} onChange={(e) => setLlEmail(e.target.value)} placeholder="john@example.com" disabled={llBusy} />
                    </label>
                  </div>
                  <label className="field">
                    <span className="label">Notes (optional)</span>
                    <UIInput value={llNotes} onChange={(e) => setLlNotes(e.target.value)} placeholder="Notes..." disabled={llBusy} />
                  </label>
                </>
              )}

              <div className="inline-row">
                <UIButton onClick={() => void handleAddLandlord()} disabled={!llChecked || !llName.trim() || llBusy || !!llConflict}>
                  {llBusy ? "Creating..." : "Create Landlord"}
                </UIButton>
                <UIButton variant="secondary" onClick={() => setLandlordModal(null)}>Cancel</UIButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Tenant Modal ── */}
      {tenantModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>Add to Tenants</h2>
              <button style={closeBtn} onClick={() => setTenantModal(null)}>✕</button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="label">Phone Number</span>
                <UIInput value={tenantModal.phone} readOnly disabled />
                <span className="hint-text">Pre-filled from call record.</span>
              </label>

              {tnMsg && <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "0.5rem", background: "#ef444422", borderRadius: 6 }}>{tnMsg}</div>}

              <div className="field-grid-2">
                <label className="field">
                  <span className="label">Full Name <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput value={tnName} onChange={(e) => setTnName(e.target.value)} placeholder="Jane Doe" disabled={tnBusy} />
                </label>
                <label className="field">
                  <span className="label">Email (optional)</span>
                  <UIInput type="email" value={tnEmail} onChange={(e) => setTnEmail(e.target.value)} placeholder="jane@example.com" disabled={tnBusy} />
                </label>
              </div>

              <label className="field">
                <span className="label">Notes (optional)</span>
                <UIInput value={tnNotes} onChange={(e) => setTnNotes(e.target.value)} placeholder="Notes..." disabled={tnBusy} />
              </label>

              <div className="inline-row">
                <UIButton onClick={() => void handleAddTenant()} disabled={!tnName.trim() || tnBusy}>
                  {tnBusy ? "Creating..." : "Create Tenant"}
                </UIButton>
                <UIButton variant="secondary" onClick={() => setTenantModal(null)}>Cancel</UIButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
};

const modalStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "1.5rem",
  width: "100%",
  maxWidth: "500px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.65rem 1rem",
  background: "none",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  color: "var(--text)",
  fontSize: "0.85rem",
  borderBottom: "1px solid var(--border)",
};

const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: "1rem",
  padding: "0.25rem",
};
