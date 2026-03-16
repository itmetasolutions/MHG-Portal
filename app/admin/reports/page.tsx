"use client";

import { useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIInput } from "@/components/ui/input";
import { apiGet } from "@/lib/api-client";

type Agent = { id: string; agentDisplayName: string; email: string };

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
  agent: Agent;
};

type CallRecord = {
  id: string;
  phoneNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
  convertedToLandlordId: string | null;
  convertedToTenantId: string | null;
  convertedLandlord: { id: string; landlordName: string } | null;
  convertedTenant: { id: string; fullName: string } | null;
  agent: Agent;
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

export default function AdminReportsPage() {
  const [tab, setTab] = useState<"daily" | "calls">("daily");
  const [agents, setAgents] = useState<Agent[]>([]);

  // Filters
  const [agentId, setAgentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [callStatus, setCallStatus] = useState("");

  // Data
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agents for filter dropdown
  useEffect(() => {
    apiGet<{ users: Agent[] }>("/api/admin/users").then((res) => {
      if (res.ok) setAgents(res.data.users);
    });
  }, []);

  async function loadDailyReports() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (agentId) params.set("agentId", agentId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const result = await apiGet<{ reports: DailyReport[] }>(`/api/admin/daily-reports?${params}`);
    setLoading(false);
    if (!result.ok) { setError(result.message ?? "Failed to load daily reports."); return; }
    setDailyReports(result.data.reports);
  }

  async function loadCallRecords() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (agentId) params.set("agentId", agentId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (callStatus) params.set("status", callStatus);
    const result = await apiGet<{ records: CallRecord[] }>(`/api/admin/call-records?${params}`);
    setLoading(false);
    if (!result.ok) { setError(result.message ?? "Failed to load call records."); return; }
    setCallRecords(result.data.records);
  }

  useEffect(() => {
    if (tab === "daily") void loadDailyReports();
    else void loadCallRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function applyFilters() {
    if (tab === "daily") void loadDailyReports();
    else void loadCallRecords();
  }

  function resetFilters() {
    setAgentId("");
    setDateFrom("");
    setDateTo("");
    setCallStatus("");
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  // Totals for daily reports
  const totals = dailyReports.reduce(
    (acc, r) => ({
      callsMade: acc.callsMade + r.callsMade,
      callsConnected: acc.callsConnected + r.callsConnected,
      callsFailed: acc.callsFailed + r.callsFailed,
      landlordConfirm: acc.landlordConfirm + r.landlordConfirm,
      viewingsArranged: acc.viewingsArranged + r.viewingsArranged,
      successfulViewings: acc.successfulViewings + r.successfulViewings,
      followUp: acc.followUp + r.followUp,
      reSchedule: acc.reSchedule + r.reSchedule,
    }),
    { callsMade: 0, callsConnected: 0, callsFailed: 0, landlordConfirm: 0, viewingsArranged: 0, successfulViewings: 0, followUp: 0, reSchedule: 0 },
  );

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Agent Reports</h1>
          <p className="page-subtitle">Daily task reports and call data from all agents.</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {(["daily", "calls"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--brand-gold)" : "2px solid transparent",
              color: tab === t ? "var(--brand-gold)" : "var(--text-muted)",
              fontWeight: tab === t ? 700 : 400,
              padding: "0.6rem 1.1rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              marginBottom: "-1px",
              transition: "color 0.15s",
            }}
          >
            {t === "daily" ? "Daily Task Reports" : "Calls Data"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="field" style={{ minWidth: "180px", flex: "1 1 180px" }}>
            <span className="label">Agent</span>
            <select className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">All Agents</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.agentDisplayName}</option>)}
            </select>
          </label>

          <label className="field" style={{ minWidth: "140px" }}>
            <span className="label">Date From</span>
            <UIInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>

          <label className="field" style={{ minWidth: "140px" }}>
            <span className="label">Date To</span>
            <UIInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>

          {tab === "calls" && (
            <label className="field" style={{ minWidth: "150px" }}>
              <span className="label">Call Status</span>
              <select className="input" value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          )}

          <div style={{ display: "flex", gap: "0.5rem", paddingBottom: "0.15rem" }}>
            <button className="btn btn-primary btn-sm" onClick={applyFilters} disabled={loading}>
              {loading ? "Loading..." : "Apply"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { resetFilters(); }}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && <UIAlert type="error">{error}</UIAlert>}

      {/* ── Daily Task Reports Tab ── */}
      {tab === "daily" && (
        <div className="stack">
          {/* Summary cards */}
          {dailyReports.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
              {[
                { label: "Calls Made", value: totals.callsMade, color: "var(--text)" },
                { label: "Connected", value: totals.callsConnected, color: "#4ade80" },
                { label: "Failed", value: totals.callsFailed, color: "var(--danger)" },
                { label: "Landlord Confirm", value: totals.landlordConfirm, color: "var(--brand-gold)" },
                { label: "Viewings Arranged", value: totals.viewingsArranged, color: "var(--text)" },
                { label: "Successful Viewings", value: totals.successfulViewings, color: "#4ade80" },
                { label: "Follow Up", value: totals.followUp, color: "var(--brand-gold)" },
                { label: "Re-Schedule", value: totals.reSchedule, color: "#60a5fa" },
              ].map((card) => (
                <div key={card.label} className="stat-card" style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="panel">
            <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>Daily Task Reports</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{dailyReports.length} records</span>
            </div>

            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading...</div>
            ) : dailyReports.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>No daily reports found.</div>
            ) : (
              <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Agent</th>
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
                    {dailyReports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{r.agent.agentDisplayName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.agent.email}</div>
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmt(r.reportDate)}</td>
                        <td style={{ textAlign: "center" }}>{r.callsMade}</td>
                        <td style={{ textAlign: "center", color: "#4ade80", fontWeight: 600 }}>{r.callsConnected}</td>
                        <td style={{ textAlign: "center", color: "var(--danger)" }}>{r.callsFailed}</td>
                        <td style={{ textAlign: "center", color: "var(--brand-gold)", fontWeight: 600 }}>{r.landlordConfirm}</td>
                        <td style={{ textAlign: "center" }}>{r.viewingsArranged}</td>
                        <td style={{ textAlign: "center", color: "#4ade80" }}>{r.successfulViewings}</td>
                        <td style={{ textAlign: "center" }}>{r.followUp}</td>
                        <td style={{ textAlign: "center" }}>{r.reSchedule}</td>
                        <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "12rem" }}>
                          {r.notes ? <span title={r.notes}>{r.notes.length > 50 ? r.notes.slice(0, 50) + "…" : r.notes}</span> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Calls Data Tab ── */}
      {tab === "calls" && (
        <div className="panel">
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>Calls Data</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{callRecords.length} records</span>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading...</div>
          ) : callRecords.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>No call records found.</div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Linked To</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {callRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{rec.agent.agentDisplayName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{rec.agent.email}</div>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.9rem" }}>{rec.phoneNumber}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${STATUS_COLORS[rec.status] ?? "var(--text-muted)"}22`,
                            color: STATUS_COLORS[rec.status] ?? "var(--text-muted)",
                            border: `1px solid ${STATUS_COLORS[rec.status] ?? "var(--text-muted)"}44`,
                          }}
                        >
                          {STATUS_LABELS[rec.status] ?? rec.status}
                        </span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
