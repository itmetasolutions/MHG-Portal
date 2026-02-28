import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getAuthSession } from "@/server/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/admin/login");
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");

  const [total, tenants] = await Promise.all([
    db.tenant.count(),
    db.tenant.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
                ownerAgent: { select: { id: true, agentDisplayName: true } },
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
          <h1 className="page-title">All Tenants</h1>
          <p className="page-subtitle">
            {total} tenant {total !== 1 ? "records" : "record"} platform-wide
          </p>
        </div>
      </header>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
            </svg>
            Tenant Records
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{total} total</span>
        </div>

        {tenants.length === 0 ? (
          <div className="admin-card-body">
            <p className="muted" style={{ margin: 0, textAlign: "center" }}>No tenant records yet.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Contact</th>
                  <th>Property</th>
                  <th>Agent</th>
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
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {tenant.email && <span style={{ display: "block" }}>{tenant.email}</span>}
                      {tenant.phone && <span>{tenant.phone}</span>}
                    </td>
                    <td>
                      <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--text)" }}>
                        {tenant.sale.property.addressLine1 ?? tenant.sale.property.propertyRef ?? "—"}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[tenant.sale.property.city, tenant.sale.property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/agents/${tenant.sale.property.ownerAgent.id}`}
                        style={{ fontSize: "0.82rem", color: "var(--brand-gold)" }}
                      >
                        {tenant.sale.property.ownerAgent.agentDisplayName}
                      </Link>
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
                            {'\u00A3'}{Number(tenant.rentAmount).toLocaleString("en-GB")}/mo
                          </span>
                        )
                        : <span className="muted">—</span>}
                      {tenant.depositAmount && (
                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          dep: {'\u00A3'}{Number(tenant.depositAmount).toLocaleString("en-GB")}
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
