import type { Metadata } from "next";
import "./globals.css";
import { getAuthSession } from "@/server/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "More Homes Group – Landlord Portal",
  description: "The secure lettings management portal for More Homes Group agents.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();

  const sessionData = session
    ? { email: session.email, role: session.role }
    : null;

  return (
    <html lang="en">
      <body>
        <AppShell session={sessionData}>{children}</AppShell>
      </body>
    </html>
  );
}
