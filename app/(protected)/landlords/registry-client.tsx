"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIStatusBadge } from "@/components/ui/badge";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UIConfirmModal } from "@/components/ui/modal";
import { UISelect } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { fetchLandlords, setLandlordPassive, type LandlordRow, type SessionRole } from "@/lib/portal-api";

type TabKey = "ALL" | "MY" | "ACTIVE" | "PASSIVE";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "MY", label: "My Landlords" },
  { key: "ACTIVE", label: "Active" },
  { key: "PASSIVE", label: "Passive" },
];

type Props = {
  currentUserId: string;
  currentRole: SessionRole;
};

export function LandlordsRegistryClient({ currentUserId, currentRole }: Props) {
  const [tab, setTab] = useState<TabKey>("ALL");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [agent, setAgent] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<LandlordRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [confirmLandlord, setConfirmLandlord] = useState<LandlordRow | null>(null);
  const [passiveBusy, setPassiveBusy] = useState(false);

  const effectiveStatus = useMemo(() => {
    if (tab === "ACTIVE") return "ACTIVE" as const;
    if (tab === "PASSIVE") return "PASSIVE" as const;
    return status ? (status as "ACTIVE" | "PASSIVE") : undefined;
  }, [status, tab]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, tab]);

  async function load() {
    setBusy(true);
    setMessage(null);

    const result = await fetchLandlords({
      search: search || undefined,
      status: effectiveStatus,
      agent: agent || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
      mine: tab === "MY",
    });

    setBusy(false);

    if (!result.ok) {
      setMessage({
        type: "error",
        text: result.message ?? "Failed to load landlords.",
      });
      return;
    }

    setRows(result.data.landlords);
    setTotalPages(result.data.pagination.totalPages);
    setTotal(result.data.pagination.total);
  }

  async function markPassive(landlord: LandlordRow) {
    setPassiveBusy(true);
    const result = await setLandlordPassive(landlord.id);
    setPassiveBusy(false);

    if (!result.ok) {
      setMessage({
        type: "error",
        text: result.message ?? "Failed to set landlord as PASSIVE.",
      });
      return;
    }

    setMessage({ type: "success", text: "Landlord set to PASSIVE." });
    setConfirmLandlord(null);
    await load();
  }

  function canEdit(row: LandlordRow) {
    return currentRole === "ADMIN" || (row.ownerAgent.id === currentUserId && row.status !== "PASSIVE");
  }

  function canSetPassive(row: LandlordRow) {
    return row.ownerAgent.id === currentUserId && row.status === "ACTIVE";
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Landlord Registry</h1>
          <p className="page-subtitle">Search, filter, and manage landlord records.</p>
        </div>
        <Link className="btn btn-primary" href="/landlords/new">
          New Landlord
        </Link>
      </header>

      <UICard>
        <UICardBody className="stack">
          <div className="chip-group">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`chip ${tab === item.key ? "chip-active" : ""}`.trim()}
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="two-col">
            <div className="field-grid">
              <label className="field">
                <span className="label">Search</span>
                <UIInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, number, property ID, URL"
                />
              </label>

              <label className="field">
                <span className="label">Agent</span>
                <UIInput
                  value={agent}
                  onChange={(event) => setAgent(event.target.value)}
                  placeholder="Agent display name"
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="label">Status</span>
                <UISelect
                  value={effectiveStatus ?? ""}
                  onChange={(event) => setStatus(event.target.value)}
                  disabled={tab === "ACTIVE" || tab === "PASSIVE"}
                >
                  <option value="">All</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PASSIVE">PASSIVE</option>
                </UISelect>
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
                setSearch("");
                setStatus("");
                setAgent("");
                setDateFrom("");
                setDateTo("");
                setTab("ALL");
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
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </UISelect>
            </label>
          </div>

          {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>landlordName</th>
                  <th>landlordNumber</th>
                  <th>propertyId</th>
                  <th>url</th>
                  <th>agentDisplayName</th>
                  <th>status</th>
                  <th>createdAt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.landlordName}</td>
                    <td>{row.landlordNumber}</td>
                    <td>{row.propertyId}</td>
                    <td>
                      {row.url ? (
                        <a className="btn btn-secondary" href={row.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>{row.ownerAgent.agentDisplayName}</td>
                    <td>
                      <UIStatusBadge status={row.status} />
                    </td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>
                      <div className="inline-row">
                        <Link className="btn btn-secondary" href={`/landlords/${row.id}`}>
                          View
                        </Link>
                        {canEdit(row) ? (
                          <Link className="btn btn-secondary" href={`/landlords/${row.id}`}>
                            Edit
                          </Link>
                        ) : null}
                        {canSetPassive(row) ? (
                          <UIButton variant="danger" onClick={() => setConfirmLandlord(row)}>
                            Set Passive
                          </UIButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      No landlords found.
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

      {confirmLandlord ? (
        <UIConfirmModal
          title="Set Landlord to PASSIVE"
          body={
            <p style={{ margin: 0 }}>
              Landlord <strong>{confirmLandlord.landlordName}</strong> will be locked permanently and cannot
              return to ACTIVE. Continue?
            </p>
          }
          confirmLabel="Confirm PASSIVE"
          busy={passiveBusy}
          onCancel={() => setConfirmLandlord(null)}
          onConfirm={() => {
            void markPassive(confirmLandlord);
          }}
        />
      ) : null}
    </div>
  );
}
