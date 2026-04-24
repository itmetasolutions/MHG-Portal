import Link from 'next/link';
import { prisma } from '@/server/db';

type LandlordsPageProps = {
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

export default async function LandlordsPage({ searchParams }: LandlordsPageProps) {
  const client = prisma as any;
  const [landlordsRaw, propertiesRaw] = await Promise.all([
    client.landlord?.findMany?.({
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

  const landlords = (landlordsRaw as any[]).filter((landlord) => {
    const haystack = [
      landlord?.name,
      landlord?.companyName,
      landlord?.email,
      landlord?.phone,
      landlord?.postcode,
      landlord?.status,
      landlord?.ownershipStatus,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    const matchesStatus = !statusFilter || String(landlord?.status ?? landlord?.ownershipStatus ?? '').toLowerCase().includes(statusFilter);

    return matchesQuery && matchesStatus;
  });

  const ownedByYou = landlords.filter(isOwnedByYou).length;
  const ownedByOther = landlords.filter(isOwnedByOther).length;
  const totalProperties = (propertiesRaw as any[]).length;

  return (
    <div className="detail-page relationship-page">
      <section className="workspace-panel detail-hero">
        <div className="detail-hero__main">
          <p className="workspace-kicker">Landlords</p>
          <h1 className="workspace-panel__title">Ownership relationships and calls</h1>
          <p className="workspace-panel__summary">Track owners, open opportunities, and the notes that matter most.</p>
          <div className="detail-hero__meta">
            <span className="dashboard-pill">{landlords.length} records</span>
            <span className="dashboard-pill">{ownedByYou} owned by you</span>
            <span className="dashboard-pill">{ownedByOther} owned by another</span>
            <span className="dashboard-pill">{totalProperties} portfolio properties</span>
          </div>
        </div>
        <div className="detail-hero__actions">
          <Link href="/start" className="btn btn-primary">
            Review leads
          </Link>
          <Link href="/messages" className="btn btn-secondary">
            Open messages
          </Link>
        </div>
      </section>

      <section className="detail-layout">
        <div className="detail-layout__main">
          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Roster</p>
                <h2 className="workspace-panel__title">Landlord table</h2>
              </div>
            </div>

            <div className="workspace-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Landlord</th>
                    <th>Ownership</th>
                    <th>Contact</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {landlords.map((landlord: any) => (
                    <tr key={String(landlord?.id ?? landlord?.email ?? landlord?.name)}>
                      <td>
                        <div className="detail-stack">
                          <strong>{cleanText(landlord?.name ?? landlord?.companyName, 'Landlord')}</strong>
                          <span>{cleanText(landlord?.address ?? landlord?.postcode, 'No address')}</span>
                        </div>
                      </td>
                      <td>
                        <span className={badgeClass(landlord?.status ?? landlord?.ownershipStatus)}>
                          {cleanText(landlord?.status ?? landlord?.ownershipStatus, 'new')}
                        </span>
                      </td>
                      <td>
                        <div className="detail-stack">
                          <span>{cleanText(landlord?.email, 'No email')}</span>
                          <span>{cleanText(landlord?.phone, 'No phone')}</span>
                        </div>
                      </td>
                      <td>{shortDate(landlord?.updatedAt ?? landlord?.createdAt)}</td>
                      <td>
                        <Link href={`/landlords/${landlord?.id}`} className="workspace-panel__link">
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
                <h2 className="workspace-panel__title">Relationship states</h2>
              </div>
            </div>
            <div className="smart-insights smart-insights--stacked">
              <article className="smart-insights__card">
                <p className="smart-insights__label">Owned by you</p>
                <p className="smart-insights__value">{ownedByYou}</p>
                <p className="smart-insights__detail">Prioritise account management and renewal work.</p>
              </article>
              <article className="smart-insights__card">
                <p className="smart-insights__label">Owned by another</p>
                <p className="smart-insights__value">{ownedByOther}</p>
                <p className="smart-insights__detail">Potential reassignment and relationship capture.</p>
              </article>
            </div>
          </section>

          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Shortlist</p>
                <h2 className="workspace-panel__title">Top accounts</h2>
              </div>
            </div>
            <div className="detail-stack">
              {landlords.slice(0, 5).map((landlord: any) => (
                <Link key={String(landlord?.id ?? landlord?.name)} href={`/landlords/${landlord?.id}`} className="detail-stack__item">
                  <strong>{cleanText(landlord?.name ?? landlord?.companyName, 'Landlord')}</strong>
                  <span>{cleanText(landlord?.email ?? landlord?.phone, 'No contact')}</span>
                  <span>{shortDate(landlord?.updatedAt ?? landlord?.createdAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}