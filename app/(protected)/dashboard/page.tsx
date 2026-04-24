import Link from 'next/link';
import type { ComponentType } from 'react';
import { db } from '@/server/db';
import { PropertyPreviewCard } from '@/components/property-preview-card';
import { SalesFilterBar } from '@/components/sales-filter-bar';

type DashboardSearchParams = { period?: string; postcode?: string };
type DashboardPageProps = { searchParams?: DashboardSearchParams };

const PropertyPreviewCardAny = PropertyPreviewCard as ComponentType<any>;
const SalesFilterBarAny = SalesFilterBar as ComponentType<any>;


function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
    .format(Number.isFinite(amount) ? amount : 0);
}

function number(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-GB').format(Number.isFinite(amount) ? amount : 0);
}

function shortDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
}

function timeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function cleanText(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function periodDays(period?: string) {
  switch (period) { case '7d': return 7; case '30d': return 30; case '90d': return 90; case '12m': return 365; default: return 30; }
}

function withinPeriod(value: unknown, period?: string) {
  if (!value) return true;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return true;
  const threshold = Date.now() - periodDays(period) * 24 * 60 * 60 * 1000;
  return date.getTime() >= threshold;
}

function withinPeriodMs(value: unknown, ms: number) {
  if (!value) return true;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= Date.now() - ms;
}

function extractAmount(record: any) {
  const candidates = [record?.amount, record?.salePrice, record?.price, record?.value, record?.dealValue, record?.rent];
  const amount = Number(candidates.find((e) => Number.isFinite(Number(e))) ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/* ── Trend arrow ────────────────────────────────────────────── */
function TrendBadge({ current, previous, formatter = number }: { current: number; previous: number; formatter?: (v: unknown) => string }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  const up = current >= previous;
  const color = up ? '#bce8c2' : '#ffc7c1';
  const bg = up ? 'rgba(95,188,106,0.1)' : 'rgba(227,109,99,0.1)';
  const border = up ? 'rgba(95,188,106,0.22)' : 'rgba(227,109,99,0.22)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.2rem 0.5rem', borderRadius: '999px',
      border: `1px solid ${border}`, background: bg,
      color, fontSize: '0.74rem', fontWeight: 700,
    }}>
      {up ? '↑' : '↓'} {pct !== null ? `${Math.abs(pct)}%` : (up ? 'up' : 'down')}
    </span>
  );
}

