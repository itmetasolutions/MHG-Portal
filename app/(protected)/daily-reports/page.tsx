"use client";

import { useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api-client";

type DailyReport = {
  id: string;
  reportDate: string;
  callsMade: number;
  callsConnected: number;
  callsFailed: number;
  landlordConfirm: number;
  viewingsArranged: number;
  successfulViewings: number;
  followUp: number;
  reSchedule: number;
  notes: string | null;
  createdAt: string;
};

const emptyForm = {
  reportDate: new Date().toISOString().slice(0, 10),
  callsMade: "",
  callsConnected: "",
  callsFailed: "",
  landlordConfirm: "",
  viewingsArranged: "",
  successfulViewings: "",
  followUp: "",
  reSchedule: "",
  notes: "",
};

export default function DailyReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const result = await apiGet<{ reports: DailyReport[] }>("/api/daily-reports");
    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load reports." });
      return;
    }
    setReports(result.data.reports);
  }

  useEffect(() => { void load(); }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.reportDate) {
      setMessage({ type: "error", text: "Report date is required." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await apiPost<object, { report: DailyReport }>("/api/daily-reports", {
      reportDate: form.reportDate,
      callsMade: Number(form.callsMade) || 0,
      callsConnected: Number(form.callsConnected) || 0,
      callsFailed: Number(form.callsFailed) || 0,
      landlordConfirm: Number(form.landlordConfirm) || 0,
      viewingsArranged: Number(form.viewingsArranged) || 0,
      successfulViewings: Number(form.successfulViewings) || 0,
      followUp: Number(form.followUp) || 0,
      reSchedule: Number(form.reSchedule) || 0,
      notes: form.notes.trim() || null,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to submit report." });
      return;
    }
    setMessage({ type: "success", text: "Daily report submitted." });
    setShowForm(false);
    setForm(emptyForm);
    await load();
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Daily Reports</h1>
          <p className="page-subtitle">{reports.length} report{reports.length !== 1 ? "s" : ""} submitted.</p>
        </div>
        <UIButton onClick={() => { setShowForm((v) => !v); setMessage(null); }}>
          {showForm ? "Cancel" : "+ Submit Today&#39;s Report"}
        </UIButton>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      {showForm && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "1rem" }}>New Daily Report</p>

          <div className="field-grid">
            <label className="field">
              <span className="label">Report Date <span style={{ color: "var(--danger)" }}>*</span></span>
              <UIInput type="date" value={form.reportDate} onChange={(e) => setField("reportDate", e.target.value)} disabled={busy} />
            </label>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Calls Made</span>
                <UIInput type="number" min={0} value={form.callsMade} onChange={(e) => setField("callsMade", e.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Calls Connected</span>
                <UIInput type="number" min={0} value={form.callsConnected} onChange={(e) => setField("callsConnected", e.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Calls Failed</span>
                <UIInput type="number" min={0} value={form.callsFailed} onChange={(e) => setField("callsFailed", e.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Landlord Confirmed</span>
                <UIInput type="number" min={0} value={form.landlordConfirm} onChange={(e) => setField("landlordConfirm", e.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Viewings Arranged</span>
                <UIInput type="number" min={0} value={form.viewingsArranged} onChange={(e) => setField("viewingsArranged", e.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Successful Viewings</span>
                <UIInput type="number" min={0} value={form.successfulViewings} onChange={(e) => setField("successfulViewings", e.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Follow Up</span>
                <UIInput type="number" min={0} value={form.followUp} onChange={(e) => setField("followUp", e.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Re-Schedule</span>
                <UIInput type="number" min={0} value={form.reSchedule} onChange={(e) => setField("reSchedule", e.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <label className="field">
              <span className="label">Notes (optional)</span>
              <UIInput value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any additional notes..." disabled={busy} />
            </label>

            <div className="inline-row">
              <UIButton onClick={() => void handleSubmit()} disabled={busy}>{busy ? "Submitting..." : "Submit Report"}</UIButton>
              <UIButton variant="secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancel</UIButton>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>Previous Reports</h2>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>No reports submitted yet.</div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Calls Made</th>
                  <th>Connected</th>
                  <th>Failed</th>
                  <th>Landlord Confirm</th>
                  <th>Viewings Arranged</th>
                  <th>Successful Viewings</th>
                  <th>Follow Up</th>
                  <th>Re-Schedule</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(r.reportDate)}</td>
                    <td style={{ textAlign: "center" }}>{r.callsMade}</td>
                    <td style={{ textAlign: "center", color: "#4ade80", fontWeight: 600 }}>{r.callsConnected}</td>
                    <td style={{ textAlign: "center", color: "var(--danger)" }}>{r.callsFailed}</td>
                    <td style={{ textAlign: "center", color: "var(--brand-gold)", fontWeight: 600 }}>{r.landlordConfirm}</td>
                    <td style={{ textAlign: "center" }}>{r.viewingsArranged}</td>
                    <td style={{ textAlign: "center", color: "#4ade80" }}>{r.successfulViewings}</td>
                    <td style={{ textAlign: "center" }}>{r.followUp}</td>
                    <td style={{ textAlign: "center" }}>{r.reSchedule}</td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "14rem" }}>
                      {r.notes ? <span title={r.notes}>{r.notes.length > 60 ? r.notes.slice(0, 60) + "…" : r.notes}</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
