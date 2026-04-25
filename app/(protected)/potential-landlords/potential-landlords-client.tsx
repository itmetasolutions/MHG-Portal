"use client";

import Link from "next/link";
import { useState } from "react";
import { UIInput } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";

type PotentialLandlord = {
  id: string;
  fullName: string;
  phone: string;
  phoneLast10: string;
  email: string | null;
  createdAt: string;
  followUpScheduledAt: string | null;
  followUpLockedUntil: string | null;
  isFollowUpLocked: boolean;
  addedByAgent: { id: string; agentDisplayName: string };
};

type Props = {
  initialLandlords: PotentialLandlord[];
  currentUserId: string;
};

function getLockStatus(lead: PotentialLandlord): { locked: boolean; until: Date | null } {
  if (!lead.isFollowUpLocked || !lead.followUpLockedUntil) return { locked: false, until: null };
  const until = new Date(lead.followUpLockedUntil);
  return { locked: until > new Date(), until };
}

export function PotentialLandlordsClient({ initialLandlords, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filtered = initialLandlords.filter((l) => {
    const haystack = [l.fullName, l.phone, l.phoneLast10, l.email ?? ""]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const totalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Follow-Up Leads</h1>
          <p className="page-subtitle">
            {initialLandlords.length} potential {initialLandlords.length === 1 ? "landlord" : "landlords"} · Use the dashboard phone lookup to add new ones
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary">
          ← Dashboard
        </Link>
      </header>

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <UIInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, phone, email"
          />
        </label>
      </div>

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            Follow-Up Leads
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {initialLandlords.length === 0
              ? "No follow-up leads yet."
              : "No leads match your search."}
            <br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              {initialLandlords.length === 0
                ? "Look up a phone number on the dashboard to start the workflow."
                : "Try a different search term."}
            </span>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Follow-Up</th>
                  <th>Lock Status</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const { locked, until } = getLockStatus(l);
                  return (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>
                        <Link
                          href={`/potential-landlords/${l.id}`}
                          style={{ color: "var(--brand-gold)", textDecoration: "none" }}
                        >
                          {l.fullName}
                        </Link>
                        {l.email && (
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
                            {l.email}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {l.phone}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {l.followUpScheduledAt ? (
                          <span style={{ color: "var(--text)" }}>
                            {new Date(l.followUpScheduledAt).toLocaleString("en-GB", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {locked ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "#4ade80",
                              background: "rgba(74,222,128,0.1)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.3rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Locked · until{" "}
                            {until!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                              background: "rgba(255,255,255,0.05)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.3rem",
                            }}
                          >
                            Unlocked
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {new Date(l.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td>
                        <Link
                          href={`/potential-landlords/${l.id}`}
                          className="btn btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                        >
                          Continue →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(next) => { setPageSize(next); setPage(1); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
