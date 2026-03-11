import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { PotentialLandlordsClient } from "./potential-landlords-client";

export const dynamic = "force-dynamic";

export default async function PotentialLandlordsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/login");
  if (user.role === UserRole.ADMIN) redirect("/admin/potential-landlords");

  const landlords = await db.potentialLandlord.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      phoneLast10: true,
      createdAt: true,
      addedByAgent: {
        select: { id: true, agentDisplayName: true },
      },
    },
  });

  const serialized = landlords.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return <PotentialLandlordsClient initialLandlords={serialized} currentUserId={session.userId} />;
}
