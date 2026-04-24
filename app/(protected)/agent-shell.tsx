'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FloatingChat } from '@/components/floating-chat';
import { NavLogoutButton } from '@/components/nav-logout-button';
import { NotificationsBell } from '@/components/notifications-bell';

type AgentShellProps = {
  user: any;
  userId: string;
  chatContacts: any[];
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  hint: string;
  group: 'Command' | 'Operations' | 'Communication' | 'Admin';
  icon: ReactNode;
};

const FloatingChatAny = FloatingChat as ComponentType<any>;
const NotificationsBellAny = NotificationsBell as ComponentType<any>;
const NavLogoutButtonAny = NavLogoutButton as ComponentType<any>;


function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}
function IconProperties() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 7L8 2L14 7V14H10V10H6V14H2V7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function IconLandlords() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconTenants() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="10.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 14C1 11.7909 3.01472 10 5.5 10C6.41 10 7.26 10.26 7.99 10.71" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M7 14C7 11.7909 9.01472 10 11.5 10C13.9853 10 16 11.7909 16 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconStart() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6.5 5.5L10.5 8L6.5 10.5V5.5Z" fill="currentColor"/>
    </svg>
  );
}
function IconDialer() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 2.5C3 2.5 4.5 2 5.5 4.5C6 6 5 6.5 5 7.5C5 9 7 11 8.5 11C9.5 11 10 10 11.5 10.5C14 11.5 13.5 13 13.5 13C13.5 13 12 15 9 13.5C6 12 2.5 8.5 1.5 5.5C0.5 2.5 3 2.5 3 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function IconMessages() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 2H3C2.44772 2 2 2.44772 2 3V11C2 11.5523 2.44772 12 3 12H6L8 14L10 12H13C13.5523 12 14 11.5523 14 11V3C14 2.44772 13.5523 2 13 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCallRecords() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4H14M2 8H10M2 12H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconReports() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 6H11M5 9H9M5 12H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconNotes() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 2V5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 8H10.5M5.5 11H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconTemplates() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1.5" y="7.5" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9.5" y="7.5" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}
const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',     hint: 'Portfolio command center',    group: 'Command',       icon: <IconDashboard /> },
  { href: '/properties',   label: 'Properties',    hint: 'Listings and detail views',   group: 'Command',       icon: <IconProperties /> },
  { href: '/landlords',    label: 'Landlords',     hint: 'Owners and relationships',    group: 'Command',       icon: <IconLandlords /> },
  { href: '/tenants',      label: 'Tenants',       hint: 'Rents and occupancy',         group: 'Command',       icon: <IconTenants /> },
  { href: '/start',        label: 'Start',         hint: 'Lead ownership workflow',     group: 'Operations',    icon: <IconStart /> },
  { href: '/dialer',       label: 'Dialer',        hint: 'Call console and outcomes',   group: 'Operations',    icon: <IconDialer /> },
  { href: '/messages',     label: 'Messages',      hint: 'Chat threads and notes',      group: 'Communication', icon: <IconMessages /> },
  { href: '/call-records', label: 'Call records',  hint: 'Logs and follow-ups',         group: 'Communication', icon: <IconCallRecords /> },
  { href: '/daily-reports',label: 'Reports',       hint: 'Daily performance snapshots', group: 'Communication', icon: <IconReports /> },
  { href: '/notes',        label: 'Notes',         hint: 'Owner and tenant notes',      group: 'Communication', icon: <IconNotes /> },
  { href: '/templates',    label: 'Templates',     hint: 'Saved replies and scripts',   group: 'Communication', icon: <IconTemplates /> },
];

