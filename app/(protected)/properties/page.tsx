"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { PropertyPreviewCard } from "@/components/property-preview-card";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { fetchProperties, togglePropertyWebsitePublish } from "@/lib/portal-api";
import { formatDate } from "@/lib/format";
import { PropertyStatusDropdown } from "@/components/property-status-dropdown";
import { PhoneLookupModal } from "@/components/phone-lookup-modal";

type RoomRow = {
  id: string;
  roomName: string;
  landlordDemand: string | null;
  expectedCommissionPct: string | null;
  status: "AVAILABLE" | "UNDER_OFFER" | "CLOSED";
  sale?: {
    id: string;
    finalAmount: string;
    tenant?: { id: string; fullName: string } | null;
    closedAt: string;
  } | null;
};

type PropertyRow = {
  id: string;
  propertyRef: string;
  title: string | null;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  status: "DRAFT" | "AVAILABLE" | "CLOSED";
  vacancyType: "SINGLE" | "MULTIPLE";
  createdAt: string;
  images?: Array<{ id: string; name: string; imageUrl?: string; dataUrl?: string }>;
  landlord: { id: string; landlordName: string };
  publishedToWebsite?: boolean;
  rooms?: RoomRow[];
};

function money(val: string | number | null | undefined) {
  if (!val) return "—";
  const n = Number(val);
  return isNaN(n) ? "—" : `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export default function PropertiesPage() {
  const [showLookup, setShowLookup] = useState(false);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchProperties({ search: search || undefined, page, pageSize });
    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load properties." });
      return;
    }
    setProperties(result.data.properties as unknown as PropertyRow[]);
    setTotal(result.data.pagination.total);
    setTotalPages(result.data.pagination.totalPages);
  }, [search, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  const byStatus = properties.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">{total} property {total === 1 ? "record" : "records"}.</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => setShowLookup(true)}>
            Start a Call
          </button>
          <Link className="btn btn-primary" href="/properties/add">
            Add a Property
          </Link>
        </div>
        <PhoneLookupModal open={showLookup} onClose={() => setShowLookup(false)} />
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">Search</span>
          <UIInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Title, description, address, postcode, landlord, property ref"
          />
        </label>
      </div>

      {properties.length > 0 && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>By Status</p>
          <div className="status-breakdown">
            {(
              [
                ["AVAILABLE", "Available", "status-item-live"],
                ["DRAFT", "Draft", "status-item-draft"],
                ["CLOSED", "Closed", "status-item-sold"],
              ] as [string, string, string][]
            ).map(([s, label, cls]) => (
              <div key={s} className={`status-item ${cls}`}>
                <p className="status-item-count">{byStatus[s] ?? 0}</p>
                <p className="status-item-label">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>All Properties</h2>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading properties...
          </div>
        ) : properties.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            No properties yet.{" "}
            <Link href="/properties/new" style={{ color: "var(--brand-gold)" }}>Add one →</Link>
          </div>
        ) : (
          <div style={{ padding: "1.25rem" }}>
            <div className="property-card-grid">
              {properties.map((prop) => {
                const isMultiple = prop.vacancyType === "MULTIPLE";

                return (
                  <PropertyPreviewCard
                    key={prop.id}
                    href={`/properties/${prop.id}`}
                    property={prop}
                    landlord={{
                      label: "Landlord",
                      name: prop.landlord.landlordName,
                      href: `/landlords/${prop.landlord.id}`,
                    }}
                    extra={
                      isMultiple ? (
                        <div className="stack" style={{ gap: "0.75rem" }}>
                          <div className="property-preview-section-label">Rooms</div>
                          <div className="room-chip-list">
                            {(prop.rooms ?? []).map((room) => (
                              <div key={room.id} className="room-chip">
                                <div className="room-chip-head">
                                  <strong>{room.roomName}</strong>
                                  <span className={`badge ${room.status === "AVAILABLE" ? "badge-active" : room.status === "CLOSED" ? "badge-sold" : "badge-offer"}`}>
                                    {room.status}
                                  </span>
                                </div>
                                <div className="room-chip-sub">
                                  {room.landlordDemand ? money(room.landlordDemand) : "No demand"}
                                  {room.sale?.tenant?.fullName ? ` | ${room.sale.tenant.fullName}` : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    }
                    footer={(
                      <div className="property-preview-footer-stack">
                        <div className="property-card-footer-note">Added {formatDate(prop.createdAt)}</div>
                        <div className="property-card-action-row" style={{ flexWrap: "wrap", gap: "0.5rem", display: "flex", alignItems: "center" }}>
                          <UIButton
                            type="button"
                            variant="secondary"
                            className="property-card-action-btn"
                            style={{
                              color: prop.publishedToWebsite ? "var(--success)" : "inherit",
                              borderColor: prop.publishedToWebsite ? "var(--success)" : "inherit",
                            }}
                            onClick={async () => {
                              const next = !prop.publishedToWebsite;
                              setProperties((prev) => prev.map((p) => p.id === prop.id ? { ...p, publishedToWebsite: next } : p));
                              const res = await togglePropertyWebsitePublish(prop.id, next);
                              if (!res.ok) {
                                setProperties((prev) => prev.map((p) => p.id === prop.id ? { ...p, publishedToWebsite: !next } : p));
                                setMessage({ type: "error", text: res.message || "Failed to update." });
                              }
                            }}
                          >
                            {prop.publishedToWebsite ? "✓ Published" : "Publish to Web"}
                          </UIButton>
                          <PropertyStatusDropdown
                            propertyId={prop.id}
                            status={prop.status}
                            onUpdated={(newStatus) =>
                              setProperties((prev) =>
                                prev.map((item) =>
                                  item.id === prop.id ? { ...item, status: newStatus as PropertyRow["status"] } : item,
                                ),
                              )
                            }
                            onMessage={setMessage}
                          />
                          <Link
                            href={`/properties/${prop.id}/edit`}
                            className="btn btn-secondary property-card-action-btn"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    )}
                  />
                );
              })}
            </div>
          </div>
        )}

        {!loading && total > 0 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              busy={loading}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
