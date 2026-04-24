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
      const data = (await res.json()) as { reports?: AutoReport[]; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Failed to load reports.");
        setReports([]);
      } else {
        setReports(data.reports ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [from, to]);

  const totals = useMemo(
    () =>
      reports.reduce(
        (acc, r) => ({
          totalSearched: acc.totalSearched + r.totalSearched,
          propertiesConfirmed: acc.propertiesConfirmed + r.propertiesConfirmed,
          notInterested: acc.notInterested + r.notInterested,
          followUp: acc.followUp + r.followUp,
          potentialTenants: acc.potentialTenants + r.potentialTenants,
          salesClosed: acc.salesClosed + r.salesClosed,
        }),
        { totalSearched: 0, propertiesConfirmed: 0, notInterested: 0, followUp: 0, potentialTenants: 0, salesClosed: 0 },
      ),
    [reports],
  );

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Performance reports
            </p>
            <h1 className="page-title">Daily Reports</h1>
            <p className="page-subtitle">
              Auto-generated from call activity. Track daily search volume, confirmations, and conversion outcomes in one view.
            </p>
          </div>
        </div>

        {error && <UIAlert type="error">{error}</UIAlert>}

        <div className="inline-row" style={{ alignItems: "flex-end", marginTop: "1rem" }}>
          <label className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <span className="label">From</span>
            <UIInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <span className="label">To</span>
            <UIInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </header>

      {!loading && reports.length > 0 && (
        <div className="grid-cards">
          {([
            ["Searches", totals.totalSearched, "var(--text-muted)"],
            ["Confirmed", totals.propertiesConfirmed, "#59d2a5"],
            ["Not Interested", totals.notInterested, "#ff7f7f"],
            ["Follow Ups", totals.followUp, "#60a5fa"],
            ["Potential Tenants", totals.potentialTenants, "var(--brand-gold)"],
            ["Sales Closed", totals.salesClosed, "#59d2a5"],
          ] as [string, number, string][]).map(([label, val, color]) => (
            <article key={label} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className="stat-value" style={{ color }}>
                {val}
              </p>
              <p className="stat-sub">Selected date range total</p>
            </article>
          ))}
        </div>
      )}

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Activity by Day</h2>
          <span className="badge badge-active">{reports.length} day{reports.length === 1 ? "" : "s"}</span>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Loading...
          </div>
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
                    <td style={{ textAlign: "center", color: "#59d2a5", fontWeight: 600 }}>{r.propertiesConfirmed}</td>
                    <td style={{ textAlign: "center", color: "#ff7f7f", fontWeight: 600 }}>{r.notInterested}</td>
                    <td style={{ textAlign: "center", color: "#60a5fa" }}>{r.followUp}</td>
                    <td style={{ textAlign: "center", color: "var(--brand-gold)", fontWeight: 600 }}>{r.potentialTenants}</td>
                    <td style={{ textAlign: "center", color: "#59d2a5", fontWeight: 600 }}>{r.salesClosed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}