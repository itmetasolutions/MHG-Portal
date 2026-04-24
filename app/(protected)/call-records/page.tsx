"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CallLog = {
  id: string;
  status: string;
  phone: string;
  phoneLast10: string | null;
  landlordFirstName: string | null;
  landlordLastName: string | null;
  followUpScheduledAt: string | null;
  createdAt: string;
  agent: { id: string; agentDisplayName: string };
  landlord: { id: string; landlordName: string } | null;
  potentialLandlord: { id: string; fullName: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Interested",
  NOT_INTERESTED: "Not Interested",
  FOLLOW_UP: "Follow Up",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#59d2a5",
  NOT_INTERESTED: "#ff7f7f",
  FOLLOW_UP: "#f3b664",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CallRecordsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 25;

  async function load(pg: number, status: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), pageSize: String(pageSize) });
    if (status) params.set("status", status);
    const res = await fetch(`/api/call-logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotalPages(data.pagination?.totalPages ?? 1);
    setLoading(false);
  }

  useEffect(() => {
    void load(page, statusFilter);
  }, [page, statusFilter]);

  const totals = useMemo(() => {
    return {
      total: logs.length,
      confirmed: logs.filter((log) => log.status === "CONFIRMED").length,
      followUp: logs.filter((log) => log.status === "FOLLOW_UP").length,
      notInterested: logs.filter((log) => log.status === "NOT_INTERESTED").length,
      scheduled: logs.filter((log) => Boolean(log.followUpScheduledAt)).length,
    };
  }, [logs]);

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Lead workflow
            </p>
            <h1 className="page-title">Call Records</h1>
            <p className="page-subtitle">
              Auto-generated from the Start Call flow. Review outcomes, follow-up dates, and ownership context in one place.
            </p>
          </div>
          <Link href="/start" className="btn btn-primary">
            Start Call
          </Link>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Records</p>
            <p className="stat-value">{totals.total}</p>
            <p className="stat-sub">Showing the current page of results</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Interested</p>
            <p className="stat-value">{totals.confirmed}</p>
            <p className="stat-sub">Leads converted from the call flow</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Follow up</p>
            <p className="stat-value">{totals.followUp}</p>
            <p className="stat-sub">Need another touchpoint scheduled</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Scheduled</p>
            <p className="stat-value">{totals.scheduled}</p>
            <p className="stat-sub">Calls with a future follow-up time</p>
          </article>
        </div>
      </header>

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Filters</h2>
          <span className="badge badge-active">Live query</span>
        </div>

        <div className="inline-row" style={{ alignItems: "flex-end" }}>
          <label className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <span className="label">Filter by Outcome</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All outcomes</option>
              <option value="CONFIRMED">Interested</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="NOT_INTERESTED">Not Interested</option>
            </select>
          </label>
        </div>
      </section>

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Call Log</h2>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {logs.length} items loaded
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No call records yet.
            <br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              Records are created automatically when you use the Start Call flow.
            </span>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Landlord</th>
                  <th>Phone</th>
                  <th>Outcome</th>
                  <th>Follow-up Scheduled</th>
                  <th>Agent</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const name =
                    log.landlord?.landlordName ??
                    log.potentialLandlord?.fullName ??
                    ([log.landlordFirstName, log.landlordLastName].filter(Boolean).join(" ") || "—");
                  const color = STATUS_COLORS[log.status] ?? "var(--text-muted)";
                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>
                        {log.landlord ? (
                          <Link href={`/landlords/${log.landlord.id}`} style={{ color: "var(--brand-gold)" }}>
                            {name}
                          </Link>
                        ) : log.potentialLandlord ? (
                          <span style={{ color: "var(--text)" }}>{name}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>{name}</span>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {log.phoneLast10 ? `+44${log.phoneLast10}` : log.phone}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color,
                            background: `${color}20`,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                          }}
                        >
                          {STATUS_LABELS[log.status] ?? log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {log.followUpScheduledAt ? fmt(log.followUpScheduledAt) : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--brand-gold)", fontWeight: 600 }}>
                        {log.agent.agentDisplayName}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fmt(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Prev
            </button>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}