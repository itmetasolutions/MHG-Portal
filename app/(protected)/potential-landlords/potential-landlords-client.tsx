"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UIInput } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";

type PotentialLandlord = {
  id: string;
  fullName: string;
  phone: string;
  phoneLast10: string;
  createdAt: string;
  addedByAgent: { id: string; agentDisplayName: string };
};

type Props = {
  initialLandlords: PotentialLandlord[];
  currentUserId: string;
};

const LOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getLockExpiry(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + LOCK_DURATION_MS);
}

function isLockActive(createdAt: string): boolean {
  return getLockExpiry(createdAt) > new Date();
}

const EMPTY_FORM = { fullName: "", phone: "" };

export function PotentialLandlordsClient({ initialLandlords, currentUserId }: Props) {
  const router = useRouter();
  const [landlords, setLandlords] = useState(initialLandlords);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredLandlords = landlords.filter((landlord) => {
    const haystack = [
      landlord.fullName,
      landlord.phone,
      landlord.phoneLast10,
      landlord.addedByAgent.agentDisplayName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  const totalPages = filteredLandlords.length === 0 ? 0 : Math.ceil(filteredLandlords.length / pageSize);
  const visibleLandlords = filteredLandlords.slice((page - 1) * pageSize, page * pageSize);

  function openModal() {
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/potential-landlords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: form.fullName, phone: form.phone }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.message ?? "Failed to add potential landlord.");
          return;
        }

        const data = await res.json();
        setLandlords((prev) => [data.potentialLandlord, ...prev]);
        setPage(1);
        setShowModal(false);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Potential Landlords</h1>
          <p className="page-subtitle">
            {landlords.length} potential {landlords.length === 1 ? "landlord" : "landlords"} tracked across the team
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          + Add New Potential Landlord
        </button>
      </header>

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <UIInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Name, phone, agent"
          />
        </label>
      </div>

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            All Potential Landlords
          </h2>
        </div>

        {filteredLandlords.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {landlords.length === 0 ? "No potential landlords yet." : "No potential landlords match your search."}
            <br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              {landlords.length === 0 ? 'Click "Add New Potential Landlord" to get started.' : "Try a different search term."}
            </span>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Added By</th>
                  <th>Lock Status</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {visibleLandlords.map((l) => {
                  const locked = isLockActive(l.createdAt);
                  const ownedByMe = l.addedByAgent.id === currentUserId;
                  const expiry = getLockExpiry(l.createdAt);
                  return (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>
                        <Link href={`/potential-landlords/${l.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                          {l.fullName}
                        </Link>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        +44{l.phoneLast10}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--brand-gold)", fontWeight: 600 }}>
                          {l.addedByAgent.agentDisplayName}
                        </span>
                      </td>
                      <td>
                        {locked ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: ownedByMe ? "#4ade80" : "#f87171",
                              background: ownedByMe ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.3rem",
                            }}
                          >
                            {ownedByMe ? "Locked by you" : "Locked"} · until{" "}
                            {expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredLandlords.length > 0 ? (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={filteredLandlords.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </div>
        ) : null}
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "0.75rem", padding: "1.75rem",
              width: "100%", maxWidth: "440px",
              display: "flex", flexDirection: "column", gap: "1.1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                Add Potential Landlord
              </h2>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.25rem" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Adding a landlord here gives you a <strong style={{ color: "var(--brand-gold)" }}>1-week exclusive</strong> — no other agent can add their property during that time.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Full Name <span style={{ color: "var(--brand-gold)" }}>*</span>
                </label>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="e.g. Ahmed Khan"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Phone Number <span style={{ color: "var(--brand-gold)" }}>*</span>
                </label>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+44..."
                  required
                />
              </div>

              {error && (
                <p style={{ margin: 0, color: "#f87171", fontSize: "0.82rem" }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Saving..." : "Add Landlord"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
