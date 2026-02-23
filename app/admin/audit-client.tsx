"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { listAuditLogs, type AuditLogRow } from "@/lib/portal-api";

function formatJsonSnippet(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  try {
    const json = JSON.stringify(value);
    if (json.length > 160) {
      return `${json.slice(0, 160)}...`;
    }
    return json;
  } catch {
    return String(value);
  }
}

export function AdminAuditClient() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setBusy(true);
    setMessage(null);
    const result = await listAuditLogs({
      entityType: entityType || undefined,
      action: action || undefined,
      user: user || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    });
    setBusy(false);

    if (!result.ok) {
      setMessage({
        type: "error",
        text: result.message ?? "Failed to load audit logs.",
      });
      return;
    }

    setLogs(result.data.logs);
    setTotal(result.data.pagination.total);
    setTotalPages(result.data.pagination.totalPages);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin: Audit Logs</h1>
          <p className="page-subtitle">Filter and review system changes across users, landlords, and properties.</p>
        </div>
        <Link className="btn btn-secondary" href="/admin">
          Back to Admin Dashboard
        </Link>
      </header>

      <UICard>
        <UICardBody className="stack">
          <div className="two-col">
            <div className="field-grid">
              <label className="field">
                <span className="label">Entity Type</span>
                <UIInput
                  value={entityType}
                  onChange={(event) => setEntityType(event.target.value)}
                  placeholder="LANDLORD, PROPERTY, USER"
                />
              </label>
              <label className="field">
                <span className="label">Action</span>
                <UIInput
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder="LANDLORD_UPDATE"
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="label">User</span>
                <UIInput
                  value={user}
                  onChange={(event) => setUser(event.target.value)}
                  placeholder="email, user id, display name"
                />
              </label>
              <div className="inline-row">
                <label className="field" style={{ flex: 1 }}>
                  <span className="label">Date From</span>
                  <UIInput type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span className="label">Date To</span>
                  <UIInput type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </label>
              </div>
            </div>
          </div>

          <div className="inline-row">
            <UIButton
              onClick={() => {
                setPage(1);
                void load();
              }}
              disabled={busy}
            >
              {busy ? "Loading..." : "Apply Filters"}
            </UIButton>
            <UIButton
              variant="secondary"
              onClick={() => {
                setEntityType("");
                setAction("");
                setUser("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
                void load();
              }}
              disabled={busy}
            >
              Reset
            </UIButton>
            <label className="inline-row">
              <span className="label">Page Size</span>
              <UISelect
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </UISelect>
            </label>
          </div>

          {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>createdAt</th>
                  <th>entityType</th>
                  <th>action</th>
                  <th>entityId</th>
                  <th>user</th>
                  <th>beforeJson</th>
                  <th>afterJson</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.entityType}</td>
                    <td>{log.action}</td>
                    <td>
                      <code>{log.entityId}</code>
                    </td>
                    <td>
                      <strong>{log.user.agentDisplayName}</strong>
                      <span className="muted">{log.user.email}</span>
                    </td>
                    <td>
                      <code>{formatJsonSnippet(log.beforeJson)}</code>
                    </td>
                    <td>
                      <code>{formatJsonSnippet(log.afterJson)}</code>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No audit records found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="inline-row">
            <span className="muted">
              Page {page} of {Math.max(totalPages, 1)} ({total} records)
            </span>
            <UIButton
              variant="secondary"
              onClick={() => {
                if (page > 1) {
                  setPage((value) => value - 1);
                }
              }}
              disabled={page <= 1 || busy}
            >
              Previous
            </UIButton>
            <UIButton
              variant="secondary"
              onClick={() => {
                if (page < totalPages) {
                  setPage((value) => value + 1);
                }
              }}
              disabled={page >= totalPages || busy || totalPages === 0}
            >
              Next
            </UIButton>
            <UIButton variant="secondary" onClick={() => void load()} disabled={busy}>
              Refresh
            </UIButton>
          </div>
        </UICardBody>
      </UICard>
    </div>
  );
}
