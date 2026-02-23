import Link from "next/link";
import { PropertyStatus, UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<PropertyStatus, { label: string; badgeClass: string }> = {
  LIVE: { label: "Live", badgeClass: "badge-active" },
  UNDER_OFFER: { label: "Under Offer", badgeClass: "badge-offer" },
  SOLD: { label: "Sold", badgeClass: "badge-sold" },
  DRAFT: { label: "Draft", badgeClass: "badge-draft" },
  WITHDRAWN: { label: "Withdrawn", badgeClass: "badge-locked" },
};

type Props = {
  params: {
    id: string;
  };
};

export default async function AdminAgentDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const admin = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!admin || !admin.isActive) redirect("/admin/login");
  if (admin.role !== UserRole.ADMIN) redirect("/dashboard");

  const agent = await db.user.findFirst({
    where: {
      id: params.id,
      role: UserRole.AGENT,
    },
    select: {
      id: true,
      email: true,
      agentDisplayName: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          ownedLandlords: true,
          ownedProperties: true,
        },
      },
      ownedProperties: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          propertyRef: true,
          addressLine1: true,
          city: true,
          postcode: true,
          propertyType: true,
          beds: true,
          baths: true,
          status: true,
          createdAt: true,
          landlord: { select: { id: true, landlordName: true } },
          sale: {
            select: {
              id: true,
              finalAmount: true,
              commissionAmount: true,
              profit: true,
              closedAt: true,
              tenant: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  moveInDate: true,
                  rentAmount: true,
                  depositAmount: true,
                },
              },
            },
          },
        },
      },
      ownedLandlords: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          landlordName: true,
          landlordNumber: true,
          email: true,
          phoneE164: true,
          createdAt: true,
          _count: { select: { properties: true } },
        },
      },
    },
  });

  if (!agent) notFound();

  const soldProperties = agent.ownedProperties.filter((property) => property.sale !== null);
  const tenantProperties = soldProperties.filter((property) => property.sale?.tenant !== null);
  const totalRevenue = soldProperties.reduce(
    (sum, property) => sum + Number(property.sale?.finalAmount ?? 0),
    0,
  );
  const totalCommission = soldProperties.reduce(
    (sum, property) => sum + Number(property.sale?.commissionAmount ?? 0),
    0,
  );
  const totalProfit = soldProperties.reduce(
    (sum, property) => sum + Number(property.sale?.profit ?? 0),
    0,
  );

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <Link
            href="/admin/agents"
            style={{
              display: "inline-block",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              textDecoration: "none",
              marginBottom: "0.35rem",
            }}
          >
            {"<-"} Back to Agents
          </Link>
          <h1 className="page-title">{agent.agentDisplayName}</h1>
          <p className="page-subtitle">
            {agent.email} - {agent.isActive ? "Active" : "Disabled"} - Joined{" "}
            {formatDate(agent.createdAt)}
          </p>
        </div>
        <span
          className={`badge ${agent.isActive ? "badge-active" : "badge-locked"}`}
          style={{ fontSize: "0.85rem", padding: "0.3rem 0.75rem" }}
        >
          {agent.isActive ? "Active" : "Disabled"}
        </span>
      </header>

      <div className="admin-stats-grid-wide">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Landlords</p>
          <p className="admin-stat-value">{agent._count.ownedLandlords}</p>
          <p className="admin-stat-sub">Registered</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Properties</p>
          <p className="admin-stat-value">{agent._count.ownedProperties}</p>
          <p className="admin-stat-sub">{soldProperties.length} sold</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Sales Closed</p>
          <p
            className="admin-stat-value"
            style={{ color: soldProperties.length > 0 ? "#4ade80" : undefined }}
          >
            {soldProperties.length}
          </p>
          <p className="admin-stat-sub">Completed sales</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tenants</p>
          <p
            className="admin-stat-value"
            style={{ color: tenantProperties.length > 0 ? "var(--brand-gold)" : undefined }}
          >
            {tenantProperties.length}
          </p>
          <p className="admin-stat-sub">Tenant records</p>
        </div>
        <div className="admin-stat-card" style={{ borderTopColor: "var(--brand-gold)" }}>
          <p className="admin-stat-label">Commission</p>
          <p className="admin-stat-value" style={{ fontSize: "1.8rem" }}>
            {totalCommission > 0 ? formatCurrency(totalCommission) : "-"}
          </p>
          <p className="admin-stat-sub">Total earned</p>
        </div>
        <div className="admin-stat-card" style={{ borderTopColor: "var(--success)" }}>
          <p className="admin-stat-label">Revenue</p>
          <p className="admin-stat-value" style={{ color: "#4ade80", fontSize: "1.8rem" }}>
            {totalRevenue > 0 ? formatCurrency(totalRevenue) : "-"}
          </p>
          <p className="admin-stat-sub">Total sale amounts</p>
        </div>
        <div className="admin-stat-card" style={{ borderTopColor: "#06b6d4" }}>
          <p className="admin-stat-label">Net Profit</p>
          <p className="admin-stat-value" style={{ color: "#22d3ee", fontSize: "1.8rem" }}>
            {totalProfit > 0 ? formatCurrency(totalProfit) : "-"}
          </p>
          <p className="admin-stat-sub">After all costs</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Avg Sale Value</p>
          <p className="admin-stat-value" style={{ fontSize: "1.8rem" }}>
            {soldProperties.length > 0
              ? formatCurrency(Math.round(totalRevenue / soldProperties.length))
              : "-"}
          </p>
          <p className="admin-stat-sub">Per closed sale</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4 2a2 2 0 0 0-2 2v11a3 3 0 1 0 6 0V4a2 2 0 0 0-2-2H4Zm1 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5-1.757 4.9-4.9a2 2 0 0 0 0-2.828L13.485 5.1a2 2 0 0 0-2.828 0L10 5.757v8.486ZM16 17H9.071l6-6H16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2Z"
                clipRule="evenodd"
              />
            </svg>
            Properties
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {agent._count.ownedProperties} total
          </span>
        </div>
        {agent.ownedProperties.length === 0 ? (
          <div className="admin-card-body">
            <p className="muted" style={{ margin: 0, textAlign: "center" }}>
              No properties yet.
            </p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Type / Beds</th>
                  <th>Landlord</th>
                  <th>Status</th>
                  <th>Sale Amount</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {agent.ownedProperties.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <strong style={{ display: "block", color: "var(--text)" }}>
                        {property.addressLine1 ?? property.propertyRef}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[property.city, property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {property.propertyType ?? "-"}
                      {property.beds != null ? ` - ${property.beds} bed` : ""}
                      {property.baths != null ? ` / ${property.baths} bath` : ""}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {property.landlord.landlordName}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CONFIG[property.status].badgeClass}`}>
                        {STATUS_CONFIG[property.status].label}
                      </span>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: property.sale ? "#4ade80" : "var(--text-subtle)",
                      }}
                    >
                      {property.sale ? formatCurrency(Number(property.sale.finalAmount)) : "-"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(property.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {soldProperties.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
              Closed Sales
            </h2>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {soldProperties.length} sales
            </span>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
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
                {soldProperties.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <strong style={{ display: "block", color: "var(--text)" }}>
                        {property.addressLine1 ?? property.propertyRef}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {[property.city, property.postcode].filter(Boolean).join(", ")}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#4ade80" }}>
                      {formatCurrency(Number(property.sale!.finalAmount))}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--brand-gold)" }}>
                      {formatCurrency(Number(property.sale!.commissionAmount))}
                    </td>
                    <td style={{ fontWeight: 600, color: "#22d3ee" }}>
                      {formatCurrency(Number(property.sale!.profit))}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {property.sale!.tenant?.fullName ?? "-"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(property.sale!.closedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tenantProperties.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
              </svg>
              Tenants
            </h2>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {tenantProperties.length} records
            </span>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
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
                {tenantProperties.map((property) => {
                  const tenant = property.sale!.tenant!;
                  return (
                    <tr key={property.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>{tenant.fullName}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {tenant.email && <span style={{ display: "block" }}>{tenant.email}</span>}
                        {tenant.phone && <span>{tenant.phone}</span>}
                      </td>
                      <td>
                        <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--text)" }}>
                          {property.addressLine1 ?? property.propertyRef}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {[property.city, property.postcode].filter(Boolean).join(", ")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {tenant.moveInDate
                          ? new Date(tenant.moveInDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {tenant.rentAmount ? (
                          <span style={{ color: "#4ade80", fontWeight: 600 }}>
                            GBP {Number(tenant.rentAmount).toLocaleString("en-GB")}/mo
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                        {tenant.depositAmount && (
                          <span
                            style={{
                              display: "block",
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                            }}
                          >
                            dep: GBP {Number(tenant.depositAmount).toLocaleString("en-GB")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
                clipRule="evenodd"
              />
            </svg>
            Landlords
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {agent._count.ownedLandlords} total
          </span>
        </div>
        {agent.ownedLandlords.length === 0 ? (
          <div className="admin-card-body">
            <p className="muted" style={{ margin: 0, textAlign: "center" }}>
              No landlords yet.
            </p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Number</th>
                  <th>Contact</th>
                  <th>Properties</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {agent.ownedLandlords.map((landlord) => (
                  <tr key={landlord.id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{landlord.landlordName}</td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{landlord.landlordNumber}</code>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {landlord.email && <span style={{ display: "block" }}>{landlord.email}</span>}
                      {landlord.phoneE164 && <span>{landlord.phoneE164}</span>}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--brand-gold)" }}>
                      {landlord._count.properties}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          landlord._count.properties > 0 ? "badge-active" : "badge-passive"
                        }`}
                      >
                        {landlord._count.properties > 0 ? "Active" : "Passive"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(landlord.createdAt)}
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
