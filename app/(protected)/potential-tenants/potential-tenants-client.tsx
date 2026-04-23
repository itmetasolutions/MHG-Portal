"use client";

import Link from "next/link";
import { useState } from "react";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";

const ROOM_TYPE_OPTIONS = [
  { value: "", label: "— Not specified —" },
  { value: "STUDIO_ROOM", label: "Studio Room" },
  { value: "SINGLE_ROOM", label: "Single Room" },
  { value: "DOUBLE_ROOM", label: "Double Room" },
  { value: "ENSUITE_ROOM", label: "Ensuite Room" },
  { value: "LOFT", label: "Loft" },
] as const;

type PotentialTenant = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  phoneLast10: string | null;
  accommodationType: string | null;
  countryOriginal: string | null;
  nationality: string | null;
  roomType: string | null;
  numberOfOccupants: number | null;
  numberOfChildren: number | null;
  onDSS: boolean | null;
  currentlyEmployed: boolean | null;
  annualIncome: string | null;
  currentLivingPostcode: string | null;
  workplacePostcode: string | null;
  maximumBudget: string | null;
  workingProfession: string | null;
  immigrationStatus: string | null;
  moveInDate: string | null;
  notes: string | null;
  createdAt: string;
  addedByAgent: { id: string; agentDisplayName: string };
};

type Props = {
  initialTenants: PotentialTenant[];
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  accommodationType: "",
  countryOriginal: "",
  nationality: "",
  roomType: "",
  numberOfOccupants: "",
  numberOfChildren: "",
  onDSS: "",
  currentlyEmployed: "",
  annualIncome: "",
  currentLivingPostcode: "",
  workplacePostcode: "",
  maximumBudget: "",
  workingProfession: "",
  immigrationStatus: "",
  moveInDate: "",
  notes: "",
};

