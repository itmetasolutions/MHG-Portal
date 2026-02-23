import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";

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

  return <>{children}</>;
}
