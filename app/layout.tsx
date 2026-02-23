import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landlord Registry Portal",
  description: "Portal for lettings agents",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="top-nav">
          <div className="top-nav-inner">
            <div className="brand">Landlord Registry Portal</div>
            <nav className="nav-links">
              <Link className="nav-link" href="/">
                Home
              </Link>
              <Link className="nav-link" href="/dashboard">
                Dashboard
              </Link>
              <Link className="nav-link" href="/landlords">
                Landlords
              </Link>
              <Link className="nav-link" href="/admin">
                Admin
              </Link>
              <Link className="nav-link" href="/login">
                Login
              </Link>
            </nav>
          </div>
        </header>
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
