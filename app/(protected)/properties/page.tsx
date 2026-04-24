import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { db } from '@/server/db';
import { getAuthSession } from '@/server/auth';
import { PublishPropertyButton } from '@/components/publish-property-button';

type PropertiesSearchParams = {
  q?: string;
  status?: string;
  type?: string;
  view?: string;
};

type PropertiesPageProps = {
  searchParams?: PropertiesSearchParams;
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

function isOwnedByYou(property: any) {
  const status = String(property?.ownershipStatus ?? property?.status ?? '').toLowerCase();
  return status.includes('owned by you') || property?.isMine === true || property?.ownerId === property?.currentUserId;
}

function isOwnedByOther(property: any) {
  const status = String(property?.ownershipStatus ?? property?.status ?? '').toLowerCase();
  return status.includes('owned by another') || property?.isOwnedByOther === true;
}

function isNewLead(property: any) {
  const status = String(property?.ownershipStatus ?? property?.status ?? '').toLowerCase();
  return status.includes('new lead') || status.includes('fresh') || property?.isNewLead === true;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const client = db as any;
  const session = await getAuthSession();
  const agentWhere = session?.role === UserRole.AGENT ? { ownerAgentId: session.userId } : {};
  const [propertiesRaw, notesRaw] = await Promise.all([
    client.property?.findMany?.({
      where: agentWhere,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    }) ?? [],
    client.note?.findMany?.({
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }) ?? [],
  ]);

  const rawQuery = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const rawStatus = Array.isArray(searchParams?.status) ? searchParams?.status[0] : searchParams?.status;
  const rawType = Array.isArray(searchParams?.type) ? searchParams?.type[0] : searchParams?.type;
  const rawView = Array.isArray(searchParams?.view) ? searchParams?.view[0] : searchParams?.view;
  const q = (rawQuery ?? '').trim().toLowerCase();
  const statusFilter = (rawStatus ?? '').trim().toLowerCase();
  const typeFilter = (rawType ?? '').trim().toLowerCase();
  const view = (rawView ?? 'grid').toLowerCase();

  const properties = (propertiesRaw as any[]).filter((property) => {
    const haystack = [
      property?.title,
      property?.address,
      property?.postcode,
      property?.ownerName,
      property?.status,
      property?.ownershipStatus,
      property?.type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    const matchesStatus = !statusFilter || String(property?.status ?? property?.ownershipStatus ?? '').toLowerCase().includes(statusFilter);
    const matchesType = !typeFilter || String(property?.type ?? property?.propertyType ?? '').toLowerCase().includes(typeFilter);

    return matchesQuery && matchesStatus && matchesType;
  });

  const ownedByYou = properties.filter(isOwnedByYou).length;
  const ownedByOther = properties.filter(isOwnedByOther).length;
  const newLeads = properties.filter(isNewLead).length;
  const notesCount = (notesRaw as any[]).length;

  const statusOptions = ['active', 'available', 'pending', 'under offer', 'let agreed', 'sold', 'new lead'];

  return (
    <div className="properties-page">
      <section className="workspace-panel property-hero">
        <div className="property-hero__content">
          <p className="workspace-kicker">Properties</p>
          <h1 className="workspace-panel__title">A clearer view of every asset</h1>
          <p className="workspace-panel__summary">
            Switch between high-density cards, ownership signals, and quick actions for the whole portfolio.
          </p>
          <div className="property-hero__stats">
            <span className="dashboard-pill">{properties.length} total</span>
            <span className="dashboard-pill">{ownedByYou} owned by you</span>
            <span className="dashboard-pill">{ownedByOther} owned by another</span>
            <span className="dashboard-pill">{newLeads} new leads</span>
          </div>
        </div>

        <div className="property-hero__actions">
          <Link href="/start" className="btn btn-primary">
            Review ownership
          </Link>
          <Link href="/properties?view=map" className="btn btn-secondary">
            Map preview
          </Link>
        </div>
      </section>

      <section className="workspace-panel property-filters">
        <div className="workspace-panel__header">
          <div>
            <p className="workspace-kicker">Filters</p>
            <h2 className="workspace-panel__title">Refine the portfolio</h2>
          </div>
          <span className="workspace-panel__meta">{notesCount} notes available</span>
        </div>

        <div className="property-filters__row">
          <Link href="/properties" className={`property-chip${!statusFilter ? ' is-active' : ''}`}>
            All
          </Link>
          {statusOptions.map((status) => (
            <Link
              key={status}
              href={`/properties?status=${encodeURIComponent(status)}${q ? `&q=${encodeURIComponent(q)}` : ''}${typeFilter ? `&type=${encodeURIComponent(typeFilter)}` : ''}${view ? `&view=${encodeURIComponent(view)}` : ''}`}
              className={`property-chip${statusFilter === status ? ' is-active' : ''}`}
            >
              {status}
            </Link>
          ))}
        </div>

        <div className="property-filters__row property-filters__row--compact">
          <Link
            href={`/properties${q ? `?q=${encodeURIComponent(q)}` : ''}${statusFilter ? `${q ? '&' : '?'}status=${encodeURIComponent(statusFilter)}` : ''}${typeFilter ? `${q || statusFilter ? '&' : '?'}type=${encodeURIComponent(typeFilter)}` : ''}`}
            className={`property-chip${view === 'grid' ? ' is-active' : ''}`}
          >
            Grid
          </Link>
          <Link
            href={`/properties?view=map${q ? `&q=${encodeURIComponent(q)}` : ''}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}${typeFilter ? `&type=${encodeURIComponent(typeFilter)}` : ''}`}
            className={`property-chip${view === 'map' ? ' is-active' : ''}`}
          >
            Map preview
          </Link>
        </div>
      </section>

      <section className="properties-layout properties-layout--grid-only">
        <div className="properties-layout__main">
          <div className="properties-grid">
            {properties.map((property: any) => {
              const status = String(property?.status ?? property?.ownershipStatus ?? 'new').toLowerCase();
              const ownershipStatus = String(property?.ownershipStatus ?? property?.status ?? 'new').toLowerCase();
              return (
                <article key={String(property?.id ?? property?.slug ?? property?.address)} className="property-card workspace-panel">
                  <div className="property-card__media">
                    <div className="property-card__badge-row">
                      <span className={badgeClass(status)}>{cleanText(property?.status, 'new')}</span>
                      <span className="property-card__ownership">
                        {isOwnedByYou(property)
                          ? 'Owned by you'
                          : isOwnedByOther(property)
                            ? 'Owned by another'
                            : isNewLead(property)
                              ? 'New lead'
                              : cleanText(property?.ownershipStatus, 'Unassigned')}
                      </span>
                    </div>
                    <div className="property-card__image">
                      <span className="property-card__image-label">{cleanText(property?.type ?? property?.propertyType, 'Property')}</span>
                      <strong>{cleanText(property?.postcode, 'Portfolio')}</strong>
                    </div>
                  </div>

                  <div className="property-card__body">
                    <div className="property-card__header">
                      <div>
                        <h3 className="property-card__title">{cleanText(property?.title ?? property?.address, 'Untitled property')}</h3>
                        <p className="property-card__meta">{cleanText(property?.address, 'No address provided')}</p>
                      </div>
                      <p className="property-card__price">{money(property?.price ?? property?.rent ?? property?.valuation)}</p>
                    </div>

                    <div className="property-card__details">
                      <span>{cleanText(property?.bedrooms ?? property?.beds, '—')} beds</span>
                      <span>{cleanText(property?.bathrooms ?? property?.baths, '—')} baths</span>
                      <span>{cleanText(property?.receptionRooms ?? property?.receptions, '—')} receptions</span>
                    </div>

                    <div className="property-card__owner">
                      <div>
                        <p className="property-card__owner-label">Ownership</p>
                        <p className="property-card__owner-value">{cleanText(property?.ownerName ?? property?.owner?.name, 'Unknown owner')}</p>
                      </div>
                      <div>
                        <p className="property-card__owner-label">Updated</p>
                        <p className="property-card__owner-value">{shortDate(property?.updatedAt ?? property?.createdAt)}</p>
                      </div>
                    </div>

                    <div className="property-card__actions">
                      <Link href={`/properties/${property?.id}`} className="btn btn-secondary btn-sm">
                        Open
                      </Link>
                      <Link href={`/properties/${property?.id}/edit`} className="btn btn-primary btn-sm">
                        Edit
                      </Link>
                      <Link href={`/landlords/${property?.landlordId}/properties`} className="btn btn-ghost btn-sm">
                        Close sale
                      </Link>
                      <PublishPropertyButton propertyId={String(property?.id ?? '')} published={Boolean(property?.publishedToWebsite)} />
                    </div>
                  </div>

                  <div className="property-card__footer">
                    <span className="property-card__footer-item">{ownershipStatus}</span>
                    <span className="property-card__footer-item">{property?.postcode ?? 'No postcode'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

      </section>
    </div>
  );
}
