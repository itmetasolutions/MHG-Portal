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
    where: { addedByAgentId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      phoneLast10: true,
      accommodationType: true,
      countryOriginal: true,
      nationality: true,
      roomType: true,
      numberOfOccupants: true,
      numberOfChildren: true,
      onDSS: true,
      currentlyEmployed: true,
      annualIncome: true,
      currentLivingPostcode: true,
      workplacePostcode: true,
      maximumBudget: true,
      workingProfession: true,
      immigrationStatus: true,
      moveInDate: true,
      notes: true,
      createdAt: true,
      addedByAgent: {
        select: { id: true, agentDisplayName: true },
      },
    },
  });

  const serialized = tenants.map((t) => ({
    ...t,
    annualIncome: t.annualIncome?.toString() ?? null,
    maximumBudget: t.maximumBudget?.toString() ?? null,
    moveInDate: t.moveInDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return <PotentialTenantsClient initialTenants={serialized} />;
}
