import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminDialerDomainClient } from "./dialer-domain-client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminDialerDomainPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [user, config] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        role: true,
        isActive: true,
      },
    }),
    db.dialerDomainConfig.findUnique({
      where: { id: "singleton" },
      select: {
        id: true,
        domain: true,
        websocketHost: true,
        isEnabled: true,
        updatedAt: true,
        updatedBy: {
          select: {
            id: true,
            agentDisplayName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  if (!user || !user.isActive) {
    redirect("/admin/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <AdminDialerDomainClient
      initialConfig={
        config
          ? {
              id: config.id,
              domain: config.domain,
              websocketHost: config.websocketHost,
              isEnabled: config.isEnabled,
              updatedAt: config.updatedAt.toISOString(),
              updatedBy: config.updatedBy,
            }
          : {
              id: "singleton",
              domain: null,
              websocketHost: null,
              isEnabled: true,
              updatedAt: null,
              updatedBy: null,
            }
      }
    />
  );
}
