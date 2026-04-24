import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { DialerHistoryClient } from "./history-client";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function DialerHistoryPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== UserRole.AGENT && session.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [calls, contacts] = await Promise.all([
    db.dialerCall.findMany({
      where: { agentUserId: session.userId },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: 250,
      select: {
        id: true,
        direction: true,
        status: true,
        peerName: true,
        peerNumber: true,
        peerExtension: true,
        startedAt: true,
        answeredAt: true,
        endedAt: true,
        durationSec: true,
        recordingUrl: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        contact: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            extensionNumber: true,
          },
        },
        counterpartUser: {
          select: {
            id: true,
            agentDisplayName: true,
            email: true,
          },
        },
      },
    }),
    db.dialerContact.findMany({
      where: { ownerUserId: session.userId },
      orderBy: [{ fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
      },
    }),
  ]);

  const completedCount = calls.filter((call) => call.status === "COMPLETED" || call.status === "ANSWERED").length;
  const missedCount = calls.filter((call) => call.status === "MISSED" || call.status === "FAILED" || call.status === "REJECTED").length;
  const internalCount = calls.filter((call) => call.direction === "INTERNAL").length;

  return (
    <div className="stack">
      <header className="dialer-card dialer-hero-card">
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.5rem" }}>
              Call audit
            </p>
            <h1 className="page-title">Call History</h1>
            <p className="page-subtitle">
              Review incoming, outgoing, and internal calls with filters, notes, and redial-ready context.
            </p>
          </div>
        </div>

        <div className="grid-cards" style={{ marginTop: "1rem" }}>
          <article className="stat-card">
            <p className="stat-label">Logged calls</p>
            <p className="stat-value">{calls.length}</p>
            <p className="stat-sub">{completedCount} answered or completed</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Missed / failed</p>
            <p className="stat-value">{missedCount}</p>
            <p className="stat-sub">Needs follow-up or verification</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Internal calls</p>
            <p className="stat-value">{internalCount}</p>
            <p className="stat-sub">Agent-to-agent collaboration</p>
          </article>
        </div>
      </header>

      <DialerHistoryClient
        initialCalls={calls.map((call) => ({
          id: call.id,
          direction: call.direction,
          status: call.status,
          peerName: call.peerName,
          peerNumber: call.peerNumber,
          peerExtension: call.peerExtension,
          startedAt: call.startedAt.toISOString(),
          answeredAt: call.answeredAt?.toISOString() ?? null,
          endedAt: call.endedAt?.toISOString() ?? null,
          durationSec: call.durationSec,
          recordingUrl: call.recordingUrl,
          notes: call.notes,
          createdAt: call.createdAt.toISOString(),
          updatedAt: call.updatedAt.toISOString(),
          contact: call.contact,
          counterpartUser: call.counterpartUser
            ? {
                id: call.counterpartUser.id,
                name: call.counterpartUser.agentDisplayName,
                email: call.counterpartUser.email,
              }
            : null,
        }))}
        contactOptions={contacts.map((contact) => ({
          id: contact.id,
          fullName: contact.fullName,
        }))}
      />
    </div>
  );
}