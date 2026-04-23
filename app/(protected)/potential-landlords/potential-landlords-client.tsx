"use client";

import Link from "next/link";
import { useState } from "react";

type PotentialLandlord = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  phoneLast10: string;
  email: string | null;
  scheduledAt: string | null;
  isLocked: boolean;
  lockedUntil: string | null;
  createdAt: string;
  addedByAgent: { id: string; agentDisplayName: string };
};

type Props = {
  initialLandlords: PotentialLandlord[];
  currentUserId: string;
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function PotentialLandlordsClient({ initialLandlords, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filtered = initialLandlords.filter((l) => {
    const haystack = [l.fullName, l.phone, l.phoneLast10, l.addedByAgent.agentDisplayName]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Potential Landlords</h1>
          <p className="page-subtitle">
            {initialLandlords.length} follow-up{initialLandlords.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <Link href="/start/follow-up" className="btn btn-primary">
          + Schedule Follow-up
        </Link>
      </header>

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <input
            className="input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, phone, agent"
          />
        </label>
      </div>

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            Pending Follow-ups
          </h2>
        </div>

        {visible.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {initialLandlords.length === 0 ? "No follow-ups scheduled." : "No results match your search."}
            <br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              Use the lookup strip in the sidebar to find a number and click Follow Up.
            </span>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Follow-up At</th>
                  <th>Lock</th>
                  <th>Agent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const ownedByMe = l.addedByAgent.id === currentUserId;
                  const lockActive = l.isLocked && l.lockedUntil && new Date(l.lockedUntil) > new Date();
                  const isOverdue = l.scheduledAt && new Date(l.scheduledAt) < new Date();
                  return (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>{l.fullName}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        +44{l.phoneLast10}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {l.scheduledAt ? (
                          <span style={{ color: isOverdue ? "#f87171" : "var(--text)" }}>
                            {fmtTime(l.scheduledAt)}
                            {isOverdue && <span style={{ marginLeft: "0.3rem", fontSize: "0.72rem", fontWeight: 700, color: "#f87171" }}>OVERDUE</span>}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-subtle)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {lockActive ? (
                          <span style={{
                            fontSize: "0.78rem", fontWeight: 600,
                            color: ownedByMe ? "#4ade80" : "#f87171",
                            background: ownedByMe ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                            padding: "0.2rem 0.5rem", borderRadius: "0.3rem",
                          }}>
                            {ownedByMe ? "Yours" : "Locked"} · until {fmt(l.lockedUntil!)}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "0.3rem" }}>
                            Unlocked
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--brand-gold)", fontWeight: 600 }}>
                        {l.addedByAgent.agentDisplayName}
                      </td>
                      <td>
                        {ownedByMe && (
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <Link
                              href={`/start/interested?phone=${encodeURIComponent(l.phone)}&potentialLandlordId=${l.id}`}
                              className="btn btn-primary btn-sm"
                            >
                              Interested
                            </Link>
                            <Link
                              href={`/start/follow-up?phone=${encodeURIComponent(l.phone)}&potentialLandlordId=${l.id}`}
                              className="btn btn-secondary btn-sm"
                            >
                              Reschedule
                            </Link>
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

        {totalPages > 1 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
