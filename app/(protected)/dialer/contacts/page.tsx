import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { DialerContactsClient } from "./contacts-client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function DialerContactsPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== UserRole.AGENT && session.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [contacts, labels] = await Promise.all([
    db.dialerContact.findMany({
      where: { ownerUserId: session.userId },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        extensionNumber: true,
        email: true,
        notes: true,
        isFavorite: true,
        createdAt: true,
        updatedAt: true,
        labels: {
          select: {
            label: {
              select: {
                id: true,
                name: true,
                colorHex: true,
              },
            },
          },
        },
      },
    }),
    db.dialerContactLabel.findMany({
      where: { ownerUserId: session.userId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        colorHex: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    }),
  ]);

  const favoriteCount = contacts.filter((contact) => contact.isFavorite).length;
  const contactWithNotes = contacts.filter((contact) => Boolean(contact.notes?.trim())).length;

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Contact intelligence
            </p>
            <h1 className="page-title">Contacts</h1>
            <p className="page-subtitle">
              Organize favourites, notes, and labels so dial-outs stay fast and context stays visible.
            </p>
          </div>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Saved contacts</p>
            <p className="stat-value">{contacts.length}</p>
            <p className="stat-sub">{favoriteCount} marked as favourites</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Labels</p>
            <p className="stat-value">{labels.length}</p>
            <p className="stat-sub">Reusable segments for quicker filtering</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Notes attached</p>
            <p className="stat-value">{contactWithNotes}</p>
            <p className="stat-sub">Contacts with call context recorded</p>
          </article>
        </div>
      </header>

      <DialerContactsClient
        initialContacts={contacts.map((contact) => ({
          id: contact.id,
          fullName: contact.fullName,
          phoneNumber: contact.phoneNumber,
          extensionNumber: contact.extensionNumber,
          email: contact.email,
          notes: contact.notes,
          isFavorite: contact.isFavorite,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString(),
          labels: contact.labels.map((item) => item.label),
        }))}
        initialLabels={labels.map((label) => ({
          id: label.id,
          name: label.name,
          colorHex: label.colorHex,
          createdAt: label.createdAt.toISOString(),
          updatedAt: label.updatedAt.toISOString(),
          contactsCount: label._count.contacts,
        }))}
      />
    </div>
  );
}