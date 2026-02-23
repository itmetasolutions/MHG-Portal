"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { fetchLandlords, type LandlordRow, type SessionRole } from "@/lib/portal-api";

type Props = {
  currentUserId: string;
  currentRole: SessionRole;
};

export function LandlordsRegistryClient({ currentUserId, currentRole }: Props) {
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("");
  const [phoneLast10, setPhoneLast10] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mineOnly, setMineOnly] = useState(currentRole === "AGENT");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<LandlordRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  async function load() {
    setBusy(true);
    setMessage(null);

    const result = await fetchLandlords({
      search: search || undefined,
      agent: agent || undefined,
      phoneLast10: phoneLast10 || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
      mine: mineOnly || currentRole === "AGENT",
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

  function canEdit(row: LandlordRow) {
    return currentRole === "ADMIN" || row.ownerAgent.id === currentUserId;
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Landlord Registry</h1>
          <p className="page-subtitle">Phone-keyed landlords with owner-agent enforcement.</p>
        </div>
        <Link className="btn btn-primary" href="/landlords/new">
          Add Property
        </Link>
      </header>

      <UICard>
        <UICardBody className="stack">
          <div className="two-col">
            <div className="field-grid">
              <label className="field">
                <span className="label">Search</span>
                <UIInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, phone, email"
                />
              </label>
              <label className="field">
                <span className="label">Phone Last 10</span>
                <UIInput
                  value={phoneLast10}
                  onChange={(event) => setPhoneLast10(event.target.value)}
                  placeholder="7911122233"
                />
              </label>
            </div>

            <div className="field-grid">
              {currentRole === "ADMIN" ? (
                <label className="field">
                  <span className="label">Agent</span>
                  <UIInput
                    value={agent}
                    onChange={(event) => setAgent(event.target.value)}
                    placeholder="Agent name/email/id"
                  />
                </label>
              ) : (
                <label className="field">
                  <span className="label">Scope</span>
                  <UIInput value="Your landlords only" disabled />
                </label>
              )}

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
                setAgent("");
                setPhoneLast10("");
                setDateFrom("");
                setDateTo("");
                setMineOnly(currentRole === "AGENT");
                setPage(1);
                void load();
              }}
              disabled={busy}
            >
              Reset
            </UIButton>
            {currentRole === "ADMIN" ? (
              <label className="inline-row">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(event) => setMineOnly(event.target.checked)}
                />
                <span className="label">Mine only</span>
              </label>
            ) : null}
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
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Owner Agent</th>
                  <th>Properties</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.landlordName}</td>
                    <td>
                      <code>{row.phoneLast10}</code>
                    </td>
                    <td>{row.email ?? "-"}</td>
                    <td>{row.ownerAgent.agentDisplayName}</td>
                    <td>{row._count?.properties ?? "-"}</td>
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
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
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
    </div>
  );
}
