import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';

type TenantDetailPageProps = {
  params: {
    id: string;
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
    year: 'numeric',
  }).format(date);
}

function fullDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function badgeClass(value: unknown) {
  const raw = String(value ?? 'new').toLowerCase().replace(/\s+/g, '-');
  return `badge badge--${raw}`;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const client = db as any;
  const tenant =
    (await client.tenant?.findUnique?.({
      where: { id: params.id },
    })) ?? null;

  if (!tenant) {
    notFound();
  }

  const properties = ((await client.property?.findMany?.({
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })) ?? []).filter((property: any) => String(property?.tenantId ?? property?.tenant?.id ?? property?.tenantSlug ?? '') === params.id);

  const notes = ((await client.note?.findMany?.({
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })) ?? []).filter((note: any) => String(note?.tenantId ?? note?.tenant?.id ?? note?.tenantSlug ?? '') === params.id);

  const calls = ((await client.call?.findMany?.({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })) ?? []).filter((call: any) => String(call?.tenantId ?? call?.tenant?.id ?? call?.tenantSlug ?? '') === params.id);

  const timeline = [
    ...(calls as any[]).map((call) => ({
      label: 'Call record',
      detail: `${cleanText(call?.outcome, 'Outcome recorded')} · ${cleanText(call?.duration, 'Duration unknown')}`,
      time: call?.createdAt ?? call?.updatedAt,
    })),
    ...(notes as any[]).map((note) => ({
      label: cleanText(note?.title ?? note?.subject, 'Note'),
      detail: cleanText(note?.body ?? note?.content, 'Saved against this tenant'),
      time: note?.updatedAt ?? note?.createdAt,
    })),
  ].sort((a, b) => Number(new Date(String(b.time ?? 0))) - Number(new Date(String(a.time ?? 0))));

  return (
    <div className="detail-page relationship-detail-page">
      <section className="detail-hero workspace-panel">
        <div className="detail-hero__main">
          <p className="workspace-kicker">Tenant detail</p>
          <h1 className="workspace-panel__title">{cleanText(tenant?.name, 'Tenant')}</h1>
          <p className="workspace-panel__summary">{cleanText(tenant?.email ?? tenant?.phone ?? tenant?.propertyAddress, 'No contact details')}</p>
          <div className="detail-hero__meta">
            <span className={badgeClass(tenant?.status ?? tenant?.ownershipStatus)}>{cleanText(tenant?.status ?? tenant?.ownershipStatus, 'new')}</span>
            <span className="detail-pill">{cleanText(tenant?.property?.address ?? tenant?.propertyAddress, 'No property linked')}</span>
            <span className="detail-pill">{shortDate(tenant?.updatedAt ?? tenant?.createdAt)}</span>
          </div>
        </div>
        <div className="detail-hero__actions">
          <Link href="/tenants" className="btn btn-secondary">
            Back to tenants
          </Link>
          <Link href="/messages" className="btn btn-primary">
            Message tenant
          </Link>
        </div>
      </section>

      <section className="detail-layout">
        <div className="detail-layout__main">
          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Profile</p>
                <h2 className="workspace-panel__title">Occupancy overview</h2>
              </div>
            </div>

            <dl className="detail-grid">
              <div>
                <dt>Email</dt>
                <dd>{cleanText(tenant?.email, 'No email')}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{cleanText(tenant?.phone, 'No phone')}</dd>
              </div>
              <div>
                <dt>Property</dt>
                <dd>{cleanText(tenant?.property?.address ?? tenant?.propertyAddress, '—')}</dd>
              </div>
              <div>
                <dt>Move-in</dt>
                <dd>{cleanText(tenant?.moveInDate ?? tenant?.startDate, '—')}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{cleanText(tenant?.status ?? tenant?.ownershipStatus, 'new')}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{fullDate(tenant?.updatedAt ?? tenant?.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Linked properties</p>
                <h2 className="workspace-panel__title">Portfolio context</h2>
              </div>
            </div>
            <div className="detail-stack">
              {(properties as any[]).length ? (
                (properties as any[]).map((property) => (
                  <Link key={String(property?.id ?? property?.address)} href={`/properties/${property?.id}`} className="detail-stack__item">
                    <strong>{cleanText(property?.title ?? property?.address, 'Property')}</strong>
                    <span>{cleanText(property?.postcode, 'No postcode')}</span>
                    <span>{cleanText(property?.status, 'new')}</span>
                  </Link>
                ))
              ) : (
                <p className="detail-stack__empty">No properties linked to this tenant yet.</p>
              )}
            </div>
          </section>

          <section className="workspace-panel timeline-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Timeline</p>
                <h2 className="workspace-panel__title">Recent notes and calls</h2>
              </div>
            </div>
            <div className="timeline">
              {timeline.length ? (
                timeline.map((item, index) => (
                  <article key={`${item.label}-${index}`} className="timeline__item">
                    <div className="timeline__marker" />
                    <div className="timeline__content">
                      <div className="timeline__header">
                        <strong className="timeline__title">{item.label}</strong>
                        <span className="timeline__time">{shortDate(item.time)}</span>
                      </div>
                      <p className="timeline__detail">{item.detail}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="timeline__empty">No notes or calls yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="detail-layout__aside">
          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Quick stats</p>
                <h2 className="workspace-panel__title">Occupancy summary</h2>
              </div>
            </div>
            <div className="smart-insights smart-insights--stacked">
              <article className="smart-insights__card">
                <p className="smart-insights__label">Linked properties</p>
                <p className="smart-insights__value">{properties.length}</p>
                <p className="smart-insights__detail">Homes currently linked to this tenant.</p>
              </article>
              <article className="smart-insights__card">
                <p className="smart-insights__label">Notes</p>
                <p className="smart-insights__value">{notes.length}</p>
                <p className="smart-insights__detail">History, reminders, and support context.</p>
              </article>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}