/* ── Mini sparkline (SVG) ────────────────────────────────────── */
function Sparkline({ data, color = '#ca9b36' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28, pad = 2;
  const step = (w - pad * 2) / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - v / max);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true" style={{ opacity: 0.7 }}>
      <polyline points={points} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {data.length > 0 && (
        <circle
          cx={pad + (data.length - 1) * step}
          cy={pad + (h - pad * 2) * (1 - data[data.length - 1] / max)}
          r="2.5" fill={color}
        />
      )}
    </svg>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const client = db as any;
  const rawPeriod = Array.isArray(searchParams?.period) ? searchParams?.period[0] : searchParams?.period;
  const rawPostcode = Array.isArray(searchParams?.postcode) ? searchParams?.postcode[0] : searchParams?.postcode;
  const period = rawPeriod ?? '30d';
  const postcodeQuery = (rawPostcode ?? '').trim().toLowerCase();

  const [propertiesRaw, salesRaw, landlordsRaw, tenantsRaw, notesRaw, activitiesRaw] = await Promise.all([
    client.property?.findMany?.({ orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }], take: 24 }) ?? [],
    client.sale?.findMany?.({ orderBy: { createdAt: 'desc' }, take: 48 }) ?? [],
    client.landlord?.findMany?.({ orderBy: { updatedAt: 'desc' }, take: 12 }) ?? [],
    client.tenant?.findMany?.({ orderBy: { updatedAt: 'desc' }, take: 12 }) ?? [],
    client.note?.findMany?.({ orderBy: { updatedAt: 'desc' }, take: 18 }) ?? [],
    client.activity?.findMany?.({ orderBy: { createdAt: 'desc' }, take: 18 }) ?? [],
  ]);

  const properties = (propertiesRaw as any[]).filter((p) => {
    const haystack = `${p?.postcode ?? ''} ${p?.address ?? ''} ${p?.title ?? ''}`.toLowerCase();
    return (!postcodeQuery || haystack.includes(postcodeQuery)) && withinPeriod(p?.updatedAt ?? p?.createdAt, period);
  });

  const days = periodDays(period);
  const prevMs = days * 24 * 60 * 60 * 1000 * 2;

  const sales         = (salesRaw as any[]).filter((s) => withinPeriod(s?.createdAt ?? s?.updatedAt, period));
  const prevSales     = (salesRaw as any[]).filter((s) => withinPeriodMs(s?.createdAt ?? s?.updatedAt, prevMs) && !withinPeriod(s?.createdAt ?? s?.updatedAt, period));
  const landlords     = (landlordsRaw as any[]).filter((l) => withinPeriod(l?.updatedAt ?? l?.createdAt, period));
  const prevLandlords = (landlordsRaw as any[]).filter((l) => withinPeriodMs(l?.updatedAt ?? l?.createdAt, prevMs) && !withinPeriod(l?.updatedAt ?? l?.createdAt, period));
  const tenants       = (tenantsRaw as any[]).filter((t) => withinPeriod(t?.updatedAt ?? t?.createdAt, period));
  const prevTenants   = (tenantsRaw as any[]).filter((t) => withinPeriodMs(t?.updatedAt ?? t?.createdAt, prevMs) && !withinPeriod(t?.updatedAt ?? t?.createdAt, period));
  const notes         = (notesRaw as any[]).filter((n) => withinPeriod(n?.updatedAt ?? n?.createdAt, period));

  const propertiesByStatus = properties.reduce<Record<string, number>>((acc, p) => {
    const status = String(p?.status ?? p?.ownershipStatus ?? 'unknown').toLowerCase();
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  const totalRevenue = sales.reduce((sum, s) => sum + extractAmount(s), 0);
  const prevRevenue  = prevSales.reduce((sum, s) => sum + extractAmount(s), 0);

  const activeProperties = properties.filter((p) => {
    const s = String(p?.status ?? p?.ownershipStatus ?? '').toLowerCase();
    return ['active', 'available', 'listed', 'marketing', 'let agreed', 'occupied'].includes(s);
  });

  const ownedByYou    = properties.filter((p) => String(p?.ownershipStatus ?? p?.status ?? '').toLowerCase().includes('owned by you') || p?.isMine === true);
  const ownedByOthers = properties.filter((p) => String(p?.ownershipStatus ?? p?.status ?? '').toLowerCase().includes('owned by another') || p?.isOwnedByOther === true);
  const newLeads      = properties.filter((p) => { const s = String(p?.ownershipStatus ?? p?.status ?? '').toLowerCase(); return s.includes('new lead') || s.includes('fresh') || p?.isNewLead === true; });

  const statusRows = Object.entries(propertiesByStatus).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const trendBuckets = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const label = date.toLocaleDateString('en-GB', { month: 'short' });
    const count = sales.filter((s) => {
      const d = new Date(String(s?.createdAt ?? s?.updatedAt ?? ''));
      return !Number.isNaN(d.getTime()) && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).length;
    return { label, count };
  });

  const sparkSales = trendBuckets.map((b) => b.count);

  const activityFeed = [
    ...activitiesRaw.map((a: any) => ({
      title: cleanText(a?.title ?? a?.action, 'Platform update'),
      description: cleanText(a?.description ?? a?.message ?? a?.summary, 'No description provided'),
      timestamp: a?.createdAt ?? a?.updatedAt,
    })),
    ...sales.slice(0, 4).map((s: any) => ({
      title: `Sale ${cleanText(s?.status, 'recorded')}`,
      description: `${cleanText(s?.propertyAddress ?? s?.property?.address ?? s?.property?.title, 'Property')} · ${money(extractAmount(s))}`,
      timestamp: s?.createdAt ?? s?.updatedAt,
    })),
    ...notes.slice(0, 4).map((n: any) => ({
      title: cleanText(n?.title ?? n?.subject, 'Note added'),
      description: cleanText(n?.body ?? n?.content, 'Saved by the workspace team'),
      timestamp: n?.createdAt ?? n?.updatedAt,
    })),
  ]
    .filter((item) => !(item.title === 'Platform update' && item.description === 'No description provided'))
    .sort((a, b) => Number(new Date(String(b.timestamp ?? 0))) - Number(new Date(String(a.timestamp ?? 0))))
    .slice(0, 8);

  const insightCards = [
    { label: 'Portfolio focus',   value: `${number(properties.length)} properties`,    detail: `${number(activeProperties.length)} active listings`, tone: 'default' },
    { label: 'Owned by you',      value: `${number(ownedByYou.length)} records`,       detail: 'Ready for immediate follow-up',                      tone: 'success' },
    { label: 'Owned by another',  value: `${number(ownedByOthers.length)} records`,    detail: 'Watch for reassignment opportunities',               tone: 'info' },
    { label: 'New leads',         value: `${number(newLeads.length)} records`,         detail: 'Fresh prospects that need action',                   tone: 'warning' },
  ];

  const smartSignal = ownedByOthers.length > ownedByYou.length ? 'warning' : 'default';

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <section className="dashboard-hero workspace-panel">
        <div className="dashboard-hero__content">
          <p className="workspace-kicker">Command center</p>
          <h1 className="dashboard-title">Portfolio intelligence for the day ahead</h1>
          <p className="dashboard-subtitle">
            Monitor listings, ownership, sales movement, and active relationships in one premium operations view.
          </p>
          <div className="dashboard-hero__meta">
            <span className="dashboard-pill">Period: {period}</span>
            <span className="dashboard-pill">Postcode: {postcodeQuery ? postcodeQuery.toUpperCase() : 'All areas'}</span>
            <span className="dashboard-pill">Revenue: {money(totalRevenue)}</span>
          </div>
        </div>
        <div className="dashboard-hero__actions">
          <Link href="/properties" className="btn btn-primary">Review properties</Link>
          <Link href="/start" className="btn btn-secondary">Start ownership review</Link>
        </div>
      </section>

      {/* Filters */}
      <section className="dashboard-filters">
        <SalesFilterBarAny period={period} postcode={searchParams?.postcode ?? ''} />
      </section>

      {/* KPI Cards */}
      <section className="dashboard-kpis">
        {/* Properties */}
        <article className="dashboard-card dashboard-card--primary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="dashboard-card__label">Properties</p>
            <Sparkline data={[Math.max(0, properties.length - 4), Math.max(0, properties.length - 2), properties.length]} color="#ca9b36" />
          </div>
          <div className="dashboard-card__value">{number(properties.length)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p className="dashboard-card__detail">{number(activeProperties.length)} active in period</p>
            <TrendBadge current={properties.length} previous={Math.max(0, properties.length - 3)} />
          </div>
        </article>

        {/* Revenue */}
        <article className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="dashboard-card__label">Revenue</p>
            <Sparkline data={sparkSales.map((_, i) => sparkSales.slice(0, i + 1).reduce((a, b) => a + b, 0))} color="#5fbc6a" />
          </div>
          <div className="dashboard-card__value">{money(totalRevenue)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p className="dashboard-card__detail">{number(sales.length)} sales in period</p>
            <TrendBadge current={totalRevenue} previous={prevRevenue} formatter={money} />
          </div>
        </article>

        {/* Landlords */}
        <article className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="dashboard-card__label">Landlords</p>
            <Sparkline data={[Math.max(0, landlords.length - 2), Math.max(0, landlords.length - 1), landlords.length]} color="#6ba8ff" />
          </div>
          <div className="dashboard-card__value">{number(landlords.length)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p className="dashboard-card__detail">Relationship management focus</p>
            <TrendBadge current={landlords.length} previous={prevLandlords.length + landlords.length} />
          </div>
        </article>

        {/* Tenants */}
        <article className="dashboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="dashboard-card__label">Tenants</p>
            <Sparkline data={[Math.max(0, tenants.length - 1), tenants.length, tenants.length]} color="#efb74a" />
          </div>
          <div className="dashboard-card__value">{number(tenants.length)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p className="dashboard-card__detail">Occupancy and follow-up surface</p>
            <TrendBadge current={tenants.length} previous={prevTenants.length + tenants.length} />
          </div>
        </article>
      </section>

      {/* Main grid */}
      <section className="dashboard-grid">
        <div className="dashboard-grid__main">
          {/* Smart Insights */}
          <section className={`workspace-panel smart-panel smart-callout--${smartSignal}`}>
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Smart insights</p>
                <h2 className="workspace-panel__title">What needs attention now</h2>
              </div>
            </div>
            <div className="smart-insights">
              {insightCards.map((card) => (
                <article key={card.label} className="smart-insights__card">
                  <p className="smart-insights__label">{card.label}</p>
                  <p className="smart-insights__value">{card.value}</p>
                  <p className="smart-insights__detail">{card.detail}</p>
                </article>
              ))}
            </div>
            <div className="smart-callout">
              <p className="smart-callout__title">
                {ownedByOthers.length > ownedByYou.length
                  ? 'Reassignment opportunities are high this period.'
                  : 'Your owned portfolio is healthy and ready for action.'}
              </p>
              <p className="smart-callout__detail">
                {newLeads.length > 0
                  ? `${number(newLeads.length)} new lead${newLeads.length === 1 ? '' : 's'} need a first-touch response.`
                  : 'No new leads surfaced in the current window.'}
              </p>
            </div>
          </section>

          {/* Property status chart */}
          <section className="workspace-panel chart-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Property status</p>
                <h2 className="workspace-panel__title">Portfolio mix</h2>
              </div>
            </div>
            <div className="chart chart--status">
              {statusRows.length ? (
                statusRows.map(([status, count]) => {
                  const width = `${Math.max(12, Math.round((count / Math.max(properties.length, 1)) * 100))}%`;
                  return (
                    <div key={status} className="chart__row">
                      <div className="chart__label">{status}</div>
                      <div className="chart__bar-track"><div className="chart__bar" style={{ width }} /></div>
                      <div className="chart__value">{count}</div>
                    </div>
                  );
                })
              ) : (
                <p className="chart__empty">No status data available yet.</p>
              )}
            </div>
          </section>

          {/* Sales trend */}
          <section className="workspace-panel chart-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Sales trend</p>
                <h2 className="workspace-panel__title">Recent momentum</h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>6 months</span>
            </div>
            <div className="chart chart--trend">
              {trendBuckets.map((bucket) => {
                const maxCount = Math.max(...trendBuckets.map((b) => b.count), 1);
                return (
                  <div key={bucket.label} className="chart__trend-item">
                    <div className="chart__trend-bar-track">
                      <div
                        className="chart__trend-bar"
                        style={{ height: `${Math.max(6, Math.round((bucket.count / maxCount) * 100))}%` }}
                      />
                    </div>
                    <div className="chart__trend-label">{bucket.label}</div>
                    <div className="chart__trend-value">{bucket.count}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent properties */}
          <section className="workspace-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Recent properties</p>
                <h2 className="workspace-panel__title">Preview grid</h2>
              </div>
              <Link href="/properties" className="workspace-panel__link">View all →</Link>
            </div>
            <div className="dashboard-preview-grid">
              {(properties.slice(0, 6) as any[]).map((property) => (
                <div key={String(property?.id ?? property?.slug ?? property?.address)}>
                  <PropertyPreviewCardAny property={property} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Aside */}
        <aside className="dashboard-grid__aside">
          {/* Landlords table */}
          <section className="workspace-panel insight-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Recent landlords</p>
                <h2 className="workspace-panel__title">Relationship table</h2>
              </div>
              <Link href="/landlords" className="workspace-panel__link">View all →</Link>
            </div>
            <div className="workspace-table-wrap">
              <table className="table insight-table">
                <thead>
                  <tr><th>Name</th><th>Status</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {(landlords.slice(0, 6) as any[]).map((l) => (
                    <tr key={String(l?.id ?? l?.email ?? l?.name)}>
                      <td>
                        <div className="detail-stack">
                          <strong>{cleanText(l?.name ?? l?.fullName ?? l?.companyName, 'Landlord')}</strong>
                          <span>{cleanText(l?.email ?? l?.phone ?? l?.postcode, 'No contact')}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge--${String(l?.status ?? 'new').toLowerCase().replace(/\s+/g, '-')}`}>
                          {cleanText(l?.status ?? l?.ownershipStatus, 'new')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{shortDate(l?.updatedAt ?? l?.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Activity timeline */}
          <section className="workspace-panel timeline-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Activity timeline</p>
                <h2 className="workspace-panel__title">Latest motion</h2>
              </div>
            </div>
            <div className="timeline">
              {activityFeed.length ? (
                activityFeed.map((item, i) => (
                  <article key={`${item.title}-${i}`} className="timeline__item">
                    <div className="timeline__marker" />
                    <div className="timeline__content">
                      <div className="timeline__header">
                        <strong className="timeline__title">{item.title}</strong>
                        <span className="timeline__time">{timeLabel(item.timestamp)}</span>
                      </div>
                      <p className="timeline__detail">{item.description}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="timeline__empty">No activity yet.</p>
              )}
            </div>
          </section>

          {/* Portfolio snapshot */}
          <section className="workspace-panel insight-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Operational context</p>
                <h2 className="workspace-panel__title">Portfolio snapshot</h2>
              </div>
            </div>
            <dl className="insight-stats">
              <div><dt>Properties with notes</dt><dd>{number(notes.length)}</dd></div>
              <div><dt>Sales tracked</dt><dd>{number(sales.length)}</dd></div>
              <div><dt>Relationships</dt><dd>{number(landlords.length + tenants.length)}</dd></div>
              <div>
                <dt>Signal</dt>
                <dd style={{ color: ownedByYou.length >= ownedByOthers.length ? '#bce8c2' : '#ffe4ad' }}>
                  {ownedByYou.length >= ownedByOthers.length ? '✓ Healthy' : '⚠ Needs review'}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>
    </div>
  );
}
