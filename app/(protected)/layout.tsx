import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAuthSession();

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
