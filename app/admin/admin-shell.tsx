'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import * as FloatingChatModule from '../../components/floating-chat';
import * as NavLogoutButtonModule from '../../components/nav-logout-button';
import * as NotificationsBellModule from '../../components/notifications-bell';

type AdminShellUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

type ShellContact = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  title?: string | null;
};

type AdminShellProps = {
  user: AdminShellUser | null;
  userId: string;
  chatContacts: ShellContact[];
  children: React.ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  hint?: string;
  group: 'overview' | 'operations' | 'governance' | 'account';
};

const navItems: NavItem[] = [
  { label: 'Control Tower', href: '/admin', hint: 'KPIs and pulse', group: 'overview' },
  { label: 'Agents', href: '/admin/agents', hint: 'Scorecards', group: 'overview' },
  { label: 'Approvals', href: '/admin/approvals', hint: 'Queue', group: 'governance' },
  { label: 'Audit', href: '/admin/audit', hint: 'Trail', group: 'governance' },
  { label: 'Reports', href: '/admin/reports', hint: 'Exports', group: 'operations' },
  { label: 'Commission', href: '/admin/commission', hint: 'Revenue', group: 'operations' },
  { label: 'Properties', href: '/admin/properties', hint: 'Inventory', group: 'operations' },
  { label: 'Sales', href: '/admin/sales', hint: 'Pipeline', group: 'operations' },
  { label: 'Landlords', href: '/admin/landlords', hint: 'Owners', group: 'operations' },
  { label: 'Tenants', href: '/admin/tenants', hint: 'Occupiers', group: 'operations' },
  { label: 'Chat', href: '/admin/chat', hint: 'Messages', group: 'operations' },
  { label: 'Dialer Domain', href: '/admin/dialer-domain', hint: 'Calls', group: 'operations' },
  { label: 'Potential Landlords', href: '/admin/potential-landlords', hint: 'Prospects', group: 'operations' },
  { label: 'Potential Tenants', href: '/admin/potential-tenants', hint: 'Prospects', group: 'operations' },
  { label: 'Profile', href: '/admin/profile', hint: 'Settings', group: 'account' },
];

const quickActions = [
  { label: 'Review queue', href: '/admin/approvals', tone: 'approval' },
  { label: 'Open audit', href: '/admin/audit', tone: 'audit' },
  { label: 'Agent leaderboard', href: '/admin/agents', tone: 'leaderboard' },
  { label: 'Revenue view', href: '/admin/commission', tone: 'revenue' },
] as const;

