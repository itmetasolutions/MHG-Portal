"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/dialer", label: "Console" },
  { href: "/dialer/contacts", label: "Contacts" },
  { href: "/dialer/history", label: "History" },
  { href: "/dialer/intercalling", label: "Intercalling" },
];

export function DialerLayoutShell({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="stack dialer-layout-shell">
      <section className="dialer-card dialer-shell-hero">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Communication workspace
            </p>
            <h1 className="page-title">Dialer Command Center</h1>
            <p className="page-subtitle">
              Move between live calls, contact management, history, and internal extensions without leaving the workflow.
            </p>
          </div>
          <div className="inline-row">
            <span className="badge badge-active">Live console</span>
            <span className="badge badge-warning">Operational focus</span>
          </div>
        </div>

        <nav className="dialer-subnav" aria-label="Dialer sections" style={{ marginTop: "1rem" }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dialer-subnav-link${active ? " dialer-subnav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </section>

      {children}
    </div>
  );
}