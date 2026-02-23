import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getAuthSession } from "@/server/auth";
import { NavLogoutButton } from "@/components/nav-logout-button";

export const metadata: Metadata = {
  title: "More Homes Group – Landlord Portal",
  description: "The secure lettings management portal for More Homes Group agents.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();

  return (
    <html lang="en">
      <body>
        <header className="top-nav">
          <div className="top-nav-inner">
            <Link href={session ? "/dashboard" : "/"} className="brand-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/morehomesgroup-logo.png"
                alt="More Homes Group"
                className="logo-img"
              />
            </Link>

            <nav className="nav-links">
              {session ? (
                <>
                  <Link className="nav-link" href="/dashboard">
                    Dashboard
                  </Link>
                  <Link className="nav-link" href="/landlords">
                    Landlords
                  </Link>
                  {session.role === "ADMIN" && (
                    <Link className="nav-link" href="/admin">
                      Admin
                    </Link>
                  )}
                  <span className="nav-divider" />
                  <span className="nav-user">{session.email}</span>
                  <NavLogoutButton />
                </>
              ) : (
                <Link className="nav-link nav-link-cta" href="/login">
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="app-shell">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="footer-copy">
              &copy; {new Date().getFullYear()} More Homes Group. All rights reserved.
            </span>
            <span className="footer-tag">Landlord Registry Portal</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
