import { UserRole } from "@prisma/client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { AdminShell } from "./admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();
  if (!session) {
    return <>{children}</>;
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      agentDisplayName: true,
    },
  });

  if (!user || !user.isActive || user.role !== UserRole.ADMIN) {
    return <>{children}</>;
  }

  return (
    <AdminShell user={{ name: user.agentDisplayName, email: session.email }}>
      {children}
    </AdminShell>
  );
}
