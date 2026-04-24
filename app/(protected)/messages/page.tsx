import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { AgentMessagesClient } from "./messages-client";

export const dynamic = "force-dynamic";

export default async function AgentMessagesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.role !== UserRole.AGENT) redirect("/admin");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { agentDisplayName: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/login");

  const contacts = await db.user.findMany({
    where: { isActive: true, id: { not: session.userId } },
    select: { id: true, agentDisplayName: true, email: true, role: true, profilePicture: true },
    orderBy: [{ role: "asc" }, { agentDisplayName: "asc" }],
  });

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Team communication
            </p>
            <h1 className="page-title">Messages</h1>
            <p className="page-subtitle">
              A Slack-style workspace for direct messages, quick replies, and follow-up coordination across the team.
            </p>
          </div>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Contacts</p>
            <p className="stat-value">{contacts.length}</p>
            <p className="stat-sub">Active teammates and admin contacts</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Online-ready</p>
            <p className="stat-value">{contacts.filter((contact) => contact.role === "ADMIN").length}</p>
            <p className="stat-sub">Admins surfaced first for escalation</p>
          </article>
        </div>
      </header>

      <AgentMessagesClient
        agentId={session.userId}
        contacts={contacts.map((c) => ({
          id: c.id,
          name: c.agentDisplayName,
          email: c.email,
          role: c.role as string,
          profilePicture: c.profilePicture,
        }))}
      />
    </div>
  );
}