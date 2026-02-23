import Link from "next/link";
import { UserRole } from "@prisma/client";
import { UICard, UICardBody } from "@/components/ui/card";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session) {
    return null;
  }

  const landlordWhere =
    session.role === UserRole.ADMIN ? {} : { ownerAgentId: session.userId as string };
  const propertyWhere =
    session.role === UserRole.ADMIN ? {} : { ownerAgentId: session.userId as string };

  const [landlordsTotal, landlordsActive, propertiesTotal, agentsTotal] = await Promise.all([
    db.landlord.count({ where: landlordWhere }),
    db.landlord.count({ where: { ...landlordWhere, status: "ACTIVE" } }),
    db.property.count({ where: propertyWhere }),
    session.role === UserRole.ADMIN ? db.user.count({ where: { role: "AGENT" } }) : Promise.resolve(0),
  ]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {session.role === UserRole.ADMIN
              ? "Admin overview across all agents, landlords, and properties."
              : "Overview of your portfolio and recent activity."}
          </p>
        </div>
      </header>

      <div className="grid-cards">
        <div className="stat-card">
          <p className="stat-label">Landlords</p>
          <p className="stat-value">{landlordsTotal}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Landlords</p>
          <p className="stat-value">{landlordsActive}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Properties</p>
          <p className="stat-value">{propertiesTotal}</p>
        </div>
        {session.role === UserRole.ADMIN ? (
          <div className="stat-card">
            <p className="stat-label">Agents</p>
            <p className="stat-value">{agentsTotal}</p>
          </div>
        ) : null}
      </div>

      <UICard>
        <UICardBody>
          <div className="inline-row">
            <Link className="btn btn-primary" href="/landlords">
              Open Landlord Registry
            </Link>
            <Link className="btn btn-secondary" href="/landlords/new">
              Add Landlord
            </Link>
            {session.role === UserRole.ADMIN ? (
              <Link className="btn btn-secondary" href="/admin/agents">
                Manage Agents
              </Link>
            ) : null}
          </div>
        </UICardBody>
      </UICard>
    </div>
  );
}