const QUICK_ACTIONS = [
  { href: '/properties?status=active', label: 'Active listings' },
  { href: '/start',                    label: 'New lead' },
  { href: '/dialer',                   label: 'Open dialer' },
  { href: '/messages',                 label: 'Chat' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const PRESENCE_CYCLE = ['available', 'away', 'busy'] as const;
type Presence = typeof PRESENCE_CYCLE[number];

export function AgentShell({ user, userId, chatContacts, children }: AgentShellProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [presence, setPresence] = useState<Presence>('available');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => {
      const haystack = `${item.label} ${item.hint} ${item.group}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [search]);

  const groupedItems = useMemo(() => {
    const groups: Record<NavItem['group'], NavItem[]> = {
      Command: [], Operations: [], Communication: [], Admin: [],
    };
    filteredItems.forEach((item) => groups[item.group].push(item));
    return groups;
  }, [filteredItems]);

  const cyclePresence = () =>
    setPresence((cur) => PRESENCE_CYCLE[(PRESENCE_CYCLE.indexOf(cur) + 1) % PRESENCE_CYCLE.length]);

  const presenceLabel = { available: 'Available', away: 'Away', busy: 'Busy' }[presence];
  const initials = String(user?.name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase();

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  return (
    <div className="workspace-shell">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="workspace-sidebar">
        {/* Brand */}
        <div className="workspace-sidebar__brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/dashboard" className="workspace-sidebar__logo" aria-label="More Homes Group dashboard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/morehomesgroup-logo.png" alt="More Homes Group" />
            </Link>
            <div className="workspace-sidebar__brand-copy">
              <p className="workspace-kicker">Agent workspace</p>
              <h1 className="workspace-title">More Homes Group</h1>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="workspace-sidebar__search">
          <label className="workspace-label" htmlFor="workspace-nav-search">Navigate</label>
          <input
            id="workspace-nav-search"
            className="input workspace-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routes or tools…"
          />
        </div>

        {/* Navigation */}
        <nav className="workspace-nav" aria-label="Primary">
          {(Object.entries(groupedItems) as Array<[NavItem['group'], NavItem[]]>).map(([group, items]) =>
            items.length ? (
              <section key={group} className="workspace-nav__group">
                <p className="workspace-nav__group-label">{group}</p>
                <div className="workspace-nav__items">
                  {items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`workspace-nav__item${active ? ' is-active' : ''}`}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0, display: 'flex' }}>
                            {item.icon}
                          </span>
                          <span className="workspace-nav__item-label">{item.label}</span>
                        </span>
                        <span className="workspace-nav__item-hint">{item.hint}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null
          )}
        </nav>

        {/* Quick actions */}
        <div className="workspace-sidebar__actions">
          <p className="workspace-nav__group-label">Quick actions</p>
          <div className="workspace-action-stack">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="workspace-action">
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="workspace-sidebar__account">
          <div className="workspace-avatar">{initials}</div>
          <div className="workspace-account__copy">
            <p className="workspace-account__name">{user?.name ?? 'Agent'}</p>
            <p className="workspace-account__meta">{user?.email ?? 'Signed in'}</p>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────── */}
      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar__headline">
            <p className="workspace-kicker">Portfolio operations</p>
            <h2 className="workspace-topbar__title">
              Ready to work&nbsp;<span className="workspace-topbar__accent">#{String(userId).slice(0, 6)}</span>
            </h2>
            <p className="workspace-topbar__subtitle">
              Track leads, listings, calls, and messages from one premium command center.
            </p>
          </div>

          <div className="workspace-topbar__tools">
            <button
              type="button"
              className={`workspace-presence workspace-presence--${presence}`}
              onClick={cyclePresence}
              title="Toggle availability"
            >
              <span className="workspace-presence__dot" />
              {presenceLabel}
            </button>
            <NotificationsBellAny userId={userId} />
            <div className="workspace-profile-menu" ref={profileRef}>
              <button
                type="button"
                className="workspace-profile-trigger"
                onClick={() => setProfileOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                title="Profile menu"
              >
                {user?.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePicture} alt="" />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
              {profileOpen ? (
                <div className="workspace-profile-dropdown" role="menu">
                  <div className="workspace-profile-summary">
                    <div className="workspace-avatar">{initials}</div>
                    <div className="workspace-account__copy">
                      <p className="workspace-account__name">{user?.name ?? 'Agent'}</p>
                      <p className="workspace-account__meta">{user?.email ?? 'Signed in'}</p>
                    </div>
                  </div>
                  <Link href="/profile" className="workspace-profile-option" role="menuitem" onClick={() => setProfileOpen(false)}>
                    Profile settings
                  </Link>
                  <Link href="/templates" className="workspace-profile-option" role="menuitem" onClick={() => setProfileOpen(false)}>
                    Templates
                  </Link>
                  <Link href="/daily-reports" className="workspace-profile-option" role="menuitem" onClick={() => setProfileOpen(false)}>
                    Daily reports
                  </Link>
                  <div className="workspace-profile-signout" role="menuitem">
                    <NavLogoutButtonAny />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="workspace-content">{children}</main>
      </div>

      <FloatingChatAny contacts={chatContacts} userId={userId} />
    </div>
  );
}