function initials(value?: string | null) {
  if (!value) return 'AD';
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return 'AD';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function sectionTitle(group: NavItem['group']) {
  if (group === 'overview') return 'Overview';
  if (group === 'governance') return 'Governance';
  if (group === 'account') return 'Account';
  return 'Operations';
}

function ShellLink({
  item,
  active,
  searchMatch,
}: {
  item: NavItem;
  active: boolean;
  searchMatch: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={[
        'admin-shell__nav-link',
        active ? 'admin-shell__nav-link--active' : '',
        searchMatch ? 'admin-shell__nav-link--search-match' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="admin-shell__nav-label">{item.label}</span>
      <span className="admin-shell__nav-hint">{item.hint}</span>
    </Link>
  );
}

export default function AdminShell({ user, userId, chatContacts, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState(true);

  const filteredNav = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return navItems;
    return navItems.filter((item) => {
      return (
        item.label.toLowerCase().includes(normalized) ||
        item.hint?.toLowerCase().includes(normalized) ||
        item.href.toLowerCase().includes(normalized) ||
        item.group.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  const groupedNav = useMemo<readonly [NavItem['group'], NavItem[]][]>(() => {
    const map = new Map<NavItem['group'], NavItem[]>();
    filteredNav.forEach((item) => {
      const groupItems = map.get(item.group) ?? [];
      groupItems.push(item);
      map.set(item.group, groupItems);
    });
    return [
      ['overview', map.get('overview') ?? []],
      ['operations', map.get('operations') ?? []],
      ['governance', map.get('governance') ?? []],
      ['account', map.get('account') ?? []],
    ] as const;
  }, [filteredNav]);

  const userLabel = user?.name || user?.email || 'Admin';
  const userRole = user?.role || 'Platform admin';
  const userAvatar = initials(userLabel);

  const FloatingChatSurface = (((FloatingChatModule as any).default ?? (FloatingChatModule as any).FloatingChat) as React.ComponentType<any>);
  const NotificationsBellSurface = (((NotificationsBellModule as any).default ?? (NotificationsBellModule as any).NotificationsBell) as React.ComponentType<any>);
  const LogoutButtonSurface = (((NavLogoutButtonModule as any).default ?? (NavLogoutButtonModule as any).NavLogoutButton) as React.ComponentType<any>);

  return (
    <div className="workspace-shell admin-shell">
      <aside className="workspace-shell__sidebar admin-shell__sidebar">
        <div className="admin-shell__brand">
          <Link href="/admin" className="admin-shell__brand-link">
            <span className="admin-shell__brand-mark">MHG</span>
            <span className="admin-shell__brand-copy">
              <strong>Admin Control Tower</strong>
              <span>Premium operations hub</span>
            </span>
          </Link>

          <button
            type="button"
            className={['admin-shell__status-toggle', online ? 'is-online' : 'is-offline'].join(' ')}
            onClick={() => setOnline((value) => !value)}
            aria-pressed={online}
          >
            <span className="admin-shell__status-dot" />
            <span>{online ? 'Online' : 'Focus mode'}</span>
          </button>
        </div>

        <label className="admin-shell__search">
          <span className="sr-only">Search admin navigation</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents, approvals, revenue..."
            className="admin-shell__search-input"
          />
        </label>

        <nav className="admin-shell__nav" aria-label="Admin navigation">
          {groupedNav.map(([group, items]) => (
            <section key={group} className="admin-shell__nav-section">
              <div className="admin-shell__nav-section-title">{sectionTitle(group)}</div>
              <div className="admin-shell__nav-links">
                {items.map((item) => (
                  <ShellLink
                    key={item.href}
                    item={item}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    searchMatch={Boolean(query.trim())}
                  />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="admin-shell__quick-actions">
          <div className="admin-shell__section-heading">Quick interventions</div>
          <div className="admin-shell__quick-grid">
            {quickActions.map((action) => (
              <button
                key={action.href}
                type="button"
                className={`admin-shell__quick-action admin-shell__quick-action--${action.tone}`}
                onClick={() => router.push(action.href)}
              >
                <span className="admin-shell__quick-action-label">{action.label}</span>
                <span className="admin-shell__quick-action-hint">Open now</span>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-shell__account">
          <div className="admin-shell__account-badge" aria-hidden="true">
            {userAvatar}
          </div>
          <div className="admin-shell__account-copy">
            <strong>{userLabel}</strong>
            <span>{userRole}</span>
            <span className="admin-shell__account-meta">ID {userId}</span>
          </div>
          <div className="admin-shell__account-actions">
            <Link href="/admin/profile" className="admin-shell__account-link">
              Settings
            </Link>
            <LogoutButtonSurface userId={userId} className="admin-shell__logout-button" />
          </div>
        </div>
      </aside>

      <div className="workspace-shell__main admin-shell__main">
        <header className="workspace-shell__topbar admin-shell__topbar">
          <div className="admin-shell__topbar-copy">
            <p className="admin-shell__eyebrow">Command center</p>
            <h1 className="admin-shell__title">
              {pathname === '/admin' ? 'Platform performance' : navItems.find((item) => pathname === item.href)?.label ?? 'Admin workspace'}
            </h1>
            <p className="admin-shell__subtitle">
              {online
                ? 'Monitoring approvals, revenue, agent performance, and interventions in real time.'
                : 'Focus mode is active. Alerts remain visible, but your workspace is quieter.'}
            </p>
          </div>

          <div className="admin-shell__topbar-actions">
            <div className="admin-shell__search-status">
              <span className="admin-shell__search-status-label">Search scope</span>
              <span className="admin-shell__search-status-value">{query ? 'Filtered' : 'All sections'}</span>
            </div>

            <NotificationsBellSurface userId={userId} className="admin-shell__notifications" />

            <Link href="/admin/approvals" className="admin-shell__topbar-action admin-shell__topbar-action--primary">
              Review approvals
            </Link>
          </div>
        </header>

        <main className="workspace-shell__content admin-shell__content">{children}</main>
      </div>

      <FloatingChatSurface chatContacts={chatContacts} contacts={chatContacts} userId={userId} />
    </div>
  );
}