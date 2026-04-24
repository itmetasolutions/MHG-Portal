import Link from 'next/link';
import { db } from '@/server/db';

type TenantsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
  };
};

function cleanText(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function shortDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function badgeClass(value: unknown) {
  const raw = String(value ?? 'new').toLowerCase().replace(/\s+/g, '-');
  return `badge badge--${raw}`;
}

function isOwnedByYou(record: any) {
  const status = String(record?.ownershipStatus ?? record?.status ?? '').toLowerCase();
  return status.includes('owned by you') || record?.isMine === true;
}

function isOwnedByOther(record: any) {
  const status = String(record?.ownershipStatus ?? record?.status ?? '').toLowerCase();
  return status.includes('owned by another') || record?.isOwnedByOther === true;
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const client = db as any;
  const [tenantsRaw, propertiesRaw] = await Promise.all([
    client.tenant?.findMany?.({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }) ?? [],
    client.property?.findMany?.({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }) ?? [],
  ]);

  const rawQuery = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const rawStatus = Array.isArray(searchParams?.status) ? searchParams?.status[0] : searchParams?.status;
  const q = (rawQuery ?? '').trim().toLowerCase();
  const statusFilter = (rawStatus ?? '').trim().toLowerCase();

  const tenants = (tenantsRaw as any[]).filter((tenant) => {
    const haystack = [
      tenant?.name,
      tenant?.email,
      tenant?.phone,
      tenant?.status,
      tenant?.ownershipStatus,
      tenant?.property?.address,
      tenant?.propertyAddress,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    const matchesStatus = !statusFilter || String(tenant?.status ?? tenant?.ownershipStatus ?? '').toLowerCase().includes(statusFilter);

    return matchesQuery && matchesStatus;
  });

  const ownedByYou = tenants.filter(isOwnedByYou).length;
  const ownedByOther = tenants.filter(isOwnedByOther).length;
  const totalProperties = (propertiesRaw as any[]).length;

  return (
    <div className="detail-page relationship-page">
      <section className="workspace-panel detail-hero">
        <div className="detail-hero__main">
          <p className="workspace-kicker">Tenants</p>
          <h1 className="workspace-panel__title">Occupancy and relationship tracking</h1>
          <p className="workspace-panel__summary">Monitor tenant records, status changes, and the conversations that keep occupancy smooth.</p>
          <div className="detail-hero__meta">
            <span className="dashboard-pill">{tenants.length} records</span>
            <span className="dashboard-pill">{ownedByYou} owned by you</span>
            <span className="dashboard-pill">{ownedByOther} owned by another</span>
            <span className="dashboard-pill">{totalProperties} portfolio properties</span>
          </div>
        </div>
        <div className="detail-hero__actions">
          <Link href="/messages" className="btn btn-primary">
            Open messages
          </Link>
          <Link href="/notes" className="btn btn-secondary">
            View notes
          </Link>
        </div>
      </section>

      <section className="detail-layout">
        <div className="detail-layout__main">
          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Roster</p>
                <h2 className="workspace-panel__title">Tenant table</h2>
              </div>
            </div>

            <div className="workspace-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Ownership</th>
                    <th>Contact</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant: any) => (
                    <tr key={String(tenant?.id ?? tenant?.email ?? tenant?.name)}>
                      <td>
                        <div className="detail-stack">
                          <strong>{cleanText(tenant?.name, 'Tenant')}</strong>
                          <span>{cleanText(tenant?.property?.address ?? tenant?.propertyAddress, 'No property linked')}</span>
                        </div>
                      </td>
                      <td>
                        <span className={badgeClass(tenant?.status ?? tenant?.ownershipStatus)}>
                          {cleanText(tenant?.status ?? tenant?.ownershipStatus, 'new')}
                        </span>
                      </td>
                      <td>
                        <div className="detail-stack">
                          <span>{cleanText(tenant?.email, 'No email')}</span>
                          <span>{cleanText(tenant?.phone, 'No phone')}</span>
                        </div>
                      </td>
                      <td>{shortDate(tenant?.updatedAt ?? tenant?.createdAt)}</td>
                      <td>
                        <Link href={`/tenants/${tenant?.id}`} className="workspace-panel__link">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="detail-layout__aside">
          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Signals</p>
                <h2 className="workspace-panel__title">Occupancy state</h2>
              </div>
            </div>
            <div className="smart-insights smart-insights--stacked">
              <article className="smart-insights__card">
                <p className="smart-insights__label">Owned by you</p>
                <p className="smart-insights__value">{ownedByYou}</p>
                <p className="smart-insights__detail">Keep retention and support on track.</p>
              </article>
              <article className="smart-insights__card">
                <p className="smart-insights__label">Owned by another</p>
                <p className="smart-insights__value">{ownedByOther}</p>
                <p className="smart-insights__detail">Potential handover and coordination cases.</p>
              </article>
            </div>
          </section>

          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Shortlist</p>
                <h2 className="workspace-panel__title">Tenants to follow up</h2>
              </div>
            </div>
            <div className="detail-stack">
              {tenants.slice(0, 5).map((tenant: any) => (
                <Link key={String(tenant?.id ?? tenant?.name)} href={`/tenants/${tenant?.id}`} className="detail-stack__item">
                  <strong>{cleanText(tenant?.name, 'Tenant')}</strong>
                  <span>{cleanText(tenant?.email ?? tenant?.phone, 'No contact')}</span>
                  <span>{shortDate(tenant?.updatedAt ?? tenant?.createdAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}