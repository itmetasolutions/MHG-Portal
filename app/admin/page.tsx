import Link from "next/link";
import { UserRole } from "@prisma/client";
import { UICard, UICardBody } from "@/components/ui/card";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [agentCount, activeAgentCount, landlordCount, propertyCount] = await Promise.all([
    db.user.count({ where: { role: UserRole.AGENT } }),
    db.user.count({ where: { role: UserRole.AGENT, isActive: true } }),
    db.landlord.count(),
    db.property.count(),
  ]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage agents and monitor overall registry volume.</p>
        </div>
      </header>

      <div className="grid-cards">
        <div className="stat-card">
          <p className="stat-label">Agents</p>
          <p className="stat-value">{agentCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Agents</p>
          <p className="stat-value">{activeAgentCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Landlords</p>
          <p className="stat-value">{landlordCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Properties</p>
          <p className="stat-value">{propertyCount}</p>
        </div>
      </div>

      <UICard>
        <UICardBody>
          <div className="inline-row">
            <Link className="btn btn-primary" href="/admin/agents">
              Manage Agents
            </Link>
            <Link className="btn btn-secondary" href="/admin/audit">
              View Audit Logs
            </Link>
            <Link className="btn btn-secondary" href="/landlords">
              Open Registry
            </Link>
          </div>
        </UICardBody>
      </UICard>
    </div>
  );
}
