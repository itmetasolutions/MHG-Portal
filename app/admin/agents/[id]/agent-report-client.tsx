"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { UIInput } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";

type PropertyRow = {
  id: string;
  propertyRef: string;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  status: "AVAILABLE" | "DRAFT" | "CLOSED";
  createdAt: Date;
  landlord: { id: string; landlordName: string };
};

type LandlordRow = {
  id: string;
  landlordName: string;
  landlordNumber: string;
  email: string | null;
  phoneE164: string | null;
  createdAt: Date;
  _count: { properties: number };
};

type SaleRow = {
  id: string;
  finalAmount: number;
  commissionAmount: number;
  profit: number;
  closedAt: Date;
  property: {
    id: string;
    propertyRef: string;
    addressLine1: string | null;
    city: string | null;
    postcode: string | null;
  };
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    moveInDate: Date | null;
    rentAmount: number | null;
    depositAmount: number | null;
  } | null;
};

type TenantRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  moveInDate: Date | null;
  rentAmount: number | null;
  depositAmount: number | null;
  createdAt: Date;
  sale: {
    property: {
      id: string;
      propertyRef: string;
      addressLine1: string | null;
      city: string | null;
      postcode: string | null;
    };
  } | null;
};

type PotentialTenantRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  interestedIn: string | null;
  budget: string | null;
  createdAt: Date;
};

type PotentialLandlordRow = {
  id: string;
  fullName: string;
  phoneLast10: string;
  createdAt: Date;
};

type TabKey = "properties" | "landlords" | "tenants" | "sales" | "potentialTenants" | "potentialLandlords";

type Props = {
  properties: PropertyRow[];
  landlords: LandlordRow[];
  tenants: TenantRow[];
  sales: SaleRow[];
  potentialTenants: PotentialTenantRow[];
  potentialLandlords: PotentialLandlordRow[];
};

const TAB_LABELS: Record<TabKey, string> = {
  properties: "Properties",
  landlords: "Landlords",
  tenants: "Tenants",
  sales: "Sales",
  potentialTenants: "Potential Tenants",
  potentialLandlords: "Potential Landlords",
};

function statusBadge(status: PropertyRow["status"]) {
  if (status === "AVAILABLE") return "badge-active";
  if (status === "CLOSED") return "badge-sold";
  return "badge-draft";
}

