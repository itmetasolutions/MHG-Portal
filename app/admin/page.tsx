import Link from "next/link";
import { UserRole } from "@prisma/client";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    agentCount,
    activeAgentCount,
    landlordCount,
    propertyCount,
    activeLandlordCount,
    recentAgents,
    recentAudit,
  ] = await Promise.all([
    db.user.count({ where: { role: UserRole.AGENT } }),
    db.user.count({ where: { role: UserRole.AGENT, isActive: true } }),
    db.landlord.count(),
    db.property.count(),
    db.landlord.count({ where: { status: "ACTIVE" } }),
    db.user.findMany({
      where: { role: UserRole.AGENT },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        agentDisplayName: true,
        isActive: true,
        createdAt: true,
        _count: { select: { ownedLandlords: true } },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        entityType: true,
        action: true,
        createdAt: true,
        user: { select: { agentDisplayName: true, email: true } },
      },
    }),
  ]);

  const inactiveAgents = agentCount - activeAgentCount;

  return (
    <div className="stack">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Platform overview — agents, landlords, properties &amp; activity.
          </p>
        </div>
        <div className="inline-row">
          <Link className="admin-action-btn admin-action-btn-primary" href="/admin/agents">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.058.468.172.92.57 1.175A9.953 9.953 0 0 0 8 18c1.982 0 3.83-.574 5.384-1.572.398-.254.628-.707.57-1.175a6.001 6.001 0 0 0-11.908 0ZM12.75 7.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5ZM12 10.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75ZM12.75 13.25a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" />
            </svg>
            Add Agent
          </Link>
          <Link className="admin-action-btn admin-action-btn-secondary" href="/admin/audit">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
            </svg>
            Audit Logs
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
            </svg>
          </div>
          <p className="admin-stat-label">Total Agents</p>
          <p className="admin-stat-value">{agentCount}</p>
          <p className="admin-stat-sub">
            {activeAgentCount} active · {inactiveAgents} disabled
          </p>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="admin-stat-label">Active Agents</p>
          <p className="admin-stat-value">{activeAgentCount}</p>
          <p className="admin-stat-sub">
            {agentCount > 0 ? Math.round((activeAgentCount / agentCount) * 100) : 0}% of total
          </p>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="admin-stat-label">Total Landlords</p>
          <p className="admin-stat-value">{landlordCount}</p>
          <p className="admin-stat-sub">
            {activeLandlordCount} active in registry
          </p>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v11a3 3 0 1 0 6 0V4a2 2 0 0 0-2-2H4Zm1 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5-1.757 4.9-4.9a2 2 0 0 0 0-2.828L13.485 5.1a2 2 0 0 0-2.828 0L10 5.757v8.486ZM16 17H9.071l6-6H16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="admin-stat-label">Total Properties</p>
          <p className="admin-stat-value">{propertyCount}</p>
          <p className="admin-stat-sub">Across all agents</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="two-col">
        {/* Recent Agents */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
              </svg>
              Recent Agents
            </h2>
            <Link className="btn btn-sm btn-secondary" href="/admin/agents">
              View All
            </Link>
          </div>
          <div style={{ padding: 0 }}>
            {recentAgents.length === 0 ? (
              <div className="admin-card-body">
                <p className="muted" style={{ margin: 0, textAlign: "center" }}>
                  No agents yet.
                </p>
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Status</th>
                      <th>Landlords</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td>
                          <strong>{agent.agentDisplayName}</strong>
                          <span className="muted" style={{ display: "block", fontSize: "0.78rem" }}>
                            {agent.email}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${agent.isActive ? "badge-active" : "badge-locked"}`}>
                            {agent.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="gold">{agent._count.ownedLandlords}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
              </svg>
              Recent Activity
            </h2>
            <Link className="btn btn-sm btn-secondary" href="/admin/audit">
              Full Log
            </Link>
          </div>
          <div style={{ padding: 0 }}>
            {recentAudit.length === 0 ? (
              <div className="admin-card-body">
                <p className="muted" style={{ margin: 0, textAlign: "center" }}>
                  No audit records yet.
                </p>
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>By</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudit.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "var(--brand-gold)",
                              fontFamily: "monospace",
                            }}
                          >
                            {log.action}
                          </span>
                          <span
                            className="muted"
                            style={{ display: "block", fontSize: "0.72rem" }}
                          >
                            {log.entityType}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>
                          {log.user.agentDisplayName}
                        </td>
                        <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {formatDateTime(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
            </svg>
            Quick Actions
          </h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-quick-actions">
            <Link className="admin-action-btn admin-action-btn-primary" href="/admin/agents">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.058.468.172.92.57 1.175A9.953 9.953 0 0 0 8 18c1.982 0 3.83-.574 5.384-1.572.398-.254.628-.707.57-1.175a6.001 6.001 0 0 0-11.908 0ZM12.75 7.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5ZM12 10.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75ZM12.75 13.25a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" />
              </svg>
              Manage Agents
            </Link>
            <Link className="admin-action-btn admin-action-btn-secondary" href="/admin/audit">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
              </svg>
              View Audit Logs
            </Link>
            <Link className="admin-action-btn admin-action-btn-secondary" href="/landlords">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
              </svg>
              Landlord Registry
            </Link>
            <Link className="admin-action-btn admin-action-btn-secondary" href="/landlords/new">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Add Landlord
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