function fmtRoomType(v: string | null) {
  if (!v) return "—";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PotentialTenantsClient({ initialTenants }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = tenants.filter((t) => {
    const hay = [t.fullName, t.email, t.phone, t.accommodationType, t.addedByAgent.agentDisplayName]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.includes(search.trim().toLowerCase());
  });

  const totalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim()) { setError("First name is required."); return; }
    if (!form.lastName.trim()) { setError("Last name is required."); return; }
    if (!form.phone.trim()) { setError("Phone number is required."); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        accommodationType: form.accommodationType.trim() || undefined,
        countryOriginal: form.countryOriginal.trim() || undefined,
        nationality: form.nationality.trim() || undefined,
        roomType: form.roomType || undefined,
        numberOfOccupants: form.numberOfOccupants ? Number(form.numberOfOccupants) : undefined,
        numberOfChildren: form.numberOfChildren ? Number(form.numberOfChildren) : undefined,
        onDSS: form.onDSS ? form.onDSS : undefined,
        currentlyEmployed: form.currentlyEmployed ? form.currentlyEmployed : undefined,
        annualIncome: form.annualIncome ? Number(form.annualIncome) : undefined,
        currentLivingPostcode: form.currentLivingPostcode.trim().toUpperCase() || undefined,
        workplacePostcode: form.workplacePostcode.trim().toUpperCase() || undefined,
        maximumBudget: form.maximumBudget ? Number(form.maximumBudget) : undefined,
        workingProfession: form.workingProfession.trim() || undefined,
        immigrationStatus: form.immigrationStatus.trim() || undefined,
        moveInDate: form.moveInDate ? new Date(form.moveInDate + "T00:00:00Z").toISOString() : undefined,
        notes: form.notes.trim() || undefined,
      };

      const res = await fetch("/api/potential-tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message ?? "Failed to add potential tenant.");
        setSaving(false);
        return;
      }

      const data = await res.json() as { potentialTenant: PotentialTenant };
      setTenants((prev) => [data.potentialTenant, ...prev]);
      setPage(1);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Potential Tenants</h1>
          <p className="page-subtitle">
            {tenants.length} potential {tenants.length === 1 ? "tenant" : "tenants"} tracked
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setError(null); setShowModal(true); }}>
          + Add Potential Tenant
        </button>
      </header>

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <UIInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, phone, email, accommodation type, agent"
          />
        </label>
      </div>

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>All Potential Tenants</h2>
        </div>

        {visible.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {tenants.length === 0 ? "No potential tenants yet." : "No results match your search."}
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Room Type</th>
                  <th>Budget (£/mo)</th>
                  <th>Move-in</th>
                  <th>DSS</th>
                  <th>Agent</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/potential-tenants/${t.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                        {t.fullName}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {t.phone && <span style={{ display: "block" }}>{t.phone}</span>}
                      {t.email && <span>{t.email}</span>}
                      {!t.phone && !t.email && "—"}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{fmtRoomType(t.roomType)}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {t.maximumBudget ? `£${Number(t.maximumBudget).toLocaleString()}` : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {t.moveInDate
                        ? new Date(t.moveInDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {t.onDSS === null ? <span style={{ color: "var(--text-muted)" }}>—</span>
                        : t.onDSS
                          ? <span style={{ color: "#4ade80", fontWeight: 600 }}>Yes</span>
                          : <span style={{ color: "var(--text-muted)" }}>No</span>}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--brand-gold)", fontWeight: 600 }}>
                      {t.addedByAgent.agentDisplayName}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
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
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}
      </div>

      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem", overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.75rem", width: "100%", maxWidth: "680px", display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Add Potential Tenant</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.25rem" }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Personal Details</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">First Name <span style={{ color: "var(--danger)" }}>*</span></span>
                  <input className="input" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} placeholder="John" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Last Name <span style={{ color: "var(--danger)" }}>*</span></span>
                  <input className="input" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} placeholder="Smith" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Phone <span style={{ color: "var(--danger)" }}>*</span></span>
                  <input className="input" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="07911 122233" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Email</span>
                  <input className="input" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="john@example.com" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Nationality</span>
                  <input className="input" value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} placeholder="British" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Country of Origin</span>
                  <input className="input" value={form.countryOriginal} onChange={(e) => setField("countryOriginal", e.target.value)} placeholder="UK" disabled={saving} />
                </label>
              </div>

              <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Accommodation Requirements</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Accommodation Type</span>
                  <input className="input" value={form.accommodationType} onChange={(e) => setField("accommodationType", e.target.value)} placeholder="e.g. HMO, Private" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Room Type</span>
                  <UISelect value={form.roomType} onChange={(e) => setField("roomType", e.target.value)} disabled={saving}>
                    {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </UISelect>
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Max Budget (£/mo)</span>
                  <input className="input" type="number" min={0} step="0.01" value={form.maximumBudget} onChange={(e) => setField("maximumBudget", e.target.value)} placeholder="e.g. 800" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Move-in Date</span>
                  <input className="input" type="date" value={form.moveInDate} onChange={(e) => setField("moveInDate", e.target.value)} disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">No. of Occupants</span>
                  <input className="input" type="number" min={1} step="1" value={form.numberOfOccupants} onChange={(e) => setField("numberOfOccupants", e.target.value)} placeholder="e.g. 2" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">No. of Children</span>
                  <input className="input" type="number" min={0} step="1" value={form.numberOfChildren} onChange={(e) => setField("numberOfChildren", e.target.value)} placeholder="0" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Current Living Postcode</span>
                  <input className="input" value={form.currentLivingPostcode} onChange={(e) => setField("currentLivingPostcode", e.target.value.toUpperCase())} placeholder="SW1A 1AA" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Workplace Postcode</span>
                  <input className="input" value={form.workplacePostcode} onChange={(e) => setField("workplacePostcode", e.target.value.toUpperCase())} placeholder="E1 6RF" disabled={saving} />
                </label>
              </div>

              <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Employment &amp; Immigration</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Currently Employed</span>
                  <UISelect value={form.currentlyEmployed} onChange={(e) => setField("currentlyEmployed", e.target.value)} disabled={saving}>
                    <option value="">— Not specified —</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </UISelect>
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">On DSS / Benefits</span>
                  <UISelect value={form.onDSS} onChange={(e) => setField("onDSS", e.target.value)} disabled={saving}>
                    <option value="">— Not specified —</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </UISelect>
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Profession</span>
                  <input className="input" value={form.workingProfession} onChange={(e) => setField("workingProfession", e.target.value)} placeholder="e.g. Nurse" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span className="label">Annual Income (£)</span>
                  <input className="input" type="number" min={0} step="0.01" value={form.annualIncome} onChange={(e) => setField("annualIncome", e.target.value)} placeholder="e.g. 24000" disabled={saving} />
                </label>
                <label className="field" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                  <span className="label">Immigration Status</span>
                  <input className="input" value={form.immigrationStatus} onChange={(e) => setField("immigrationStatus", e.target.value)} placeholder="e.g. British Citizen, Leave to Remain" disabled={saving} />
                </label>
              </div>

              <label className="field" style={{ marginBottom: 0 }}>
                <span className="label">Notes</span>
                <textarea
                  className="input"
                  style={{ minHeight: "70px", resize: "vertical" }}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Any additional details..."
                  disabled={saving}
                />
              </label>

              {error && <p style={{ margin: 0, color: "#f87171", fontSize: "0.82rem" }}>{error}</p>}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Add Tenant"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
