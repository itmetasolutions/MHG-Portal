import { UserRole } from "@prisma/client";
import { AgentsAdminClient } from "../agents-admin-client";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const agents = await db.user.findMany({
    where: { role: UserRole.AGENT },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
    },
  });

  return (
    <AgentsAdminClient
      initialAgents={agents.map((agent) => ({
        id: agent.id,
        email: agent.email,
        agentDisplayName: agent.agentDisplayName,
        isActive: agent.isActive,
        createdAt: agent.createdAt.toISOString(),
        ownedLandlords: agent._count.ownedLandlords,
        ownedProperties: agent._count.ownedProperties,
      }))}
    />
  );
}
