import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { CrossSellSearchClient } from "@/components/portal/cross-sell-search-client";

export const dynamic = "force-dynamic";

export default async function AgentSearchPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.role === UserRole.ADMIN) redirect("/admin/search");

  return <CrossSellSearchClient currentUserId={session.userId} isAdmin={false} />;
}
