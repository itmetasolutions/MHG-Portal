import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';

type PropertyDetailPageProps = {
  params: {
    id: string;
  };
};

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function cleanText(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function badgeClass(value: unknown) {
  const raw = String(value ?? 'new').toLowerCase().replace(/\s+/g, '-');
  return `badge badge--${raw}`;
}

function ownershipLabel(property: any) {
  const status = String(property?.ownershipStatus ?? property?.status ?? '').toLowerCase();
  if (status.includes('owned by you') || property?.isMine === true) return 'Owned by you';
  if (status.includes('owned by another') || property?.isOwnedByOther === true) return 'Owned by another';
  if (status.includes('new lead') || property?.isNewLead === true) return 'New lead';
  return cleanText(property?.ownershipStatus, 'Unassigned');
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const client = db as any;
  const property =
    (await client.property?.findUnique?.({
      where: { id: params.id },
    })) ?? null;

  if (!property) {
    notFound();
  }

  const relatedSales = ((await client.sale?.findMany?.({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })) ?? []).filter((sale: any) => {
    return String(sale?.propertyId ?? sale?.property?.id ?? sale?.property?.slug ?? sale?.propertySlug ?? '') === params.id;
  });

  const relatedNotes = ((await client.note?.findMany?.({
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })) ?? []).filter((note: any) => {
    return String(note?.propertyId ?? note?.property?.id ?? note?.property?.slug ?? note?.propertySlug ?? '') === params.id;
  });

  const timeline = [
    ...(relatedSales as any[]).map((sale) => ({
      label: 'Sale update',
      detail: `${cleanText(sale?.status, 'Recorded')} · ${money(sale?.amount ?? sale?.salePrice ?? sale?.value)}`,
      time: sale?.createdAt ?? sale?.updatedAt,
    })),
    ...(relatedNotes as any[]).map((note) => ({
      label: cleanText(note?.title ?? note?.subject, 'Note'),
      detail: cleanText(note?.body ?? note?.content, 'Saved against this property'),
      time: note?.updatedAt ?? note?.createdAt,
    })),
  ].sort((a, b) => Number(new Date(String(b.time ?? 0))) - Number(new Date(String(a.time ?? 0))));

  return (
    <div className="detail-page property-detail-page">
      <section className="detail-hero workspace-panel">
        <div className="detail-hero__main">
          <p className="workspace-kicker">Property detail</p>
          <h1 className="workspace-panel__title">{cleanText(property?.title ?? property?.address, 'Untitled property')}</h1>
          <p className="workspace-panel__summary">{cleanText(property?.address, 'No address available')}</p>
          <div className="detail-hero__meta">
            <span className={badgeClass(property?.status)}>{cleanText(property?.status, 'new')}</span>
            <span className="detail-pill">{ownershipLabel(property)}</span>
            <span className="detail-pill">{cleanText(property?.postcode, 'No postcode')}</span>
          </div>
        </div>
        <div className="detail-hero__actions">
          <Link href={`/properties/${property.id}/edit`} className="btn btn-primary">
            Edit property
          </Link>
          <Link href="/properties" className="btn btn-secondary">
            Back to properties
          </Link>
        </div>
      </section>

      <section className="detail-layout">
        <div className="detail-layout__main">
          <section className="workspace-panel property-media">
            <div className="property-media__frame">
              <div className="property-media__image">
                <span className="property-media__tag">{cleanText(property?.type ?? property?.propertyType, 'Property')}</span>
                <strong>{cleanText(property?.postcode, 'Portfolio')}</strong>
                <span>{cleanText(property?.ownerName ?? property?.owner?.name, 'Unknown owner')}</span>
              </div>
            </div>
            <div className="property-media__stats">
              <div>
                <p className="property-media__label">Asking price</p>
                <p className="property-media__value">{money(property?.price ?? property?.valuation ?? property?.rent)}</p>
              </div>
              <div>
                <p className="property-media__label">Updated</p>
                <p className="property-media__value">{shortDate(property?.updatedAt ?? property?.createdAt)}</p>
              </div>
              <div>
                <p className="property-media__label">Reference</p>
                <p className="property-media__value">{cleanText(property?.reference ?? property?.slug ?? property?.id)}</p>
              </div>
            </div>
          </section>

          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Overview</p>
                <h2 className="workspace-panel__title">Property information</h2>
              </div>
            </div>

            <dl className="detail-grid">
              <div>
                <dt>Address</dt>
                <dd>{cleanText(property?.address, 'No address')}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{cleanText(property?.type ?? property?.propertyType, 'Property')}</dd>
              </div>
              <div>
                <dt>Bedrooms</dt>
                <dd>{cleanText(property?.bedrooms ?? property?.beds, '—')}</dd>
              </div>
              <div>
                <dt>Bathrooms</dt>
                <dd>{cleanText(property?.bathrooms ?? property?.baths, '—')}</dd>
              </div>
              <div>
                <dt>Receptions</dt>
                <dd>{cleanText(property?.receptionRooms ?? property?.receptions, '—')}</dd>
              </div>
              <div>
                <dt>Ownership</dt>
                <dd>{ownershipLabel(property)}</dd>
              </div>
            </dl>
          </section>

          <section className="workspace-panel timeline-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Timeline</p>
                <h2 className="workspace-panel__title">Recent activity</h2>
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
                        <span className="timeline__time">{fullDate(item.time)}</span>
                      </div>
                      <p className="timeline__detail">{item.detail}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="timeline__empty">No activity has been recorded for this property yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="detail-layout__aside">
          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Ownership</p>
                <h2 className="workspace-panel__title">Status and control</h2>
              </div>
            </div>
            <div className="detail-stack">
              <div className="detail-stack__item">
                <strong>Status</strong>
                <span>{cleanText(property?.status, 'new')}</span>
              </div>
              <div className="detail-stack__item">
                <strong>Ownership</strong>
                <span>{ownershipLabel(property)}</span>
              </div>
              <div className="detail-stack__item">
                <strong>Price</strong>
                <span>{money(property?.price ?? property?.valuation ?? property?.rent)}</span>
              </div>
              <div className="detail-stack__item">
                <strong>Postcode</strong>
                <span>{cleanText(property?.postcode, 'Unknown')}</span>
              </div>
            </div>
          </section>

          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Related records</p>
                <h2 className="workspace-panel__title">Sales and notes</h2>
              </div>
            </div>
            <div className="detail-stack">
              {(relatedSales as any[]).slice(0, 3).map((sale) => (
                <div key={String(sale?.id ?? sale?.createdAt)} className="detail-stack__item">
                  <strong>{cleanText(sale?.status, 'Sale')}</strong>
                  <span>{money(sale?.amount ?? sale?.salePrice ?? sale?.value)}</span>
                  <span>{shortDate(sale?.createdAt ?? sale?.updatedAt)}</span>
                </div>
              ))}
              {(relatedNotes as any[]).slice(0, 3).map((note) => (
                <div key={String(note?.id ?? note?.createdAt)} className="detail-stack__item">
                  <strong>{cleanText(note?.title ?? note?.subject, 'Note')}</strong>
                  <span>{cleanText(note?.body ?? note?.content, 'No note text')}</span>
                  <span>{shortDate(note?.updatedAt ?? note?.createdAt)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}