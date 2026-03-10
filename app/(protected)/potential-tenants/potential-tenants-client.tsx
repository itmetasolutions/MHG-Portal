"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PotentialTenant = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  interestedIn: string | null;
  budget: string | null;
  notes: string | null;
  createdAt: string;
  addedByAgent: { id: string; agentDisplayName: string };
};

type Props = {
  initialTenants: PotentialTenant[];
};

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  interestedIn: "",
  budget: "",
  notes: "",
};

export function PotentialTenantsClient({ initialTenants }: Props) {
  const router = useRouter();
  const [tenants, setTenants] = useState(initialTenants);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

    startTransition(async () => {
      try {
        const res = await fetch("/api/potential-tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email || undefined,
            phone: form.phone || undefined,
            interestedIn: form.interestedIn || undefined,
            budget: form.budget || undefined,
            notes: form.notes || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.message ?? "Failed to add potential tenant.");
          return;
        }

        const data = await res.json();
        setTenants((prev) => [data.potentialTenant, ...prev]);
        setShowModal(false);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <>
      {/* Header row with Add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <h1 className="page-title">Potential Tenants</h1>
          <p className="page-subtitle">
            {tenants.length} potential {tenants.length === 1 ? "tenant" : "tenants"} tracked across the team
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          + Add New Potential Tenant
        </button>
      </div>

      {/* Table */}
      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            All Potential Tenants
          </h2>
        </div>

        {tenants.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No potential tenants yet.<br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              Click "Add New Potential Tenant" to get started.
            </span>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Interested In</th>
                  <th>Budget</th>
                  <th>Notes</th>
                  <th>Added By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{t.fullName}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {t.email && <span style={{ display: "block" }}>{t.email}</span>}
                      {t.phone && <span>{t.phone}</span>}
                      {!t.email && !t.phone && <span className="muted">—</span>}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {t.interestedIn ?? <span className="muted">—</span>}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {t.budget ?? <span className="muted">—</span>}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "14rem" }}>
                      {t.notes
                        ? <span title={t.notes}>{t.notes.length > 60 ? t.notes.slice(0, 60) + "…" : t.notes}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "var(--brand-gold)", fontWeight: 600 }}>
                        {t.addedByAgent.agentDisplayName}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {new Date(t.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
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
              width: "100%", maxWidth: "520px",
              display: "flex", flexDirection: "column", gap: "1.1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                Add Potential Tenant
              </h2>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.25rem" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

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
                  placeholder="e.g. John Smith"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Email
                  </label>
                  <input
                    className="input"
                    style={{ width: "100%" }}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Phone
                  </label>
                  <input
                    className="input"
                    style={{ width: "100%" }}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+44..."
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Interested In
                  </label>
                  <input
                    className="input"
                    style={{ width: "100%" }}
                    value={form.interestedIn}
                    onChange={(e) => setForm((f) => ({ ...f, interestedIn: e.target.value }))}
                    placeholder="e.g. 2-bed flat, Manchester"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Budget
                  </label>
                  <input
                    className="input"
                    style={{ width: "100%" }}
                    value={form.budget}
                    onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="e.g. £800/mo"
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Notes
                </label>
                <textarea
                  className="input"
                  style={{ width: "100%", minHeight: "80px", resize: "vertical" }}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional details..."
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
                  {isPending ? "Saving..." : "Add Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
