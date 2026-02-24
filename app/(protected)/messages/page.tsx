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

  const admin = await db.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    select: { id: true, agentDisplayName: true },
  });

  return (
    <AgentMessagesClient
      agentId={session.userId}
      adminId={admin?.id ?? null}
      adminName={admin?.agentDisplayName ?? "Admin"}
    />
  );
}
