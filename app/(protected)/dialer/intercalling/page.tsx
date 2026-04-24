import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function DialerIntercallingPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== UserRole.AGENT && session.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const agents = await db.user.findMany({
    where: {
      role: UserRole.AGENT,
      isActive: true,
      id: { not: session.userId },
    },
    orderBy: [{ agentDisplayName: "asc" }],
    select: {
      id: true,
      agentDisplayName: true,
      email: true,
      dialerSetting: {
        select: {
          extensionNumber: true,
          extensionName: true,
        },
      },
    },
  });

  const agentsWithExtension = agents.filter((agent) => Boolean(agent.dialerSetting?.extensionNumber));

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Internal routing
            </p>
            <h1 className="page-title">Intercalling</h1>
            <p className="page-subtitle">
              Call teammates directly by extension, with quick jump links into the live dialer.
            </p>
          </div>

          <div className="inline-row">
            <span className="badge badge-active">{agentsWithExtension.length} ready</span>
            <span className="badge badge-warning">{agents.length} active agents</span>
          </div>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Ready extensions</p>
            <p className="stat-value">{agentsWithExtension.length}</p>
            <p className="stat-sub">Agents available for internal calls</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Unavailable</p>
            <p className="stat-value">{agents.length - agentsWithExtension.length}</p>
            <p className="stat-sub">Agents without an extension configured</p>
          </article>
        </div>
      </header>

      <section className="dialer-card">
        <div className="dialer-card-head">
          <h2 className="dialer-card-title">Agent Extensions</h2>
          <Link href="/dialer" className="btn btn-secondary btn-sm">
            Open dialer
          </Link>
        </div>
        {agents.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No active agents found.
          </p>
        ) : (
          <div className="dialer-agent-list">
            {agents.map((agent) => {
              const extension = agent.dialerSetting?.extensionNumber ?? null;
              const dialHref = extension
                ? `/dialer?dial=${encodeURIComponent(extension)}&autocall=1`
                : null;
              return (
                <article key={agent.id} className="dialer-agent-item">
                  <div>
                    <p className="dialer-agent-name">{agent.agentDisplayName}</p>
                    <p className="dialer-agent-meta">
                      {extension ? `Ext ${extension}` : "No extension configured"} | {agent.email}
                    </p>
                    {agent.dialerSetting?.extensionName ? (
                      <p className="dialer-agent-meta" style={{ marginTop: "0.05rem" }}>
                        Alias: {agent.dialerSetting.extensionName}
                      </p>
                    ) : null}
                  </div>
                  {dialHref ? (
                    <Link className="btn btn-primary btn-sm" href={dialHref}>
                      Call
                    </Link>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" disabled>
                      Unavailable
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}