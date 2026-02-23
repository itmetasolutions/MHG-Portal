import Link from "next/link";
import { Prisma, UserRole } from "@prisma/client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session) return null;

  const isAdmin = session.role === UserRole.ADMIN;

  const landlordWhere: Prisma.LandlordWhereInput = isAdmin ? {} : { ownerAgentId: session.userId };
  const propertyWhere: Prisma.PropertyWhereInput = isAdmin ? {} : { ownerAgentId: session.userId };
  const activeLandlordWhere: Prisma.LandlordWhereInput = {
    ...landlordWhere,
    properties: { some: {} },
  };

  const [user, landlordsTotal, landlordsActive, propertiesTotal, agentsTotal, recentLandlords] =
    await Promise.all([
      db.user.findUnique({
        where: { id: session.userId },
        select: { agentDisplayName: true },
      }),
      db.landlord.count({ where: landlordWhere }),
      db.landlord.count({ where: activeLandlordWhere }),
      db.property.count({ where: propertyWhere }),
      isAdmin ? db.user.count({ where: { role: "AGENT" } }) : Promise.resolve(0),
      db.landlord.findMany({
        where: landlordWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          landlordName: true,
          landlordNumber: true,
          createdAt: true,
          ownerAgent: { select: { agentDisplayName: true } },
          _count: { select: { properties: true } },
        },
      }),
    ]);

  const displayName = user?.agentDisplayName ?? session.email;
  const landlordsPassive = landlordsTotal - landlordsActive;

  return (
    <div className="stack">
      {/* Welcome Banner */}
      <div className="dashboard-welcome">
        <h1 className="dashboard-welcome-title">
          Welcome back, {displayName}
        </h1>
        <p className="dashboard-welcome-sub">
          {isAdmin
            ? "Platform-wide overview of all agents, landlords, and properties."
            : "Here's your portfolio summary for today."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid-cards">
        <div className="stat-card">
          <p className="stat-label">Total Landlords</p>
          <p className="stat-value">{landlordsTotal}</p>
          <p className="stat-sub">{landlordsPassive} passive</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Landlords</p>
          <p className="stat-value">{landlordsActive}</p>
          <p className="stat-sub">
            {landlordsTotal > 0
              ? `${Math.round((landlordsActive / landlordsTotal) * 100)}% active`
              : "0% active"}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Properties</p>
          <p className="stat-value">{propertiesTotal}</p>
          <p className="stat-sub">Managed properties</p>
        </div>
        {isAdmin && (
          <div className="stat-card">
            <p className="stat-label">Agents</p>
            <p className="stat-value">{agentsTotal}</p>
            <p className="stat-sub">Registered agents</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "var(--text-muted)",
          }}
        >
          Quick Actions
        </h2>
        <div className="agent-actions-grid">
          <Link href="/landlords/new" className="agent-action-card">
            <div className="agent-action-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
            </div>
            <div>
              <p className="agent-action-label">Add Landlord</p>
              <p className="agent-action-desc">Register a new landlord entry</p>
            </div>
          </Link>

          <Link href="/landlords" className="agent-action-card">
            <div className="agent-action-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="agent-action-label">Landlord Registry</p>
              <p className="agent-action-desc">Browse and manage landlords</p>
            </div>
          </Link>

          <Link href="/profile" className="agent-action-card">
            <div className="agent-action-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="agent-action-label">My Profile</p>
              <p className="agent-action-desc">Edit name and password</p>
            </div>
          </Link>

          {isAdmin && (
            <Link href="/admin" className="agent-action-card">
              <div className="agent-action-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7Zm5-3a.75.75 0 0 0 0 1.5A1.5 1.5 0 0 1 14.5 7 .75.75 0 0 0 16 7a3 3 0 0 0-3-3Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="agent-action-label">Admin Panel</p>
                <p className="agent-action-desc">Manage agents and audit logs</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Landlords */}
      {recentLandlords.length > 0 && (
        <div className="panel">
          <div
            style={{
              padding: "0.9rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              Recent Landlords
            </h2>
            <Link
              href="/landlords"
              style={{
                fontSize: "0.82rem",
                color: "var(--brand-gold)",
                fontWeight: 600,
              }}
            >
              View All →
            </Link>
          </div>
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Number</th>
                  <th>Status</th>
                  {isAdmin && <th>Agent</th>}
                  <th>Properties</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {recentLandlords.map((landlord) => (
                  <tr key={landlord.id}>
                    <td>
                      <Link
                        href={`/landlords/${landlord.id}`}
                        style={{ color: "var(--brand-gold)", fontWeight: 600 }}
                      >
                        {landlord.landlordName}
                      </Link>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{landlord.landlordNumber}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          landlord._count.properties > 0 ? "badge-active" : "badge-passive"
                        }`}
                      >
                        {landlord._count.properties > 0 ? "ACTIVE" : "PASSIVE"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {landlord.ownerAgent?.agentDisplayName ?? "—"}
                      </td>
                    )}
                    <td className="gold" style={{ fontWeight: 600 }}>
                      {landlord._count.properties}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {formatDate(landlord.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
