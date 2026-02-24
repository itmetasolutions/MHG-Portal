import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import {
  formatDate,
  formatCurrency,
  formatPKR,
  gbpToPkr,
  pkrToGbp,
  AGENT_COMMISSION_PKR,
} from "@/lib/format";

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

  // Agent commission: fixed PKR 5,000 per closed sale
  const myCommissionPKR = totalSales * AGENT_COMMISSION_PKR;
  const myCommissionGBP = pkrToGbp(myCommissionPKR);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Sales</h1>
          <p className="page-subtitle">All closed sales on your properties.</p>
        </div>
      </header>

      {/* ── Row 1: Hero cards ───────────────────────────────────────────── */}
      <div className="agent-stats-grid-2">
        <div className="stat-card">
          <p className="stat-label">Sales Closed</p>
          <p className="stat-value">{totalSales}</p>
          <p className="stat-sub">Total completed</p>
        </div>
        <div className="stat-card stat-card-money">
          <p className="stat-label">My Commission Earned</p>
          <p className="stat-value" style={{ fontSize: "1.5rem", color: "var(--brand-gold)" }}>
            {formatPKR(myCommissionPKR)}
          </p>
          <p className="stat-pkr-sub">
            ≈ {formatCurrency(myCommissionGBP)} · PKR {AGENT_COMMISSION_PKR.toLocaleString("en-US")}/sale
          </p>
        </div>
      </div>

      {/* ── Row 2: Financial breakdown ──────────────────────────────────── */}
      {totalSales > 0 && (
        <div className="grid-cards">
          <div className="stat-card stat-card-money">
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value stat-value-money" style={{ fontSize: "1.5rem" }}>
              {formatCurrency(totalRevenue)}
            </p>
            <p className="stat-pkr-sub">{formatPKR(gbpToPkr(totalRevenue))}</p>
          </div>
          <div className="stat-card stat-card-money">
            <p className="stat-label">Co. Commission</p>
            <p className="stat-value stat-value-money" style={{ fontSize: "1.5rem" }}>
              {formatCurrency(totalCommission)}
            </p>
            <p className="stat-pkr-sub">{formatPKR(gbpToPkr(totalCommission))}</p>
          </div>
          <div className="stat-card stat-card-profit">
            <p className="stat-label">Net Profit</p>
            <p className="stat-value stat-value-profit" style={{ fontSize: "1.5rem" }}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="stat-pkr-sub">{formatPKR(gbpToPkr(totalProfit))}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Avg Sale Value</p>
            <p className="stat-value" style={{ fontSize: "1.5rem" }}>
              {formatCurrency(Math.round(totalRevenue / totalSales))}
            </p>
            <p className="stat-pkr-sub">{formatPKR(gbpToPkr(Math.round(totalRevenue / totalSales)))}</p>
          </div>
        </div>
      )}

      {/* ── Sales table ─────────────────────────────────────────────────── */}
      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            Sales Breakdown
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
                  <th>#</th>
                  <th>Property</th>
                  <th>Landlord</th>
                  <th>Sale Amount</th>
                  <th>Co. Commission</th>
                  <th>Net Profit</th>
                  <th>My Comm.</th>
                  <th>Tenant</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, idx) => (
                  <tr key={sale.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{idx + 1}</td>
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
                    <td>
                      <span style={{ fontWeight: 700, color: "#4ade80", display: "block" }}>
                        {formatCurrency(Number(sale.finalAmount))}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(gbpToPkr(Number(sale.finalAmount)))}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--brand-gold)", display: "block" }}>
                        {formatCurrency(Number(sale.commissionAmount))}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(gbpToPkr(Number(sale.commissionAmount)))}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#22d3ee", display: "block" }}>
                        {formatCurrency(Number(sale.profit))}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(gbpToPkr(Number(sale.profit)))}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--brand-gold)", display: "block" }}>
                        {formatPKR(AGENT_COMMISSION_PKR)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ≈ {formatCurrency(pkrToGbp(AGENT_COMMISSION_PKR))}
                      </span>
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
              {sales.length > 1 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)" }}>
                    <td
                      colSpan={3}
                      style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: "0.82rem", padding: "0.6rem 0.75rem" }}
                    >
                      Totals ({totalSales} sales)
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#4ade80", display: "block" }}>
                        {formatCurrency(totalRevenue)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(gbpToPkr(totalRevenue))}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--brand-gold)", display: "block" }}>
                        {formatCurrency(totalCommission)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(gbpToPkr(totalCommission))}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#22d3ee", display: "block" }}>
                        {formatCurrency(totalProfit)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(gbpToPkr(totalProfit))}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--brand-gold)", display: "block" }}>
                        {formatPKR(myCommissionPKR)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ≈ {formatCurrency(myCommissionGBP)}
                      </span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
