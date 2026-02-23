"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
import { UIInput } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import {
  createLandlordProperty,
  fetchLandlordProperties,
  updateProperty,
  type PropertyRow,
  type SessionRole,
} from "@/lib/portal-api";

type Props = {
  landlordId: string;
  currentRole: SessionRole;
};

export function LandlordPropertiesClient({ landlordId, currentRole }: Props) {
  const [landlordLabel, setLandlordLabel] = useState("");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [newPropertyRef, setNewPropertyRef] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPropertyRef, setEditPropertyRef] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const canCreate = useMemo(() => properties.length >= 0, [properties.length]);

  async function load() {
    setLoading(true);
    const result = await fetchLandlordProperties(landlordId);
    setLoading(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load landlord properties." });
      return;
    }

    setLandlordLabel(`${result.data.landlord.landlordName} (${result.data.landlord.landlordNumber})`);
    setProperties(result.data.properties);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!newPropertyRef.trim()) {
      setMessage({ type: "error", text: "propertyRef is required." });
      return;
    }

    setCreating(true);
    const result = await createLandlordProperty(landlordId, { propertyRef: newPropertyRef.trim() });
    setCreating(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create property." });
      return;
    }

    setNewPropertyRef("");
    setMessage({ type: "success", text: "Property created." });
    await load();
  }

  async function saveEdit() {
    if (!editId) return;

    setEditBusy(true);
    const result = await updateProperty(editId, {
      propertyRef: editPropertyRef.trim(),
      url: editUrl.trim() || null,
      status: editStatus.trim() || null,
    });
    setEditBusy(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update property." });
      return;
    }

    setMessage({ type: "success", text: "Property updated." });
    setEditId(null);
    await load();
  }

  if (loading) {
    return <p className="muted">Loading properties...</p>;
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Landlord Properties</h1>
          <p className="page-subtitle">{landlordLabel}</p>
        </div>
        <div className="inline-row">
          <Link className="btn btn-secondary" href={`/landlords/${landlordId}`}>
            Back to Landlord
          </Link>
          <Link className="btn btn-secondary" href="/landlords">
            Registry
          </Link>
        </div>
      </header>

      {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

      {canCreate ? (
        <UICard>
          <UICardBody>
            <form className="inline-row" onSubmit={onCreate}>
              <label className="field" style={{ minWidth: 260 }}>
                <span className="label">New Property Reference</span>
                <UIInput
                  value={newPropertyRef}
                  onChange={(event) => setNewPropertyRef(event.target.value)}
                  placeholder="e.g. PROP-001"
                />
              </label>
              <UIButton type="submit" disabled={creating}>
                {creating ? "Adding..." : "Add Property"}
              </UIButton>
            </form>
          </UICardBody>
        </UICard>
      ) : null}

      <UICard>
        <UICardBody>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>propertyRef</th>
                  <th>status</th>
                  <th>url</th>
                  <th>createdAt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const editing = editId === property.id;
                  return (
                    <tr key={property.id}>
                      <td>
                        {editing ? (
                          <UIInput
                            value={editPropertyRef}
                            onChange={(event) => setEditPropertyRef(event.target.value)}
                          />
                        ) : (
                          property.propertyRef
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <UIInput value={editStatus} onChange={(event) => setEditStatus(event.target.value)} />
                        ) : (
                          property.status ?? "-"
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <UIInput value={editUrl} onChange={(event) => setEditUrl(event.target.value)} />
                        ) : property.url ? (
                          <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={property.url}>
                            Open
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{formatDate(property.createdAt)}</td>
                      <td>
                        <div className="inline-row">
                          {editing ? (
                            <>
                              <UIButton onClick={() => void saveEdit()} disabled={editBusy}>
                                {editBusy ? "Saving..." : "Save"}
                              </UIButton>
                              <UIButton
                                variant="secondary"
                                onClick={() => setEditId(null)}
                                disabled={editBusy}
                              >
                                Cancel
                              </UIButton>
                            </>
                          ) : (
                            <UIButton
                              variant="secondary"
                              onClick={() => {
                                setEditId(property.id);
                                setEditPropertyRef(property.propertyRef);
                                setEditStatus(property.status ?? "");
                                setEditUrl(property.url ?? "");
                              }}
                            >
                              Edit
                            </UIButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {properties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No properties found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="muted">{properties.length} properties listed. Role: {currentRole}</p>
        </UICardBody>
      </UICard>
    </div>
  );
}
