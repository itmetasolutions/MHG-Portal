"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { PropertyStatusDropdown } from "@/components/property-status-dropdown";
import { UIInput } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { formatDate } from "@/lib/format";
import type { PropertyStatus } from "@/lib/portal-api";

type PropertyRow = {
  id: string;
  propertyRef: string;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  status: PropertyStatus;
  createdAt: Date;
  landlord: { id: string; landlordName: string };
  ownerAgent: { id: string; agentDisplayName: string };
};

type Props = {
  properties: PropertyRow[];
};

export function AdminPropertiesClient({ properties: initial }: Props) {
  const [properties, setProperties] = useState(initial);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filteredProperties = properties.filter((property) => {
    const haystack = [
      property.propertyRef,
      property.addressLine1,
      property.city,
      property.postcode,
      property.propertyType,
      property.landlord.landlordName,
      property.ownerAgent.agentDisplayName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  const totalPages = filteredProperties.length === 0 ? 0 : Math.ceil(filteredProperties.length / pageSize);
  const visibleProperties = filteredProperties.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="stack">
      <div style={{ padding: "0 1.25rem 1rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <UIInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Address, ref, landlord, agent, postcode"
          />
        </label>
      </div>

      <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Ref</th>
              <th>Type</th>
              <th>Beds</th>
              <th>Landlord</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleProperties.map((prop) => (
              <tr key={prop.id}>
                <td>
                  <Link
                    href={`/admin/properties/${prop.id}`}
                    style={{ color: "var(--brand-gold)", fontWeight: 600, display: "block", textDecoration: "none" }}
                  >
                    {prop.addressLine1 || prop.propertyRef}
                  </Link>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {[prop.city, prop.postcode].filter(Boolean).join(", ")}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/properties/${prop.id}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                    <code style={{ fontSize: "0.78rem" }}>{prop.propertyRef}</code>
                  </Link>
                </td>
                <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {prop.propertyType ?? "â€”"}
                </td>
                <td style={{ color: "var(--text-muted)" }}>
                  {prop.beds != null
                    ? `${prop.beds}${prop.baths != null ? ` / ${prop.baths}` : ""}`
                    : "â€”"}
                </td>
                <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {prop.landlord.landlordName}
                </td>
                <td>
                  <Link
                    href={`/admin/agents/${prop.ownerAgent.id}`}
                    style={{ fontSize: "0.82rem", color: "var(--brand-gold)" }}
                  >
                    {prop.ownerAgent.agentDisplayName}
                  </Link>
                </td>
                <td>
                  <PropertyStatusDropdown
                    propertyId={prop.id}
                    status={prop.status}
                    onUpdated={(newStatus) => {
                      setProperties((prev) =>
                        prev.map((p) => (p.id === prop.id ? { ...p, status: newStatus as PropertyStatus } : p)),
                      );
                    }}
                  />
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {formatDate(prop.createdAt)}
                </td>
                <td>
                  <div className="inline-row">
                    <Link
                      href={`/properties/${prop.id}/edit`}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                    >
                      Edit
                    </Link>
                    <AdminDeleteButton
                      label="Delete"
                      confirmMessage={`Permanently delete "${prop.addressLine1 || prop.propertyRef}"? This will also delete all associated rooms, sales, and tenant records. This cannot be undone.`}
                      deleteUrl={`/api/properties/${prop.id}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {visibleProperties.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  No properties match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "0 1.25rem 1.25rem" }}>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={filteredProperties.length}
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
