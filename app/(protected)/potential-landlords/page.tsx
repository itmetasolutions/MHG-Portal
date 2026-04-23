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

  // Agents see only their own unconverted potential landlords
  const landlords = await db.potentialLandlord.findMany({
    where: {
      addedByAgentId: session.userId,
      landlordId: null,
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      phone: true,
      phoneLast10: true,
      email: true,
      scheduledAt: true,
      isLocked: true,
      lockedUntil: true,
      createdAt: true,
      addedByAgent: {
        select: { id: true, agentDisplayName: true },
      },
    },
  });

  const serialized = landlords.map((l) => ({
    ...l,
    scheduledAt: l.scheduledAt?.toISOString() ?? null,
    lockedUntil: l.lockedUntil?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  return <PotentialLandlordsClient initialLandlords={serialized} currentUserId={session.userId} />;
}
