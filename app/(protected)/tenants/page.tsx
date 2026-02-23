import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const session = await getAuthSession();
  if (!session) return null;

  const where: Prisma.TenantWhereInput = {
    sale: { property: { ownerAgentId: session.userId } },
  };

  const [total, tenants] = await Promise.all([
    db.tenant.count({ where }),
    db.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        currentAddress: true,
        moveInDate: true,
        rentAmount: true,
        depositAmount: true,
        notes: true,
        createdAt: true,
        sale: {
          select: {
            property: {
              select: {
                id: true,
                propertyRef: true,
                addressLine1: true,
                city: true,
                postcode: true,
                landlord: { select: { id: true, landlordName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Tenants</h1>
          <p className="page-subtitle">{total} tenant {total === 1 ? "record" : "records"} from your closed sales.</p>
        </div>
      </header>

      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            All Tenants
          </h2>
        </div>
        {tenants.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No tenant records yet. Close a property sale to add a tenant.
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Contact</th>
                  <th>Property</th>
                  <th>Move-In</th>
                  <th>Rent / Deposit</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>
                      {tenant.fullName}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {tenant.email && (
                        <span style={{ display: "block" }}>{tenant.email}</span>
                      )}
                      {tenant.phone && <span>{tenant.phone}</span>}
                    </td>
                    <td>
                      <Link
                        href={`/landlords/${tenant.sale.property.landlord.id}`}
                        style={{ color: "var(--brand-gold)", fontWeight: 600, display: "block" }}
                      >
                        {tenant.sale.property.addressLine1 ?? tenant.sale.property.propertyRef ?? "—"}
                      </Link>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[tenant.sale.property.city, tenant.sale.property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {tenant.moveInDate
                        ? new Date(tenant.moveInDate).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {tenant.rentAmount
                        ? (
                          <span style={{ color: "#4ade80", fontWeight: 600 }}>
                            £{Number(tenant.rentAmount).toLocaleString("en-GB")}/mo
                          </span>
                        )
                        : <span className="muted">—</span>}
                      {tenant.depositAmount && (
                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          dep: £{Number(tenant.depositAmount).toLocaleString("en-GB")}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(tenant.createdAt)}
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
