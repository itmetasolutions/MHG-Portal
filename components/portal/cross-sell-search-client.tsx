"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { UppercasePostcodeInput } from "@/components/portal/UppercasePostcodeInput";
import { apiGet } from "@/lib/api-client";

type SearchTab = "property" | "tenant";

type AgentContact = {
  id: string;
  agentDisplayName: string;
  email: string;
  agentPhone: string | null;
} | null;

type PropertyResult = {
  id: string;
  propertyRef: string;
  title: string | null;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  area: string | null;
  propertyType: string | null;
  propertyCategory: string | null;
  beds: number | null;
  baths: number | null;
  status: string;
  vacancyType: string;
  totalRooms: number | null;
  availableRooms: number | null;
  rentPerMonth: string | number | null;
  rentPerWeek: string | number | null;
  depositAmount: string | number | null;
  isFurnished: boolean | null;
  petsAllowed: boolean | null;
  dssAllowed: boolean | null;
  childrenAllowed: boolean | null;
  ownerAgentId: string;
  ownerAgent: AgentContact;
};

type TenantResult = {
  id: string;
  fullName: string;
  currentAddress: string | null;
  postcode: string | null;
  preferredArea: string | null;
  currentLivingPostcode: string | null;
  workplacePostcode: string | null;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  maximumBudget: string | number | null;
  moveInDate: string | null;
  moveInFlexible: boolean | null;
  numberOfOccupants: number | null;
  householdSize: number | null;
  numberOfChildren: number | null;
  petsAllowed: boolean | null;
  childrenAllowed: boolean | null;
  onDSS: boolean | null;
  currentlyEmployed: boolean | null;
  workingProfession: string | null;
  accommodationType: string | null;
  notes: string | null;
  saleId: string | null;
  owningAgent: AgentContact;
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

type Props = {
  currentUserId: string;
  isAdmin: boolean;
};

const STATUS_CHIPS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "CLOSED", label: "Closed" },
  { value: "", label: "All" },
];

function money(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return `£${numeric.toLocaleString("en-GB")}`;
}

function statusBadgeClass(status: string) {
  if (status === "AVAILABLE") return "badge-active";
  if (status === "CLOSED") return "badge-sold";
  return "badge-draft";
}

