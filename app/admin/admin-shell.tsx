"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLogoutButton } from "@/components/nav-logout-button";

type AdminUser = {
  name: string;
  email: string;
};

type Props = {
  user: AdminUser;
  children: React.ReactNode;
};

function DashboardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm7-4a1 1 0 0 0-2 0v3a1 1 0 0 0 .293.707l2.5 2.5a1 1 0 1 0 1.414-1.414L9 8.586V6Z" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  );
}

function LandlordsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
    </svg>
  );
}

function PropertiesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v11a3 3 0 1 0 6 0V4a2 2 0 0 0-2-2H4Zm1 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5-1.757 4.9-4.9a2 2 0 0 0 0-2.828L13.485 5.1a2 2 0 0 0-2.828 0L10 5.757v8.486ZM16 17H9.071l6-6H16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2Z" clipRule="evenodd" />
    </svg>
  );
}

function SalesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function TenantsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Zm7 5a1 1 0 1 0-2 0v1H8a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1V9Z" clipRule="evenodd" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

const navItems = [
  { href: "/admin",            label: "Dashboard",   icon: DashboardIcon,  exact: true  },
  { href: "/admin/agents",     label: "Agents",      icon: AgentsIcon,     exact: false },
  { href: "/admin/landlords",  label: "Landlords",   icon: LandlordsIcon,  exact: false },
  { href: "/admin/properties", label: "Properties",  icon: PropertiesIcon, exact: false },
  { href: "/admin/sales",      label: "Sales",       icon: SalesIcon,      exact: false },
  { href: "/admin/tenants",    label: "Tenants",     icon: TenantsIcon,    exact: false },
  { href: "/admin/audit",      label: "Audit Logs",  icon: AuditIcon,      exact: false },
  { href: "/admin/chat",       label: "Chat",        icon: ChatIcon,       exact: false },
];

export function AdminShell({ user, children }: Props) {
  const pathname = usePathname();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  }

  // Compute breadcrumb label
  const activeItem = navItems.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href)
  );
  const breadcrumbLabel = activeItem?.label ?? "Admin";

  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/morehomesgroup-logo.png" alt="More Homes Group" />
          <span className="admin-sidebar-badge">Admin</span>
        </div>

        <nav className="admin-sidebar-nav">
          <span className="admin-nav-section">Navigation</span>

          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`admin-nav-link${isActive(href, exact) ? " admin-nav-link-active" : ""}`}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{initials}</div>
            <div className="admin-user-info">
              <div className="admin-user-name">{user.name || "Admin"}</div>
              <div className="admin-user-email">{user.email}</div>
            </div>
          </div>
          <NavLogoutButton />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="admin-content">
        {/* Top bar */}
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            <div className="admin-topbar-breadcrumb">
              <span>Admin</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ opacity: 0.4 }}
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="current">{breadcrumbLabel}</span>
            </div>

            <div className="admin-topbar-links">
              {navItems.map(({ href, label, exact }) => (
                <Link
                  key={href}
                  href={href}
                  className={`admin-topbar-link${isActive(href, exact) ? " admin-topbar-link-active" : ""}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="admin-topbar-meta">
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{user.name || user.email}</span>
            <span className="badge badge-admin">Admin</span>
          </div>
        </div>

        {/* Page content */}
        <div className="admin-page">{children}</div>
      </div>
    </div>
  );
}
