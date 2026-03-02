"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const subnav = [
  { href: "/dialer", label: "Dialer", exact: true },
  { href: "/dialer/contacts", label: "Contacts", exact: false },
  { href: "/dialer/history", label: "History", exact: false },
];

export function DialerLayoutShell({ children }: Props) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  }

  return (
    <div className="stack">
      <nav className="dialer-subnav">
        {subnav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`dialer-subnav-link${isActive(item.href, item.exact) ? " dialer-subnav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
