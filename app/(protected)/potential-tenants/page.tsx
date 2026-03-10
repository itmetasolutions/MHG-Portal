import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { PotentialTenantsClient } from "./potential-tenants-client";

export const dynamic = "force-dynamic";

export default async function PotentialTenantsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/login");
  if (user.role === UserRole.ADMIN) redirect("/admin/potential-tenants");

  const tenants = await db.potentialTenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      interestedIn: true,
      budget: true,
      notes: true,
      createdAt: true,
      addedByAgent: {
        select: { id: true, agentDisplayName: true },
      },
    },
  });

  // Serialize dates
  const serialized = tenants.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="stack">
      <PotentialTenantsClient initialTenants={serialized} />
    </div>
  );
}
