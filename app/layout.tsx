import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import "./portal-redesign.css";
import { getAuthSession } from "@/server/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

const sansFont = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "More Homes Group - Letting Agency Portal",
  description: "Secure lettings operations portal for More Homes Group agents and admins.",
  icons: {
    icon: [{ url: "/mhg-favicon.png", type: "image/png" }],
    shortcut: [{ url: "/mhg-favicon.png", type: "image/png" }],
    apple: [{ url: "/mhg-favicon.png", type: "image/png" }],
  },
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
      <body className={`${sansFont.variable} ${displayFont.variable}`}>
        <AppShell session={sessionData}>{children}</AppShell>
      </body>
    </html>
  );
}
