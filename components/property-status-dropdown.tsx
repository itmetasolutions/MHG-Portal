"use client";

import { useState } from "react";
import { updateProperty, type PropertyStatus } from "@/lib/portal-api";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Available", cls: "badge-active" },
  DRAFT:     { label: "Draft",     cls: "badge-draft"  },
  CLOSED:    { label: "Closed",    cls: "badge-sold"   },
};

const SELECTABLE_STATUSES: PropertyStatus[] = ["DRAFT", "AVAILABLE"];

type Props = {
  propertyId: string;
  status: string;
  onUpdated?: (newStatus: string) => void;
};

export function PropertyStatusDropdown({ propertyId, status, onUpdated }: Props) {
  const [current, setCurrent] = useState(status);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[current] ?? { label: current, cls: "badge-draft" };

  if (current === "CLOSED") {
    return <span className="badge badge-sold">Closed</span>;
  }

  async function handleSelect(newStatus: PropertyStatus) {
    if (newStatus === current) { setOpen(false); return; }
    setSaving(true);
    const result = await updateProperty(propertyId, { status: newStatus });
    setSaving(false);
    setOpen(false);
    if (result.ok) {
      setCurrent(newStatus);
      onUpdated?.(newStatus);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        className={`badge ${cfg.cls}`}
        style={{
          cursor: saving ? "wait" : "pointer",
          border: "1px solid transparent",
          background: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
        }}
        onClick={() => { if (!saving) setOpen((v) => !v); }}
        title="Click to change status"
      >
        {saving ? "Saving…" : cfg.label}
        {!saving && <span style={{ fontSize: "0.65em", opacity: 0.7 }}>▾</span>}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "0.4rem", minWidth: "140px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}>
            {SELECTABLE_STATUSES.map((opt) => {
              const optCfg = STATUS_CONFIG[opt];
              return (
                <button
                  key={opt}
                  onClick={() => void handleSelect(opt)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    width: "100%", textAlign: "left",
                    padding: "0.5rem 0.75rem", background: "none", border: "none",
                    cursor: "pointer", fontSize: "0.82rem",
                    color: opt === current ? "var(--brand-gold)" : "var(--text)",
                    fontWeight: opt === current ? 700 : 400,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span className={`badge ${optCfg.cls}`} style={{ pointerEvents: "none" }}>
                    {optCfg.label}
                  </span>
                  {opt === current && <span style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>current</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
