import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { AgentShell } from "./agent-shell";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== UserRole.AGENT) {
    redirect("/admin");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      agentDisplayName: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return (
    <AgentShell
      user={{
        name: user.agentDisplayName,
        email: session.email,
      }}
    >
      {children}
    </AgentShell>
  );
}
