import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const LOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getLockExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + LOCK_DURATION_MS);
}

function isLockActive(createdAt: Date): boolean {
  return getLockExpiry(createdAt) > new Date();
}

export default async function AdminPotentialLandlordsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/admin/login");
  if (user.role !== UserRole.ADMIN) redirect("/dashboard");

  const [total, landlords] = await Promise.all([
    db.potentialLandlord.count(),
    db.potentialLandlord.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        phoneLast10: true,
        createdAt: true,
        addedByAgent: {
          select: { id: true, agentDisplayName: true },
        },
      },
    }),
  ]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Potential Landlords</h1>
          <p className="page-subtitle">
            {total} potential {total !== 1 ? "landlords" : "landlord"} tracked platform-wide
          </p>
        </div>
      </header>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Potential Landlord Records
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{total} total</span>
        </div>

        {landlords.length === 0 ? (
          <div className="admin-card-body">
            <p className="muted" style={{ margin: 0, textAlign: "center" }}>
              No potential landlords recorded yet. Agents can add prospects from their panel.
            </p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Added By</th>
                  <th>Lock Status</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {landlords.map((l) => {
                  const locked = isLockActive(l.createdAt);
                  const expiry = getLockExpiry(l.createdAt);
                  return (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>{l.fullName}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        +44{l.phoneLast10}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--brand-gold)", fontWeight: 600 }}>
                          {l.addedByAgent.agentDisplayName}
                        </span>
                      </td>
                      <td>
                        {locked ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "#facc15",
                              background: "rgba(250,204,21,0.1)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.3rem",
                            }}
                          >
                            Locked · until {expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                              background: "rgba(255,255,255,0.05)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.3rem",
                            }}
                          >
                            Unlocked
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {l.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
