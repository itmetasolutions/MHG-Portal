import Link from "next/link";
import { PropertyStatus } from "@prisma/client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<PropertyStatus, { label: string; badgeClass: string }> = {
  AVAILABLE: { label: "Available", badgeClass: "badge-active" },
  CLOSED:    { label: "Closed",    badgeClass: "badge-sold"   },
  DRAFT:     { label: "Draft",     badgeClass: "badge-draft"  },
};

export default async function PropertiesPage() {
  const session = await getAuthSession();
  if (!session) return null;

  const where = { ownerAgentId: session.userId };

  const [total, byStatus, properties] = await Promise.all([
    db.property.count({ where }),
    db.property.groupBy({ by: ["status"], where, _count: { id: true } }),
    db.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        propertyRef: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postcode: true,
        propertyType: true,
        beds: true,
        baths: true,
        status: true,
        createdAt: true,
        landlord: { select: { id: true, landlordName: true } },
      },
    }),
  ]);

  const statusMap: Partial<Record<PropertyStatus, number>> = {};
  for (const g of byStatus) statusMap[g.status] = g._count.id;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Properties</h1>
          <p className="page-subtitle">All your properties including closed ones.</p>
        </div>
        <Link className="btn btn-primary" href="/properties/new">
          + Add Property
        </Link>
      </header>

      {/* Status breakdown */}
      {total > 0 && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <p className="section-label" style={{ marginBottom: "0.75rem" }}>By Status</p>
          <div className="status-breakdown">
            {(
              [
                ["AVAILABLE", "Available", "status-item-live" ],
                ["DRAFT",     "Draft",     "status-item-draft"],
                ["CLOSED",    "Closed",    "status-item-sold" ],
              ] as [PropertyStatus, string, string][]
            ).map(([s, label, cls]) => (
              <div key={s} className={`status-item ${cls}`}>
                <p className="status-item-count">{statusMap[s] ?? 0}</p>
                <p className="status-item-label">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Properties table */}
      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            All Properties
          </h2>
        </div>
        {properties.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No properties yet. <Link href="/properties/new" style={{ color: "var(--brand-gold)" }}>Add one →</Link>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Ref</th>
                  <th>Type</th>
                  <th>Beds</th>
                  <th>Landlord</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop) => (
                  <tr key={prop.id}>
                    <td>
                      <Link
                        href={`/landlords/${prop.landlord.id}`}
                        style={{ color: "var(--brand-gold)", fontWeight: 600, display: "block" }}
                      >
                        {prop.addressLine1}
                      </Link>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[prop.city, prop.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.78rem" }}>{prop.propertyRef}</code>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {prop.propertyType ?? "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {prop.beds != null ? `${prop.beds}${prop.baths != null ? ` / ${prop.baths}` : ""}` : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/landlords/${prop.landlord.id}`}
                        style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}
                      >
                        {prop.landlord.landlordName}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CONFIG[prop.status].badgeClass}`}>
                        {STATUS_CONFIG[prop.status].label}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(prop.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
