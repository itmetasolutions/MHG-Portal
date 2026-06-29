import { UserRole, ViewingStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/server/auth";
import { db } from "@/server/db";

const STATUS_LABELS: Record<ViewingStatus, string> = {
  SCHEDULED: "Scheduled",
  SUCCESSFUL: "Successful",
  UNSUCCESSFUL: "Unsuccessful",
};

const STATUS_COLORS: Record<ViewingStatus, string> = {
  SCHEDULED: "#c9a84c",
  SUCCESSFUL: "#22c55e",
  UNSUCCESSFUL: "#ef4444",
};

function formatDateTime(date: Date) {
  return date.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminViewingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; agentId?: string; page?: string }>;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== UserRole.ADMIN) redirect("/admin");

  const sp = await searchParams;
  const statusFilter = Object.values(ViewingStatus).includes(sp.status as ViewingStatus)
    ? (sp.status as ViewingStatus)
    : undefined;
  const agentIdFilter = sp.agentId || undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 50;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(agentIdFilter ? { scheduledByAgentId: agentIdFilter } : {}),
  };

  const [viewings, total, agents] = await Promise.all([
    db.viewing.findMany({
      where,
      include: {
        scheduledByAgent: { select: { id: true, agentDisplayName: true } },
        property: {
          select: {
            id: true,
            propertyRef: true,
            addressLine1: true,
            city: true,
            postcode: true,
            landlord: { select: { id: true, landlordName: true } },
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.viewing.count({ where }),
    db.user.findMany({
      where: { role: UserRole.AGENT, isActive: true },
      select: { id: true, agentDisplayName: true },
      orderBy: { agentDisplayName: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const byStatus = await db.viewing.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const statusCounts = byStatus.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count._all;
    return acc;
  }, {});

  function pageLink(p: number) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (agentIdFilter) params.set("agentId", agentIdFilter);
    params.set("page", String(p));
    return `/admin/viewings?${params.toString()}`;
  }

  function filterLink(overrides: { status?: string; agentId?: string }) {
    const params = new URLSearchParams();
    const s = "status" in overrides ? overrides.status : statusFilter;
    const a = "agentId" in overrides ? overrides.agentId : agentIdFilter;
    if (s) params.set("status", s);
    if (a) params.set("agentId", a);
    params.set("page", "1");
    return `/admin/viewings?${params.toString()}`;
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Viewings</h1>
          <p className="page-subtitle">{total} viewing {total === 1 ? "record" : "records"}.</p>
        </div>
      </header>

      {/* Summary counts */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <p className="section-label" style={{ marginBottom: "0.75rem" }}>Overview</p>
        <div className="status-breakdown">
          {(["SCHEDULED", "SUCCESSFUL", "UNSUCCESSFUL"] as ViewingStatus[]).map((s) => (
            <div key={s} className="status-item" style={{ borderColor: `${STATUS_COLORS[s]}44` }}>
              <p className="status-item-count" style={{ color: STATUS_COLORS[s] }}>{statusCounts[s] ?? 0}</p>
              <p className="status-item-label">{STATUS_LABELS[s]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span className="label" style={{ margin: 0 }}>Status:</span>
            {([["", "All"], ["SCHEDULED", "Scheduled"], ["SUCCESSFUL", "Successful"], ["UNSUCCESSFUL", "Unsuccessful"]] as const).map(([s, label]) => (
              <Link
                key={s}
                href={filterLink({ status: s || undefined })}
                className={`btn ${(statusFilter ?? "") === s ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}
              >
                {label}
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="label" style={{ margin: 0 }}>Agent:</span>
            <Link
              href={filterLink({ agentId: undefined })}
              className={`btn ${!agentIdFilter ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}
            >
              All
            </Link>
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={filterLink({ agentId: agent.id })}
                className={`btn ${agentIdFilter === agent.id ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}
              >
                {agent.agentDisplayName}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>All Viewings</h2>
        </div>

        {viewings.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No viewings found.</div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Landlord</th>
                  <th>Agent</th>
                  <th>Scheduled For</th>
                  <th>Status</th>
                  <th>Unsuccessful Reason</th>
                </tr>
              </thead>
              <tbody>
                {viewings.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link
                        href={`/admin/properties/${v.propertyId}`}
                        style={{ fontWeight: 600, color: "var(--brand-gold)", textDecoration: "none" }}
                      >
                        {v.property.addressLine1 ?? v.property.propertyRef}
                      </Link>
                      {v.property.city && (
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {[v.property.city, v.property.postcode].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                      {v.property.landlord ? (
                        <Link href={`/admin/landlords/${v.property.landlord.id}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                          {v.property.landlord.landlordName}
                        </Link>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: "0.83rem" }}>
                      <Link href={`/admin/agents/${v.scheduledByAgent.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                        {v.scheduledByAgent.agentDisplayName}
                      </Link>
                    </td>
                    <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {formatDateTime(v.scheduledAt)}
                    </td>
                    <td>
                      <span style={{
                        display: "inline-block",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "0.35rem",
                        fontSize: "0.73rem",
                        fontWeight: 600,
                        background: `${STATUS_COLORS[v.status]}22`,
                        color: STATUS_COLORS[v.status],
                        border: `1px solid ${STATUS_COLORS[v.status]}44`,
                      }}>
                        {STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: 260 }}>
                      {v.unsuccessfulReason ? (
                        <span style={{ color: "var(--danger)" }}>{v.unsuccessfulReason}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {page > 1 && (
              <Link href={pageLink(page - 1)} className="btn btn-secondary" style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}>
                ← Prev
              </Link>
            )}
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Page {page} of {totalPages} ({total} total)
            </span>
            {page < totalPages && (
              <Link href={pageLink(page + 1)} className="btn btn-secondary" style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}>
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
