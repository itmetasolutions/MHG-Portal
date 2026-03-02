"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLogoutButton } from "@/components/nav-logout-button";
import { checkLandlordNumber, type LandlordLookupResponse } from "@/lib/portal-api";
import { FloatingChat } from "@/components/floating-chat";

type AgentUser = {
  name: string;
  email: string;
};

type ChatContact = { id: string; name: string; email: string; role?: string };

type Props = {
  user: AgentUser;
  userId: string;
  chatContacts: ChatContact[];
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

function DialerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h2.5A2.75 2.75 0 0 1 10 4.75v10.5A2.75 2.75 0 0 1 7.25 18h-2.5A2.75 2.75 0 0 1 2 15.25V4.75Zm10 0A2.75 2.75 0 0 1 14.75 2h.5A2.75 2.75 0 0 1 18 4.75v3.5a.75.75 0 0 1-1.5 0v-3.5c0-.69-.56-1.25-1.25-1.25h-.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h.5c.69 0 1.25-.56 1.25-1.25v-3.5a.75.75 0 0 1 1.5 0v3.5A2.75 2.75 0 0 1 15.25 18h-.5A2.75 2.75 0 0 1 12 15.25V4.75Z" />
    </svg>
  );
}

function CallHistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 2.5a7.5 7.5 0 1 0 7.387 8.804.75.75 0 1 0-1.476-.26A6 6 0 1 1 10 4a6 6 0 0 1 5.192 2.995H13a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 1 0-1.5 0v1.568A7.489 7.489 0 0 0 10 2.5Zm-.75 3.5a.75.75 0 0 1 1.5 0v3.19l2.03 1.218a.75.75 0 0 1-.772 1.286l-2.392-1.435a.75.75 0 0 1-.366-.643V6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IntercallingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2.5 5A2.5 2.5 0 0 1 5 2.5h2A2.5 2.5 0 0 1 9.5 5v1A2.5 2.5 0 0 1 7 8.5H5A2.5 2.5 0 0 1 2.5 6V5Zm8 9A2.5 2.5 0 0 1 13 11.5h2a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 15 17.5h-2a2.5 2.5 0 0 1-2.5-2.5v-1ZM6.75 11a.75.75 0 0 1 0-1.5h6.94l-1.22-1.22a.75.75 0 0 1 1.06-1.06l2.5 2.5a.75.75 0 0 1 0 1.06l-2.5 2.5a.75.75 0 0 1-1.06-1.06l1.22-1.22H6.75Z" />
    </svg>
  );
}

function ContactsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Zm12.25-8a.75.75 0 0 1 .75.75V12h1.25a.75.75 0 0 1 0 1.5H16v1.25a.75.75 0 0 1-1.5 0V13.5h-1.25a.75.75 0 0 1 0-1.5h1.25v-1.25a.75.75 0 0 1 .75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/dialer", label: "Dialpad", icon: DialerIcon, exact: true },
  { href: "/dialer/history", label: "Call History", icon: CallHistoryIcon, exact: false },
  { href: "/dialer/intercalling", label: "Intercalling", icon: IntercallingIcon, exact: false },
  { href: "/dialer/contacts", label: "Contacts", icon: ContactsIcon, exact: false },
  { href: "/landlords", label: "Landlords", icon: LandlordsIcon, exact: false },
  { href: "/properties", label: "Properties", icon: PropertiesIcon, exact: false },
  { href: "/sales", label: "Sales", icon: SalesIcon, exact: false },
  { href: "/tenants", label: "Tenants", icon: TenantsIcon, exact: false },
  { href: "/profile", label: "Profile", icon: ProfileIcon, exact: false },
];

export function AgentShell({ user, userId, chatContacts, children }: Props) {
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

      <FloatingChat userId={userId} contacts={chatContacts} />
    </div>
  );
}
