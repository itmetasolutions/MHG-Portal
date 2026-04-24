import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';

type PropertyEditPageProps = {
  params: {
    id: string;
  };
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function ownershipLabel(property: any) {
  const status = String(property?.ownershipStatus ?? property?.status ?? '').toLowerCase();
  if (status.includes('owned by you') || property?.isMine === true) return 'Owned by you';
  if (status.includes('owned by another') || property?.isOwnedByOther === true) return 'Owned by another';
  if (status.includes('new lead') || property?.isNewLead === true) return 'New lead';
  return cleanText(property?.ownershipStatus, 'Unassigned');
}

export default async function PropertyEditPage({ params }: PropertyEditPageProps) {
  const client = db as any;
  const property =
    (await client.property?.findUnique?.({
      where: { id: params.id },
    })) ?? null;

  if (!property) {
    notFound();
  }

  return (
    <div className="detail-page property-edit-page">
      <section className="detail-hero workspace-panel">
        <div className="detail-hero__main">
          <p className="workspace-kicker">Edit property</p>
          <h1 className="workspace-panel__title">{cleanText(property?.title ?? property?.address, 'Edit property')}</h1>
          <p className="workspace-panel__summary">Refine ownership, pricing, and status with a premium inline edit layout.</p>
        </div>
        <div className="detail-hero__actions">
          <Link href={`/properties/${property.id}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </section>

      <form className="detail-layout detail-layout--form" action={`/api/properties/${property.id}`} method="post">
        <input type="hidden" name="id" value={property.id} />
        <div className="detail-layout__main">
          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">General information</p>
                <h2 className="workspace-panel__title">Profile and location</h2>
              </div>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Title</span>
                <input className="input" name="title" defaultValue={cleanText(property?.title)} />
              </label>
              <label className="settings-field settings-field--wide">
                <span>Address</span>
                <input className="input" name="address" defaultValue={cleanText(property?.address)} />
              </label>
              <label className="settings-field">
                <span>Postcode</span>
                <input className="input" name="postcode" defaultValue={cleanText(property?.postcode)} />
              </label>
              <label className="settings-field">
                <span>Type</span>
                <input className="input" name="type" defaultValue={cleanText(property?.type ?? property?.propertyType)} />
              </label>
            </div>
          </section>

          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Property metrics</p>
                <h2 className="workspace-panel__title">Value and structure</h2>
              </div>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Price</span>
                <input className="input" name="price" inputMode="numeric" defaultValue={cleanText(property?.price ?? property?.valuation ?? property?.rent)} />
              </label>
              <label className="settings-field">
                <span>Bedrooms</span>
                <input className="input" name="bedrooms" inputMode="numeric" defaultValue={cleanText(property?.bedrooms ?? property?.beds)} />
              </label>
              <label className="settings-field">
                <span>Bathrooms</span>
                <input className="input" name="bathrooms" inputMode="numeric" defaultValue={cleanText(property?.bathrooms ?? property?.baths)} />
              </label>
              <label className="settings-field">
                <span>Receptions</span>
                <input className="input" name="receptions" inputMode="numeric" defaultValue={cleanText(property?.receptionRooms ?? property?.receptions)} />
              </label>
              <label className="settings-field">
                <span>Status</span>
                <input className="input" name="status" defaultValue={cleanText(property?.status, 'new')} />
              </label>
              <label className="settings-field">
                <span>Ownership</span>
                <input className="input" name="ownershipStatus" defaultValue={ownershipLabel(property)} />
              </label>
            </div>
          </section>

          <section className="workspace-panel detail-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Notes</p>
                <h2 className="workspace-panel__title">Additional details</h2>
              </div>
            </div>

            <div className="settings-grid">
              <label className="settings-field settings-field--wide">
                <span>Description</span>
                <textarea className="input" name="description" rows={5} defaultValue={cleanText(property?.description)} />
              </label>
              <label className="settings-field settings-field--wide">
                <span>Internal notes</span>
                <textarea className="input" name="notes" rows={5} defaultValue={cleanText(property?.notes)} />
              </label>
            </div>
          </section>
        </div>

        <aside className="detail-layout__aside">
          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Actions</p>
                <h2 className="workspace-panel__title">Save and publish</h2>
              </div>
            </div>
            <div className="detail-stack">
              <div className="detail-stack__item">
                <strong>Current owner</strong>
                <span>{cleanText(property?.ownerName ?? property?.owner?.name, 'Unknown')}</span>
              </div>
              <div className="detail-stack__item">
                <strong>Updated</strong>
                <span>{cleanText(property?.updatedAt ?? property?.createdAt, '—')}</span>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                Save changes
              </button>
              <Link href={`/properties/${property.id}`} className="btn btn-secondary btn-block">
                Back to detail
              </Link>
            </div>
          </section>

          <section className="workspace-panel detail-sidebar">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Audit</p>
                <h2 className="workspace-panel__title">Ownership state</h2>
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
                <strong>Reference</strong>
                <span>{cleanText(property?.reference ?? property?.slug ?? property?.id)}</span>
              </div>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}