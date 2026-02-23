"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLogoutButton } from "@/components/nav-logout-button";
import type { UserRole } from "@prisma/client";

type Session = {
  email: string;
  role: UserRole;
} | null;

type Props = {
  session: Session;
  children: React.ReactNode;
};

export function AppShell({ session, children }: Props) {
  const pathname = usePathname();

  // Admin pages have their own full layout via AdminShell
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <>
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
                <Link className="nav-link" href="/profile">
                  Profile
                </Link>
                {session.role === "ADMIN" && (
                  <Link className="nav-link" href="/admin">
                    Admin
                  </Link>
                )}
                <Link className="nav-link nav-link-cta" href="/landlords/new">
                  + Add Property
                </Link>
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
    </>
  );
}
