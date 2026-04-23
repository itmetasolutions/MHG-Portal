"use client";

import { useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIInput } from "@/components/ui/input";

type AutoReport = {
  date: string;
  agentId: string;
  totalSearched: number;
  propertiesConfirmed: number;
  notInterested: number;
  followUp: number;
  potentialTenants: number;
  salesClosed: number;
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function DailyReportsPage() {
  const [reports, setReports] = useState<AutoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(thirtyDaysAgo());
  const [to, setTo] = useState(today());

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/daily-reports/auto?${params}`);
      const data = await res.json() as { reports?: AutoReport[]; message?: string };
      if (!res.ok) { setError(data.message ?? "Failed to load reports."); setReports([]); }
      else setReports(data.reports ?? []);
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [from, to]);

  const totals = useMemo(() => reports.reduce(
    (acc, r) => ({
      totalSearched: acc.totalSearched + r.totalSearched,
      propertiesConfirmed: acc.propertiesConfirmed + r.propertiesConfirmed,
      notInterested: acc.notInterested + r.notInterested,
      followUp: acc.followUp + r.followUp,
      potentialTenants: acc.potentialTenants + r.potentialTenants,
      salesClosed: acc.salesClosed + r.salesClosed,
    }),
    { totalSearched: 0, propertiesConfirmed: 0, notInterested: 0, followUp: 0, potentialTenants: 0, salesClosed: 0 },
  ), [reports]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Daily Reports</h1>
          <p className="page-subtitle">Auto-generated from call activity. Updates in real time.</p>
        </div>
      </header>

      {error && <UIAlert type="error">{error}</UIAlert>}

      {/* Date filter */}
      <div className="panel" style={{ padding: "1rem 1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="field" style={{ marginBottom: 0, minWidth: 160 }}>
          <span className="label">From</span>
          <UIInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field" style={{ marginBottom: 0, minWidth: 160 }}>
          <span className="label">To</span>
          <UIInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {/* Summary cards */}
      {!loading && reports.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {([
            ["Searches", totals.totalSearched, "var(--text-muted)"],
            ["Confirmed", totals.propertiesConfirmed, "#4ade80"],
            ["Not Interested", totals.notInterested, "#f87171"],
            ["Follow Ups", totals.followUp, "#60a5fa"],
            ["Potential Tenants", totals.potentialTenants, "var(--brand-gold)"],
            ["Sales Closed", totals.salesClosed, "#4ade80"],
          ] as [string, number, string][]).map(([label, val, color]) => (
            <div key={label} className="panel" style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            Activity by Day
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No activity found for the selected date range.
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: "center" }}>Searches</th>
                  <th style={{ textAlign: "center" }}>Confirmed</th>
                  <th style={{ textAlign: "center" }}>Not Interested</th>
                  <th style={{ textAlign: "center" }}>Follow Ups</th>
                  <th style={{ textAlign: "center" }}>Potential Tenants</th>
                  <th style={{ textAlign: "center" }}>Sales Closed</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={`${r.agentId}-${r.date}`}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(r.date)}</td>
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{r.totalSearched}</td>
                    <td style={{ textAlign: "center", color: "#4ade80", fontWeight: 600 }}>{r.propertiesConfirmed}</td>
                    <td style={{ textAlign: "center", color: "#f87171", fontWeight: 600 }}>{r.notInterested}</td>
                    <td style={{ textAlign: "center", color: "#60a5fa" }}>{r.followUp}</td>
                    <td style={{ textAlign: "center", color: "var(--brand-gold)", fontWeight: 600 }}>{r.potentialTenants}</td>
                    <td style={{ textAlign: "center", color: "#4ade80", fontWeight: 600 }}>{r.salesClosed}</td>
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
