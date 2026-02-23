import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { formatDate, formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const session = await getAuthSession();
  if (!session) return null;

  const where: Prisma.SaleWhereInput = { property: { ownerAgentId: session.userId } };

  const [agg, sales] = await Promise.all([
    db.sale.aggregate({
      where,
      _sum: { finalAmount: true, commissionAmount: true, profit: true },
      _count: { id: true },
    }),
    db.sale.findMany({
      where,
      orderBy: { closedAt: "desc" },
      select: {
        id: true,
        finalAmount: true,
        commissionAmount: true,
        profit: true,
        closedAt: true,
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
        tenant: {
          select: { id: true, fullName: true },
        },
      },
    }),
  ]);

  const totalRevenue    = Number(agg._sum.finalAmount     ?? 0);
  const totalCommission = Number(agg._sum.commissionAmount ?? 0);
  const totalProfit     = Number(agg._sum.profit          ?? 0);
  const totalSales      = agg._count.id;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Sales</h1>
          <p className="page-subtitle">All closed sales on your properties.</p>
        </div>
      </header>

      {/* Financial summary */}
      {totalSales > 0 && (
        <div className="grid-cards">
          <div className="stat-card">
            <p className="stat-label">Sales Closed</p>
            <p className="stat-value">{totalSales}</p>
            <p className="stat-sub">Total completed</p>
          </div>
          <div className="stat-card stat-card-money">
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value stat-value-money" style={{ fontSize: "1.65rem" }}>
              {formatCurrency(totalRevenue)}
            </p>
            <p className="stat-sub">Combined final amounts</p>
          </div>
          <div className="stat-card stat-card-money">
            <p className="stat-label">Commission Earned</p>
            <p className="stat-value stat-value-money" style={{ fontSize: "1.65rem" }}>
              {formatCurrency(totalCommission)}
            </p>
            <p className="stat-sub">
              {totalRevenue > 0
                ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}% avg rate`
                : "—"}
            </p>
          </div>
          <div className="stat-card stat-card-profit">
            <p className="stat-label">Net Profit</p>
            <p className="stat-value stat-value-profit" style={{ fontSize: "1.65rem" }}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="stat-sub">After all costs</p>
          </div>
        </div>
      )}

      {/* Sales table */}
      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            All Sales
          </h2>
        </div>
        {sales.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No closed sales yet.
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Landlord</th>
                  <th>Sale Amount</th>
                  <th>Commission</th>
                  <th>Net Profit</th>
                  <th>Tenant</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <Link
                        href={`/landlords/${sale.property.landlord.id}`}
                        style={{ color: "var(--brand-gold)", fontWeight: 600, display: "block" }}
                      >
                        {sale.property.addressLine1 ?? sale.property.propertyRef}
                      </Link>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[sale.property.city, sale.property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/landlords/${sale.property.landlord.id}`}
                        style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}
                      >
                        {sale.property.landlord.landlordName}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 700, color: "#4ade80" }}>
                      {formatCurrency(Number(sale.finalAmount))}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--brand-gold)" }}>
                      {formatCurrency(Number(sale.commissionAmount))}
                    </td>
                    <td style={{ fontWeight: 600, color: "#22d3ee" }}>
                      {formatCurrency(Number(sale.profit))}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {sale.tenant?.fullName ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(sale.closedAt)}
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
