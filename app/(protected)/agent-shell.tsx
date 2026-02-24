"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLogoutButton } from "@/components/nav-logout-button";
import { checkLandlordNumber, type LandlordLookupResponse } from "@/lib/portal-api";

type AgentUser = {
  name: string;
  email: string;
};

type Props = {
  user: AgentUser;
  children: React.ReactNode;
};

function DashboardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm7-4a1 1 0 0 0-2 0v3a1 1 0 0 0 .293.707l2.5 2.5a1 1 0 1 0 1.414-1.414L9 8.586V6Z" />
    </svg>
  );
}

function LandlordsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PropertiesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 2a2 2 0 0 0-2 2v11a3 3 0 1 0 6 0V4a2 2 0 0 0-2-2H4Zm1 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5-1.757 4.9-4.9a2 2 0 0 0 0-2.828L13.485 5.1a2 2 0 0 0-2.828 0L10 5.757v8.486ZM16 17H9.071l6-6H16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SalesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/landlords", label: "Landlords", icon: LandlordsIcon, exact: false },
  { href: "/properties", label: "Properties", icon: PropertiesIcon, exact: false },
  { href: "/sales", label: "Sales", icon: SalesIcon, exact: false },
  { href: "/tenants", label: "Tenants", icon: TenantsIcon, exact: false },
  { href: "/profile", label: "Profile", icon: ProfileIcon, exact: false },
  { href: "/messages", label: "Messages", icon: MessagesIcon, exact: false },
];

export function AgentShell({ user, children }: Props) {
  const pathname = usePathname();
  const [lookupInput, setLookupInput] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LandlordLookupResponse | null>(null);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  }

  const activeItem = navItems.find((item) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href),
  );

  async function onLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = lookupInput.trim();
    if (!query) {
      setLookupResult(null);
      setLookupError("Enter landlord phone number first.");
      return;
    }

    setLookupBusy(true);
    setLookupError(null);

    const result = await checkLandlordNumber(query);
    setLookupBusy(false);

    if (!result.ok) {
      setLookupResult(null);
      setLookupError(result.message ?? "Unable to check landlord details right now.");
      return;
    }

    setLookupResult(result.data);
  }

  return (
    <div className="agent-shell">
      <aside className="agent-sidebar">
        <div className="agent-sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/morehomesgroup-logo.png" alt="More Homes Group" />
          <span className="agent-sidebar-badge">Agent</span>
        </div>

        <nav className="agent-sidebar-nav">
          <span className="agent-nav-section">Navigation</span>
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`agent-nav-link${isActive(href, exact) ? " agent-nav-link-active" : ""}`}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>

        <div className="agent-sidebar-footer">
          <div className="agent-user-card">
            <div className="agent-user-avatar">{initials}</div>
            <div className="agent-user-info">
              <div className="agent-user-name">{user.name || "Agent"}</div>
              <div className="agent-user-email">{user.email}</div>
            </div>
          </div>
          <NavLogoutButton />
        </div>
      </aside>

      <div className="agent-content">
        <div className="agent-topbar">
          <div className="agent-topbar-left">
            <div className="agent-topbar-breadcrumb">
              <span>Agent</span>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.4 }}>
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="current">{activeItem?.label ?? "Dashboard"}</span>
            </div>

            <div className="agent-topbar-links">
              {navItems.map(({ href, label, exact }) => (
                <Link
                  key={href}
                  href={href}
                  className={`agent-topbar-link${isActive(href, exact) ? " agent-topbar-link-active" : ""}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="agent-topbar-meta">{user.name || user.email}</div>
        </div>

        <div className="agent-lookup-strip">
          <form className="agent-lookup-form" onSubmit={onLookupSubmit}>
            <span className="agent-lookup-label">Check landlord before calling</span>
            <input
              className="input agent-lookup-input"
              value={lookupInput}
              onChange={(event) => setLookupInput(event.target.value)}
              placeholder="Enter phone number"
              aria-label="Landlord phone lookup"
            />
            <button className="btn btn-secondary btn-sm agent-lookup-submit" type="submit" disabled={lookupBusy}>
              {lookupBusy ? "Checking..." : "Check"}
            </button>
          </form>

          {lookupError ? <p className="agent-lookup-error">{lookupError}</p> : null}

          {lookupResult ? (
            lookupResult.landlordExists && lookupResult.landlord ? (
              <div
                className={`agent-lookup-result ${
                  lookupResult.canCreateProperty ? "agent-lookup-result-owned" : "agent-lookup-result-blocked"
                }`}
              >
                <div className="agent-lookup-copy">
                  <p className="agent-lookup-title">
                    {lookupResult.landlord.landlordName} ({lookupResult.landlord.phoneLast10})
                  </p>
                  <p className="agent-lookup-meta">
                    Owner Agent: {lookupResult.landlord.ownerAgent.agentDisplayName} | Properties:{" "}
                    {lookupResult.landlord._count.properties}
                  </p>
                  <p className="agent-lookup-status">
                    {lookupResult.canCreateProperty
                      ? "This is your landlord. You can add more properties."
                      : "This landlord is assigned to another agent. You cannot add properties."}
                  </p>
                </div>

                {lookupResult.canCreateProperty ? (
                  <Link className="btn btn-primary btn-sm" href={`/landlords/${lookupResult.landlord.id}/properties`}>
                    Add Property
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="agent-lookup-result agent-lookup-result-new">
                <div className="agent-lookup-copy">
                  <p className="agent-lookup-title">No landlord found for this number</p>
                  <p className="agent-lookup-meta">
                    You can create a new landlord and property entry from the intake form.
                  </p>
                </div>
                <Link className="btn btn-primary btn-sm" href="/landlords/new">
                  Add New Landlord
                </Link>
              </div>
            )
          ) : null}
        </div>

        <div className="agent-page">{children}</div>
      </div>
    </div>
  );
}
