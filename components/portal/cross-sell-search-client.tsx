"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  status: string;
  vacancyType: string;
  rentPerMonth: string | number | null;
  rentPerWeek: string | number | null;
  ownerAgentId: string;
  ownerAgent: AgentContact;
};

type TenantResult = {
  id: string;
  fullName: string;
  postcode: string | null;
  preferredArea: string | null;
  currentLivingPostcode: string | null;
  workplacePostcode: string | null;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  maximumBudget: string | number | null;
  moveInDate: string | null;
  numberOfOccupants: number | null;
  householdSize: number | null;
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
  const [appliedPostcode, setAppliedPostcode] = useState("");
  const [statusFilter, setStatusFilter] = useState("AVAILABLE");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyResult[]>([]);
  const [tenants, setTenants] = useState<TenantResult[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });

  const load = useCallback(async () => {
    if (!appliedPostcode.trim()) return;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    query.set("postcode", appliedPostcode.trim());
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
  }, [appliedPostcode, page, pageSize, statusFilter, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!postcodeInput.trim()) return;
    setPage(1);
    setAppliedPostcode(postcodeInput);
  }

  function switchTab(next: SearchTab) {
    if (next === tab) return;
    setTab(next);
    setPage(1);
    setError(null);
    setSearched(false);
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
            Search every agent&apos;s live properties and tenant leads by postcode to spot referral opportunities.
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
          <UIButton type="submit" disabled={!postcodeInput.trim() || loading}>
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
          Enter a postcode above to search {tab === "property" ? "properties" : "tenants"} across all agents.
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
        No properties found for this postcode.
      </div>
    );
  }

  return (
    <div className="property-card-grid">
      {properties.map((property) => {
        const isOwn = property.ownerAgentId === currentUserId;
        const location = [property.addressLine1, property.city, property.postcode].filter(Boolean).join(", ");
        const rentPerMonth = money(property.rentPerMonth);
        const rentPerWeek = money(property.rentPerWeek);

        return (
          <article key={property.id} className="property-preview-card">
            <div className="property-preview-content">
              <div className="stack" style={{ gap: "0.35rem" }}>
                <span className="property-preview-title">
                  {property.title || property.addressLine1 || property.propertyRef}
                </span>
                <div className="property-preview-subtitle">{location || property.propertyRef}</div>
              </div>

              <div className="property-preview-meta">
                <span className="property-preview-meta-chip">
                  <code>{property.propertyRef}</code>
                </span>
                {property.propertyType && (
                  <span className="property-preview-meta-chip">{property.propertyType}</span>
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
                {rentPerMonth && <span className="property-preview-meta-chip">{rentPerMonth}/mo</span>}
                {!rentPerMonth && rentPerWeek && (
                  <span className="property-preview-meta-chip">{rentPerWeek}/wk</span>
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
}: {
  tenants: TenantResult[];
  loading: boolean;
  currentUserId: string;
  contactHref: (agentId: string) => string;
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
        No tenant leads found for this postcode.
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

              return (
                <tr key={tenant.id}>
                  <td style={{ fontWeight: 600 }}>{tenant.fullName}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