export function AgentReportClient({
  properties,
  landlords,
  tenants,
  sales,
  potentialTenants,
  potentialLandlords,
}: Props) {
  const [tab, setTab] = useState<TabKey>("properties");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const includesQuery = (value: Array<string | null | undefined>) =>
      value.filter(Boolean).join(" ").toLowerCase().includes(query);

    switch (tab) {
      case "properties":
        return properties.filter((row) =>
          includesQuery([row.propertyRef, row.addressLine1, row.city, row.postcode, row.propertyType, row.landlord.landlordName]),
        );
      case "landlords":
        return landlords.filter((row) =>
          includesQuery([row.landlordName, row.landlordNumber, row.email, row.phoneE164]),
        );
      case "tenants":
        return tenants.filter((row) =>
          includesQuery([row.fullName, row.email, row.phone, row.sale?.property.propertyRef, row.sale?.property.addressLine1]),
        );
      case "sales":
        return sales.filter((row) =>
          includesQuery([row.property.propertyRef, row.property.addressLine1, row.property.city, row.property.postcode, row.tenant?.fullName]),
        );
      case "potentialTenants":
        return potentialTenants.filter((row) =>
          includesQuery([row.fullName, row.email, row.phone, row.interestedIn, row.budget]),
        );
      case "potentialLandlords":
        return potentialLandlords.filter((row) =>
          includesQuery([row.fullName, row.phoneLast10]),
        );
      default:
        return [];
    }
  }, [landlords, potentialLandlords, potentialTenants, properties, sales, search, tab, tenants]);

  const totalPages = filteredRows.length === 0 ? 0 : Math.ceil(filteredRows.length / pageSize);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function switchTab(nextTab: TabKey) {
    setTab(nextTab);
    setSearch("");
    setPage(1);
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn ${tab === key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => switchTab(key)}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search {TAB_LABELS[tab]}</span>
          <UIInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={`Search ${TAB_LABELS[tab].toLowerCase()}`}
          />
        </label>
      </div>

      <div className="admin-card-body" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
          {tab === "properties" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Type / Beds</th>
                  <th>Landlord</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {(visibleRows as PropertyRow[]).map((property) => (
                  <tr key={property.id}>
                    <td>
                      <Link href={`/admin/properties/${property.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none", fontWeight: 600 }}>
                        {property.addressLine1 ?? property.propertyRef}
                      </Link>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[property.city, property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {property.propertyType ?? "-"}
                      {property.beds != null ? ` · ${property.beds} bed` : ""}
                      {property.baths != null ? ` / ${property.baths} bath` : ""}
                    </td>
                    <td>
                      <Link href={`/landlords/${property.landlord.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                        {property.landlord.landlordName}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(property.status)}`}>{property.status}</span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{formatDate(property.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "landlords" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Number</th>
                  <th>Contact</th>
                  <th>Properties</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {(visibleRows as LandlordRow[]).map((landlord) => (
                  <tr key={landlord.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/landlords/${landlord.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                        {landlord.landlordName}
                      </Link>
                    </td>
                    <td><code>{landlord.landlordNumber}</code></td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {landlord.email && <span style={{ display: "block" }}>{landlord.email}</span>}
                      {landlord.phoneE164 && <span>{landlord.phoneE164}</span>}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--brand-gold)" }}>{landlord._count.properties}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{formatDate(landlord.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "tenants" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Contact</th>
                  <th>Property</th>
                  <th>Move-In</th>
                  <th>Rent / Deposit</th>
                </tr>
              </thead>
              <tbody>
                {(visibleRows as TenantRow[]).map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/admin/tenants/${tenant.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                        {tenant.fullName}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {tenant.email && <span style={{ display: "block" }}>{tenant.email}</span>}
                      {tenant.phone && <span>{tenant.phone}</span>}
                    </td>
                    <td>
                      {tenant.sale?.property ? (
                        <Link href={`/admin/properties/${tenant.sale.property.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                          {tenant.sale.property.addressLine1 ?? tenant.sale.property.propertyRef}
                        </Link>
                      ) : (
                        <span className="muted">No property</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {tenant.moveInDate ? formatDate(tenant.moveInDate) : "-"}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {tenant.rentAmount ? `GBP ${tenant.rentAmount}/mo` : "-"}
                      {tenant.depositAmount ? (
                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          dep: GBP {tenant.depositAmount}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "sales" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Sale Amount</th>
                  <th>Commission</th>
                  <th>Net Profit</th>
                  <th>Tenant</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {(visibleRows as SaleRow[]).map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <Link href={`/admin/sales/${sale.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none", fontWeight: 600 }}>
                        {sale.property.addressLine1 ?? sale.property.propertyRef}
                      </Link>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[sale.property.city, sale.property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td style={{ color: "#4ade80", fontWeight: 700 }}>{formatCurrency(sale.finalAmount)}</td>
                    <td style={{ color: "var(--brand-gold)", fontWeight: 700 }}>{formatCurrency(sale.commissionAmount)}</td>
                    <td style={{ color: "#22d3ee", fontWeight: 700 }}>{formatCurrency(sale.profit)}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {sale.tenant ? (
                        <Link href={`/admin/tenants/${sale.tenant.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                          {sale.tenant.fullName}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{formatDate(sale.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "potentialTenants" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Interested In</th>
                  <th>Budget</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {(visibleRows as PotentialTenantRow[]).map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/admin/potential-tenants/${tenant.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                        {tenant.fullName}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {tenant.email && <span style={{ display: "block" }}>{tenant.email}</span>}
                      {tenant.phone && <span>{tenant.phone}</span>}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{tenant.interestedIn ?? "-"}</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{tenant.budget ?? "-"}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{formatDate(tenant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "potentialLandlords" ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {(visibleRows as PotentialLandlordRow[]).map((landlord) => (
                  <tr key={landlord.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/admin/potential-landlords/${landlord.id}`} style={{ color: "var(--brand-gold)", textDecoration: "none" }}>
                        {landlord.fullName}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>+44{landlord.phoneLast10}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{formatDate(landlord.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {visibleRows.length === 0 ? (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <p className="muted" style={{ margin: 0 }}>
              No {TAB_LABELS[tab].toLowerCase()} match your search.
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ padding: "0 1.25rem 1.25rem" }}>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={filteredRows.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
