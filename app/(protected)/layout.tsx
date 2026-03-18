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

  if (session.role !== UserRole.AGENT && session.role !== UserRole.ADMIN) {
    redirect("/login");
  }

  const [user, contacts] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: { agentDisplayName: true, profilePicture: true, isActive: true },
    }),
    db.user.findMany({
      where: { isActive: true, id: { not: session.userId } },
      select: { id: true, agentDisplayName: true, email: true, role: true, profilePicture: true },
      orderBy: [{ role: "asc" }, { agentDisplayName: "asc" }],
    }),
  ]);

  if (!user || !user.isActive) {
    redirect("/login");
  }

  // Admins have their own shell via the root AppShell; just render the page
  if (session.role === UserRole.ADMIN) {
    return <>{children}</>;
  }

  return (
    <AgentShell
      user={{ name: user.agentDisplayName, email: session.email, profilePicture: user.profilePicture }}
      userId={session.userId}
      chatContacts={contacts.map((c) => ({
        id: c.id,
        name: c.agentDisplayName,
        email: c.email,
        role: c.role as string,
        profilePicture: c.profilePicture,
      }))}
    >
      {children}
    </AgentShell>
  );
}
