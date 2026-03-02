import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getAuthSession } from "@/server/auth";
import {
  formatDate,
  formatCurrency,
  formatPKR,
  gbpToPkr,
  GBP_TO_PKR,
} from "@/lib/format";
import { calcAgentCommissionGBP, describeCommission, type CommissionConfigData, type FlexibleRange } from "@/lib/commission";
import { SalesFilterBar } from "@/components/sales-filter-bar";
import { formatPeriodRange, isPeriodKey, parsePeriodToDateRange, type PeriodKey } from "@/lib/period";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    period?: string | string[];
    from?: string | string[];
    to?: string | string[];
  };
};

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSalesPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/admin/login");
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");

  const requestedPeriod = firstQueryValue(searchParams?.period);
  const period: PeriodKey = isPeriodKey(requestedPeriod) ? requestedPeriod : "month";
  const from = firstQueryValue(searchParams?.from);
  const to = firstQueryValue(searchParams?.to);
  const salesRange = parsePeriodToDateRange(period, from, to);
  const salesRangeLabel = formatPeriodRange(salesRange);

  const where = salesRange
    ? { closedAt: { gte: salesRange.gte, lte: salesRange.lte } }
    : {};

  const [agg, sales, commissionRaw] = await Promise.all([
    db.sale.aggregate({
      where,
      _sum: { finalAmount: true, commissionAmount: true, profit: true },
      _count: { id: true },
    }),
    db.sale.findMany({
      where,
      orderBy: [{ closedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        finalAmount: true,
        commissionAmount: true,
        profit: true,
        closedAt: true,
        closedBy: { select: { id: true, agentDisplayName: true } },
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
        tenant: { select: { id: true, fullName: true } },
      },
    }),
    db.commissionConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const commissionConfig: CommissionConfigData = commissionRaw
    ? {
        type: commissionRaw.type as "FIXED" | "FLEXIBLE",
        fixedAmount: commissionRaw.fixedAmount ? Number(commissionRaw.fixedAmount) : null,
        fixedCurrency: commissionRaw.fixedCurrency as CommissionConfigData["fixedCurrency"],
        flexibleRanges: commissionRaw.flexibleRanges as FlexibleRange[] | null,
      }
    : { type: "FIXED", fixedAmount: 5000, fixedCurrency: "PKR", flexibleRanges: null };

  const totalRevenue = Number(agg._sum.finalAmount ?? 0);
  const totalCommission = Number(agg._sum.commissionAmount ?? 0);
  const totalProfit = Number(agg._sum.profit ?? 0);
  const totalSales = agg._count.id;

  // Calculate total agent commission across all sales using the dynamic config
  const totalAgentCommGBP = sales.reduce(
    (sum, s) => sum + calcAgentCommissionGBP(Number(s.commissionAmount), commissionConfig),
    0
  );
  const totalAgentCommPKR = totalAgentCommGBP * GBP_TO_PKR;
  const commissionDesc = describeCommission(commissionConfig);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">All Sales</h1>
          <p className="page-subtitle">Platform-wide closed sales for {salesRangeLabel}.</p>
        </div>
      </header>

      <div className="panel" style={{ padding: "1rem 1.1rem" }}>
        <SalesFilterBar period={period} from={from} to={to} rangeLabel={salesRangeLabel} salesCount={totalSales} />
      </div>

      {totalSales > 0 && (
        <div className="admin-stats-grid-wide">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Sales Closed</p>
            <p className="admin-stat-value">{totalSales}</p>
            <p className="admin-stat-sub">{salesRangeLabel}</p>
          </div>
          <div className="admin-stat-card" style={{ borderTopColor: "var(--success)" }}>
            <p className="admin-stat-label">Total Revenue</p>
            <p className="admin-stat-value" style={{ color: "#4ade80", fontSize: "1.8rem" }}>
              {formatCurrency(totalRevenue)}
            </p>
            <p className="admin-stat-pkr">{formatPKR(gbpToPkr(totalRevenue))}</p>
          </div>
          <div className="admin-stat-card" style={{ borderTopColor: "var(--brand-gold)" }}>
            <p className="admin-stat-label">Company Commission</p>
            <p className="admin-stat-value" style={{ fontSize: "1.8rem" }}>
              {formatCurrency(totalCommission)}
            </p>
            <p className="admin-stat-pkr">{formatPKR(gbpToPkr(totalCommission))}</p>
          </div>
          <div className="admin-stat-card" style={{ borderTopColor: "#06b6d4" }}>
            <p className="admin-stat-label">Net Profit</p>
            <p className="admin-stat-value" style={{ color: "#22d3ee", fontSize: "1.8rem" }}>
              {formatCurrency(totalProfit)}
            </p>
            <p className="admin-stat-pkr">{formatPKR(gbpToPkr(totalProfit))}</p>
          </div>
        </div>
      )}

      {totalSales > 0 && (
        <div className="admin-stat-card" style={{ borderTopColor: "#a855f7", maxWidth: "360px" }}>
          <p className="admin-stat-label">Total Agent Commissions Paid</p>
          <p className="admin-stat-value" style={{ color: "#c084fc", fontSize: "1.8rem" }}>
            {formatPKR(totalAgentCommPKR)}
          </p>
          <p className="admin-stat-pkr">~ {formatCurrency(totalAgentCommGBP)} · {commissionDesc}</p>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            Sales History
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{totalSales} total</span>
        </div>

        {sales.length === 0 ? (
          <div className="admin-card-body">
            <p className="muted" style={{ margin: 0, textAlign: "center" }}>No sales closed for this period.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Landlord</th>
                  <th>Agent</th>
                  <th>Sale Amount</th>
                  <th>Company Commission</th>
                  <th>Net Profit</th>
                  <th>Agent Comm.</th>
                  <th>Tenant</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong style={{ display: "block", color: "var(--text)" }}>
                        {sale.property.addressLine1 ?? sale.property.propertyRef}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[sale.property.city, sale.property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {sale.property.landlord.landlordName}
                    </td>
                    <td>
                      {sale.closedBy && (
                        <Link
                          href={`/admin/agents/${sale.closedBy.id}`}
                          style={{ fontSize: "0.82rem", color: "var(--brand-gold)" }}
                        >
                          {sale.closedBy.agentDisplayName}
                        </Link>
                      )}
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
                      <span style={{ fontWeight: 700, color: "var(--brand-gold)", display: "block" }}>
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
                      {(() => {
                        const agentCommGBP = calcAgentCommissionGBP(Number(sale.commissionAmount), commissionConfig);
                        const agentCommPKR = agentCommGBP * GBP_TO_PKR;
                        return (
                          <>
                            <span style={{ fontWeight: 600, color: "#c084fc", display: "block" }}>
                              {formatCurrency(agentCommGBP)}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {formatPKR(agentCommPKR)}
                            </span>
                          </>
                        );
                      })()}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {sale.tenant?.fullName ?? "-"}
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
                      <span style={{ fontWeight: 700, color: "#c084fc", display: "block" }}>
                        {formatCurrency(totalAgentCommGBP)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {formatPKR(totalAgentCommPKR)}
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

