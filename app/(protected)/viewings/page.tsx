"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIInput } from "@/components/ui/input";
import { UIButton } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  fetchViewings,
  markViewingSuccessful,
  markViewingUnsuccessful,
  rescheduleViewing,
  type ViewingRow,
  type ViewingStatus,
} from "@/lib/portal-api";

type ModalState =
  | { mode: "outcome"; viewing: ViewingRow }
  | { mode: "unsuccessful_reason"; viewing: ViewingRow }
  | { mode: "reschedule"; viewing: ViewingRow }
  | { mode: "after_success"; viewing: ViewingRow };

const STATUS_LABELS: Record<ViewingStatus, string> = {
  SCHEDULED: "Scheduled",
  SUCCESSFUL: "Successful",
  UNSUCCESSFUL: "Unsuccessful",
};

const STATUS_COLORS: Record<ViewingStatus, string> = {
  SCHEDULED: "var(--brand-gold)",
  SUCCESSFUL: "var(--success)",
  UNSUCCESSFUL: "var(--danger)",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ViewingStatusBadge({ status }: { status: ViewingStatus }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.55rem",
      borderRadius: "0.35rem",
      fontSize: "0.73rem",
      fontWeight: 600,
      background: `${STATUS_COLORS[status]}22`,
      color: STATUS_COLORS[status],
      border: `1px solid ${STATUS_COLORS[status]}44`,
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function AgentViewingsPage() {
  const [viewings, setViewings] = useState<ViewingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<ViewingStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [failReason, setFailReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchViewings({
      status: filterStatus || undefined,
      page,
      pageSize,
    });
    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load viewings." });
      return;
    }
    setViewings(result.data.viewings);
    setTotal(result.data.pagination.total);
    setTotalPages(result.data.pagination.totalPages);
  }, [page, pageSize, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  async function handleMarkSuccessful(viewing: ViewingRow) {
    setBusy(true);
    const result = await markViewingSuccessful(viewing.id);
    setBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed." });
      return;
    }
    setModal({ mode: "after_success", viewing: result.data.viewing });
    void load();
  }

  async function handleMarkUnsuccessful() {
    if (modal?.mode !== "unsuccessful_reason") return;
    if (!failReason.trim()) {
      setMessage({ type: "error", text: "Please enter a reason." });
      return;
    }
    setBusy(true);
    const result = await markViewingUnsuccessful(modal.viewing.id, failReason.trim());
    setBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed." });
      return;
    }
    setFailReason("");
    setModal({ mode: "reschedule", viewing: result.data.viewing });
    void load();
  }

  async function handleReschedule() {
    if (!modal || (modal.mode !== "reschedule" && modal.mode !== "after_success")) return;
    if (!rescheduleDate) {
      setMessage({ type: "error", text: "Please select a date and time." });
      return;
    }
    setBusy(true);
    const result = await rescheduleViewing(modal.viewing.id, new Date(rescheduleDate).toISOString());
    setBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed." });
      return;
    }
    setRescheduleDate("");
    setModal(null);
    setMessage({ type: "success", text: `Viewing rescheduled for ${formatDateTime(result.data.viewing.scheduledAt)}.` });
    void load();
  }

  const byStatus = viewings.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Viewings</h1>
          <p className="page-subtitle">{total} viewing {total === 1 ? "record" : "records"}.</p>
        </div>
        <Link className="btn btn-primary" href="/properties">
          Go to Properties
        </Link>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      {/* Filter */}
      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <span className="label" style={{ margin: 0 }}>Filter by status:</span>
          {(["", "SCHEDULED", "SUCCESSFUL", "UNSUCCESSFUL"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${filterStatus === s ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}
              onClick={() => { setFilterStatus(s); setPage(1); }}
            >
              {s === "" ? "All" : STATUS_LABELS[s as ViewingStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {total > 0 && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>Summary</p>
          <div className="status-breakdown">
            {(["SCHEDULED", "SUCCESSFUL", "UNSUCCESSFUL"] as ViewingStatus[]).map((s) => (
              <div key={s} className="status-item" style={{ borderColor: `${STATUS_COLORS[s]}44` }}>
                <p className="status-item-count" style={{ color: STATUS_COLORS[s] }}>{byStatus[s] ?? 0}</p>
                <p className="status-item-label">{STATUS_LABELS[s]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>All Viewings</h2>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : viewings.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            No viewings yet. Start a viewing workflow from the{" "}
            <Link href="/tenants" style={{ color: "var(--brand-gold)" }}>Tenants</Link> page.
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Scheduled For</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {viewings.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link
                        href={`/properties/${v.propertyId}`}
                        style={{ fontWeight: 600, color: "var(--brand-gold)", textDecoration: "none" }}
                      >
                        {v.property.addressLine1 ?? v.property.propertyRef}
                      </Link>
                      {v.property.city && (
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {[v.property.city, v.property.postcode].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{formatDateTime(v.scheduledAt)}</td>
                    <td><ViewingStatusBadge status={v.status} /></td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: 200 }}>
                      {v.unsuccessfulReason ?? "—"}
                    </td>
                    <td>
                      {v.status === "SCHEDULED" && (
                        <div className="inline-row">
                          <UIButton
                            variant="secondary"
                            onClick={() => setModal({ mode: "outcome", viewing: v })}
                            style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                          >
                            Set Outcome
                          </UIButton>
                        </div>
                      )}
                      {v.status === "SUCCESSFUL" && (
                        <UIButton
                          variant="secondary"
                          onClick={() => { setRescheduleDate(""); setModal({ mode: "reschedule", viewing: v }); }}
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                        >
                          Reschedule
                        </UIButton>
                      )}
                      {v.status === "UNSUCCESSFUL" && (
                        <UIButton
                          variant="secondary"
                          onClick={() => { setRescheduleDate(""); setModal({ mode: "reschedule", viewing: v }); }}
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                        >
                          Reschedule
                        </UIButton>
                      )}
                    </td>
                  </tr>
                ))}
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
              busy={loading}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem",
            padding: "1.75rem", width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto",
          }}>
            {modal.mode === "outcome" && (
              <>
                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 700 }}>Viewing Outcome</h2>
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {modal.viewing.property.addressLine1 ?? modal.viewing.property.propertyRef}
                </p>
                <p style={{ margin: "0 0 1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Scheduled: {formatDateTime(modal.viewing.scheduledAt)}
                </p>
                {message && <UIAlert type={message.type}>{message.text}</UIAlert>}
                <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>How did the viewing go?</p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <UIButton
                    onClick={() => void handleMarkSuccessful(modal.viewing)}
                    disabled={busy}
                    style={{ background: "var(--success)", borderColor: "var(--success)", flex: 1 }}
                  >
                    {busy ? "Saving..." : "Successful"}
                  </UIButton>
                  <UIButton
                    variant="secondary"
                    onClick={() => { setFailReason(""); setModal({ mode: "unsuccessful_reason", viewing: modal.viewing }); }}
                    disabled={busy}
                    style={{ borderColor: "var(--danger)", color: "var(--danger)", flex: 1 }}
                  >
                    Unsuccessful
                  </UIButton>
                </div>
                <UIButton variant="secondary" onClick={() => setModal(null)} style={{ width: "100%", marginTop: "0.75rem" }}>
                  Cancel
                </UIButton>
              </>
            )}

            {modal.mode === "unsuccessful_reason" && (
              <>
                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 700 }}>Viewing Unsuccessful</h2>
                <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {modal.viewing.property.addressLine1 ?? modal.viewing.property.propertyRef}
                </p>
                {message && <UIAlert type={message.type}>{message.text}</UIAlert>}
                <label className="field">
                  <span className="label">Reason <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput
                    value={failReason}
                    onChange={(e) => setFailReason(e.target.value)}
                    placeholder="e.g. Tenant not interested, property not suitable..."
                    disabled={busy}
                  />
                </label>
                <div className="inline-row" style={{ marginTop: "1rem" }}>
                  <UIButton
                    onClick={() => void handleMarkUnsuccessful()}
                    disabled={busy}
                    style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                  >
                    {busy ? "Saving..." : "Confirm"}
                  </UIButton>
                  <UIButton variant="secondary" onClick={() => setModal({ mode: "outcome", viewing: modal.viewing })} disabled={busy}>
                    Back
                  </UIButton>
                </div>
              </>
            )}

            {modal.mode === "reschedule" && (
              <>
                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 700 }}>Reschedule Viewing</h2>
                <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {modal.viewing.property.addressLine1 ?? modal.viewing.property.propertyRef}
                </p>
                {message && <UIAlert type={message.type}>{message.text}</UIAlert>}
                <label className="field">
                  <span className="label">New Date &amp; Time <span style={{ color: "var(--danger)" }}>*</span></span>
                  <UIInput
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className="inline-row" style={{ marginTop: "1rem" }}>
                  <UIButton onClick={() => void handleReschedule()} disabled={busy || !rescheduleDate}>
                    {busy ? "Rescheduling..." : "Reschedule"}
                  </UIButton>
                  <UIButton variant="secondary" onClick={() => { setModal(null); setMessage(null); }} disabled={busy}>
                    Cancel
                  </UIButton>
                </div>
              </>
            )}

            {modal.mode === "after_success" && (
              <>
                <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
                  <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 700 }}>Viewing Successful!</h2>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {modal.viewing.property.addressLine1 ?? modal.viewing.property.propertyRef}
                  </p>
                </div>
                {message && <UIAlert type={message.type}>{message.text}</UIAlert>}
                <p style={{ fontSize: "0.9rem", marginBottom: "1rem", textAlign: "center" }}>What would you like to do next?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <Link
                    href={`/properties/${modal.viewing.propertyId}`}
                    className="btn btn-primary"
                    style={{ textAlign: "center" }}
                    onClick={() => setModal(null)}
                  >
                    Close Sale (go to Property)
                  </Link>
                  <UIButton
                    variant="secondary"
                    onClick={() => { setRescheduleDate(""); setModal({ mode: "reschedule", viewing: modal.viewing }); }}
                    style={{ width: "100%" }}
                  >
                    Reschedule Viewing
                  </UIButton>
                  <UIButton variant="secondary" onClick={() => { setModal(null); setMessage(null); }} style={{ width: "100%" }}>
                    Done
                  </UIButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
