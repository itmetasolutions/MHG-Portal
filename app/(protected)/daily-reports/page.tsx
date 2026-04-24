"use client";

import { useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { UISelect } from "@/components/ui/select";
import { apiGet, apiPost } from "@/lib/api-client";

type DialingArea = "AREA_1" | "AREA_2" | "AREA_3" | "AREA_4" | "AREA_5";

type DailyReport = {
  id: string;
  reportDate: string;
  dialingArea: DialingArea | null;
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
  dialingArea: "AREA_1" as DialingArea,
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

const DIALING_AREA_OPTIONS: Array<{ value: DialingArea; label: string }> = [
  { value: "AREA_1", label: "Area 1" },
  { value: "AREA_2", label: "Area 2" },
  { value: "AREA_3", label: "Area 3" },
  { value: "AREA_4", label: "Area 4" },
  { value: "AREA_5", label: "Area 5" },
];

function formatDialingArea(value: DialingArea | null) {
  return value ? value.replace("_", " ") : "—";
}

export default function DailyReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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

  useEffect(() => {
    void load();
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      dialingArea: form.dialingArea,
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
    setPage(1);
    await load();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (!query) return true;
      return [
        formatDate(report.reportDate).toLowerCase(),
        formatDialingArea(report.dialingArea).toLowerCase(),
        report.notes?.toLowerCase() ?? "",
      ].some((value) => value.includes(query));
    });
  }, [reports, search]);

  const total = filteredReports.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const paginatedReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Daily Reports</h1>
          <p className="page-subtitle">{reports.length} report{reports.length !== 1 ? "s" : ""} submitted.</p>
        </div>
        <UIButton
          onClick={() => {
            setShowForm((value) => !value);
            setMessage(null);
          }}
        >
          {showForm ? "Cancel" : "+ Submit Today's Report"}
        </UIButton>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      {showForm && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "1rem" }}>New Daily Report</p>

          <div className="field-grid">
            <label className="field">
              <span className="label">Report Date <span style={{ color: "var(--danger)" }}>*</span></span>
              <UIInput
                type="date"
                value={form.reportDate}
                onChange={(event) => setField("reportDate", event.target.value)}
                disabled={busy}
              />
            </label>

            <label className="field">
              <span className="label">Dialing Area</span>
              <UISelect
                value={form.dialingArea}
                onChange={(event) => setField("dialingArea", event.target.value)}
                disabled={busy}
              >
                {DIALING_AREA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </UISelect>
            </label>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Calls Made</span>
                <UIInput type="number" min={0} value={form.callsMade} onChange={(event) => setField("callsMade", event.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Calls Connected</span>
                <UIInput type="number" min={0} value={form.callsConnected} onChange={(event) => setField("callsConnected", event.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Calls Failed</span>
                <UIInput type="number" min={0} value={form.callsFailed} onChange={(event) => setField("callsFailed", event.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Landlord Confirmed</span>
                <UIInput type="number" min={0} value={form.landlordConfirm} onChange={(event) => setField("landlordConfirm", event.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Viewings Arranged</span>
                <UIInput type="number" min={0} value={form.viewingsArranged} onChange={(event) => setField("viewingsArranged", event.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Successful Viewings</span>
                <UIInput type="number" min={0} value={form.successfulViewings} onChange={(event) => setField("successfulViewings", event.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span className="label">Follow Up</span>
                <UIInput type="number" min={0} value={form.followUp} onChange={(event) => setField("followUp", event.target.value)} placeholder="0" disabled={busy} />
              </label>
              <label className="field">
                <span className="label">Re-Schedule</span>
                <UIInput type="number" min={0} value={form.reSchedule} onChange={(event) => setField("reSchedule", event.target.value)} placeholder="0" disabled={busy} />
              </label>
            </div>

            <label className="field">
              <span className="label">Notes (optional)</span>
              <UIInput value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Any additional notes..." disabled={busy} />
            </label>

            <div className="inline-row">
              <UIButton onClick={() => void handleSubmit()} disabled={busy}>
                {busy ? "Submitting..." : "Submit Report"}
              </UIButton>
              <UIButton variant="secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                Cancel
              </UIButton>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>Previous Reports</h2>
          <UIInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by date, area, or notes"
            style={{ minWidth: "260px", maxWidth: "360px" }}
          />
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>No reports submitted yet.</div>
        ) : (
          <div className="stack" style={{ paddingBottom: "1rem" }}>
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Dialing Area</th>
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
                  {paginatedReports.map((report) => (
                    <tr key={report.id}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(report.reportDate)}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{formatDialingArea(report.dialingArea)}</td>
                      <td style={{ textAlign: "center" }}>{report.callsMade}</td>
                      <td style={{ textAlign: "center", color: "#4ade80", fontWeight: 600 }}>{report.callsConnected}</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>{report.callsFailed}</td>
                      <td style={{ textAlign: "center", color: "var(--brand-gold)", fontWeight: 600 }}>{report.landlordConfirm}</td>
                      <td style={{ textAlign: "center" }}>{report.viewingsArranged}</td>
                      <td style={{ textAlign: "center", color: "#4ade80" }}>{report.successfulViewings}</td>
                      <td style={{ textAlign: "center" }}>{report.followUp}</td>
                      <td style={{ textAlign: "center" }}>{report.reSchedule}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "14rem" }}>
                        {report.notes ? (
                          <span title={report.notes}>{report.notes.length > 60 ? `${report.notes.slice(0, 60)}...` : report.notes}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "0 1.25rem" }}>
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