export function CrossSellSearchClient({ currentUserId, isAdmin }: Props) {
  const [tab, setTab] = useState<SearchTab>("property");
  const [postcodeInput, setPostcodeInput] = useState("");
  const [areaInput, setAreaInput] = useState("");
  const [appliedPostcode, setAppliedPostcode] = useState("");
  const [appliedArea, setAppliedArea] = useState("");
  const [statusFilter, setStatusFilter] = useState("AVAILABLE");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyResult[]>([]);
  const [tenants, setTenants] = useState<TenantResult[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appliedPostcode.trim() && !appliedArea.trim()) return;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (appliedPostcode.trim()) query.set("postcode", appliedPostcode.trim());
    if (appliedArea.trim()) query.set("area", appliedArea.trim());
    query.set("page", String(page));
    query.set("pageSize", String(pageSize));
    if (tab === "property" && statusFilter) query.set("status", statusFilter);

    const endpoint = tab === "property" ? "/api/search/properties" : "/api/search/tenants";
    const result = await apiGet<{
      properties?: PropertyResult[];
      tenants?: TenantResult[];
      pagination: Pagination;
    }>(`${endpoint}?${query.toString()}`);

    setLoading(false);
    setSearched(true);

    if (!result.ok) {
      setError(result.message ?? "Search failed. Please try again.");
      return;
    }

    if (tab === "property") {
      setProperties(result.data.properties ?? []);
    } else {
      setTenants(result.data.tenants ?? []);
    }
    setPagination(result.data.pagination);
  }, [appliedPostcode, appliedArea, page, pageSize, statusFilter, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!postcodeInput.trim() && !areaInput.trim()) return;
    setPage(1);
    setAppliedPostcode(postcodeInput);
    setAppliedArea(areaInput);
  }

  function switchTab(next: SearchTab) {
    if (next === tab) return;
    setTab(next);
    setPage(1);
    setError(null);
    setSearched(false);
    setExpandedTenantId(null);
  }

  function contactHref(agentId: string) {
    return isAdmin ? `/admin/chat?agentId=${agentId}` : `/messages?userId=${agentId}`;
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Cross-Sell Search</h1>
          <p className="page-subtitle">
            Search every agent&apos;s live properties and tenant leads by postcode or area to spot referral opportunities.
          </p>
        </div>
      </header>

      <div className="search-tab-group">
        <button
          type="button"
          className={`search-tab${tab === "property" ? " search-tab-active" : ""}`}
          onClick={() => switchTab("property")}
        >
          Property Search
        </button>
        <button
          type="button"
          className={`search-tab${tab === "tenant" ? " search-tab-active" : ""}`}
          onClick={() => switchTab("tenant")}
        >
          Tenant Search
        </button>
      </div>

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <form onSubmit={handleSearch} className="inline-row" style={{ alignItems: "flex-end" }}>
          <label className="field" style={{ marginBottom: 0, minWidth: "220px" }}>
            <span className="label">Postcode</span>
            <UppercasePostcodeInput
              value={postcodeInput}
              onChange={setPostcodeInput}
              placeholder="e.g. E1 or SW1A 1AA"
            />
          </label>
          <label className="field" style={{ marginBottom: 0, minWidth: "220px" }}>
            <span className="label">Area</span>
            <input
              className="input"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              placeholder="e.g. Canary Wharf"
            />
          </label>
          <UIButton type="submit" disabled={(!postcodeInput.trim() && !areaInput.trim()) || loading}>
            {loading ? "Searching..." : "Search"}
          </UIButton>

          {tab === "property" && (
            <div className="chip-group" style={{ marginLeft: "auto" }}>
              {STATUS_CHIPS.map((chip) => (
                <button
                  key={chip.value || "all"}
                  type="button"
                  className={`chip${statusFilter === chip.value ? " chip-active" : ""}`}
                  onClick={() => {
                    setStatusFilter(chip.value);
                    setPage(1);
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {error && <UIAlert type="error">{error}</UIAlert>}

      {!searched && !loading && !error && (
        <div className="panel" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
          Enter a postcode or area above to search {tab === "property" ? "properties" : "tenants"} across all agents.
        </div>
      )}

      {searched && tab === "property" && (
        <PropertyResults
          properties={properties}
          loading={loading}
          currentUserId={currentUserId}
          contactHref={contactHref}
        />
      )}

      {searched && tab === "tenant" && (
        <TenantResults
          tenants={tenants}
          loading={loading}
          currentUserId={currentUserId}
          contactHref={contactHref}
          expandedTenantId={expandedTenantId}
          onToggleExpand={(id) => setExpandedTenantId((prev) => (prev === id ? null : id))}
        />
      )}

      {searched && pagination.total > 0 && (
        <div className="panel" style={{ padding: "1rem 1.25rem" }}>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            busy={loading}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}

function PropertyResults({
  properties,
  loading,
  currentUserId,
  contactHref,
}: {
  properties: PropertyResult[];
  loading: boolean;
  currentUserId: string;
  contactHref: (agentId: string) => string;
}) {
  if (loading) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        Searching properties...
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        No properties found for this search.
      </div>
    );
  }

  return (
    <div className="property-card-grid">
      {properties.map((property) => {
        const isOwn = property.ownerAgentId === currentUserId;
        const location = [property.addressLine1, property.addressLine2, property.city, property.county, property.postcode]
          .filter(Boolean)
          .join(", ");
        const rentPerMonth = money(property.rentPerMonth);
        const rentPerWeek = money(property.rentPerWeek);
        const deposit = money(property.depositAmount);

        return (
          <article key={property.id} className="property-preview-card">
            <div className="property-preview-content">
              <div className="stack" style={{ gap: "0.35rem" }}>
                <span className="property-preview-title">
                  {property.title || property.addressLine1 || property.propertyRef}
                </span>
                <div className="property-preview-subtitle">{location || property.propertyRef}</div>
                {property.area && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Area: {property.area}</div>
                )}
              </div>

              {property.description && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {property.description}
                </p>
              )}

              <div className="property-preview-meta">
                <span className="property-preview-meta-chip">
                  <code>{property.propertyRef}</code>
                </span>
                {property.propertyType && (
                  <span className="property-preview-meta-chip">{property.propertyType}</span>
                )}
                {property.propertyCategory && (
                  <span className="property-preview-meta-chip">{property.propertyCategory}</span>
                )}
                {property.beds != null && (
                  <span className="property-preview-meta-chip">
                    {property.beds} bed{property.beds === 1 ? "" : "s"}
                  </span>
                )}
                {property.baths != null && (
                  <span className="property-preview-meta-chip">
                    {property.baths} bath{property.baths === 1 ? "" : "s"}
                  </span>
                )}
                {property.totalRooms != null && (
                  <span className="property-preview-meta-chip">
                    {property.availableRooms ?? "?"}/{property.totalRooms} rooms available
                  </span>
                )}
                {rentPerMonth && <span className="property-preview-meta-chip">{rentPerMonth}/mo</span>}
                {!rentPerMonth && rentPerWeek && (
                  <span className="property-preview-meta-chip">{rentPerWeek}/wk</span>
                )}
                {deposit && <span className="property-preview-meta-chip">Deposit: {deposit}</span>}
                {property.isFurnished != null && (
                  <span className="property-preview-meta-chip">{property.isFurnished ? "Furnished" : "Unfurnished"}</span>
                )}
                {property.petsAllowed != null && (
                  <span className="property-preview-meta-chip">Pets {property.petsAllowed ? "OK" : "not allowed"}</span>
                )}
                {property.dssAllowed != null && (
                  <span className="property-preview-meta-chip">DSS {property.dssAllowed ? "OK" : "not allowed"}</span>
                )}
                {property.childrenAllowed != null && (
                  <span className="property-preview-meta-chip">Children {property.childrenAllowed ? "OK" : "not allowed"}</span>
                )}
                <span className={`badge ${statusBadgeClass(property.status)}`}>{property.status}</span>
              </div>

              <div className="property-preview-links">
                <span>Listed by: {property.ownerAgent?.agentDisplayName ?? "Unknown agent"}</span>
              </div>

              <div className="property-preview-footer">
                {isOwn ? (
                  <span className="badge badge-admin">Your listing</span>
                ) : property.ownerAgent ? (
                  <Link href={contactHref(property.ownerAgent.id)} className="btn btn-secondary btn-sm">
                    Contact Agent
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TenantResults({
  tenants,
  loading,
  currentUserId,
  contactHref,
  expandedTenantId,
  onToggleExpand,
}: {
  tenants: TenantResult[];
  loading: boolean;
  currentUserId: string;
  contactHref: (agentId: string) => string;
  expandedTenantId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        Searching tenants...
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        No tenant leads found for this search.
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Area / Postcode</th>
              <th>Budget</th>
              <th>Move-In</th>
              <th>Occupants</th>
              <th>Status</th>
              <th>Agent</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => {
              const isOwn = tenant.owningAgent?.id === currentUserId;
              const area =
                [tenant.postcode, tenant.preferredArea].filter(Boolean).join(" · ") ||
                [tenant.currentLivingPostcode, tenant.workplacePostcode].filter(Boolean).join(" · ") ||
                "—";
              const budget = money(tenant.budgetMax) ?? money(tenant.maximumBudget) ?? money(tenant.budgetMin);
              const expanded = expandedTenantId === tenant.id;

              return (
                <Fragment key={tenant.id}>
                  <tr>
                    <td style={{ fontWeight: 600 }}>
                      <button
                        type="button"
                        onClick={() => onToggleExpand(tenant.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand-gold)", fontWeight: 600, padding: 0, textAlign: "left" }}
                      >
                        {expanded ? "▾ " : "▸ "}{tenant.fullName}
                      </button>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{area}</td>
                    <td style={{ fontSize: "0.82rem" }}>{budget ?? "—"}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {tenant.moveInDate
                        ? new Date(tenant.moveInDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>{tenant.numberOfOccupants ?? tenant.householdSize ?? "—"}</td>
                    <td>
                      {tenant.saleId ? (
                        <span className="badge badge-sold" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>
                          Placed
                        </span>
                      ) : (
                        <span className="badge badge-active" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>
                          Looking
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>{tenant.owningAgent?.agentDisplayName ?? "Unassigned"}</td>
                    <td>
                      {isOwn ? (
                        <span className="badge badge-admin">Your tenant</span>
                      ) : tenant.owningAgent ? (
                        <Link href={contactHref(tenant.owningAgent.id)} className="btn btn-secondary btn-sm">
                          Contact Agent
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={8} style={{ background: "var(--surface-alt, #1a1a24)", padding: "1rem 1.25rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", fontSize: "0.82rem" }}>
                          <DetailField label="Current Address" value={tenant.currentAddress} />
                          <DetailField label="Budget Range" value={[money(tenant.budgetMin), money(tenant.budgetMax)].filter(Boolean).join(" – ") || null} />
                          <DetailField label="Move-In Flexible" value={boolLabel(tenant.moveInFlexible)} />
                          <DetailField label="Household Size" value={tenant.householdSize != null ? String(tenant.householdSize) : null} />
                          <DetailField label="Children" value={tenant.numberOfChildren != null ? String(tenant.numberOfChildren) : null} />
                          <DetailField label="Pets Allowed" value={boolLabel(tenant.petsAllowed)} />
                          <DetailField label="Children Allowed" value={boolLabel(tenant.childrenAllowed)} />
                          <DetailField label="On DSS" value={boolLabel(tenant.onDSS)} />
                          <DetailField label="Currently Employed" value={boolLabel(tenant.currentlyEmployed)} />
                          <DetailField label="Profession" value={tenant.workingProfession} />
                          <DetailField label="Accommodation Type" value={tenant.accommodationType} />
                        </div>
                        <div style={{ marginTop: "0.75rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                            Notes
                          </span>
                          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                            {tenant.notes || "—"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function boolLabel(value: boolean | null | undefined): string | null {
  if (value == null) return null;
  return value ? "Yes" : "No";
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
        {label}
      </div>
      <div style={{ marginTop: "0.15rem", color: "var(--text)" }}>{value || "—"}</div>
    </div>
  );
}
