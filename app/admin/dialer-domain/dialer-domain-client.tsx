"use client";

import { FormEvent, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { updateDialerDomain, type DialerDomainConfigRow } from "@/lib/portal-api";
import { formatDateTime } from "@/lib/format";

type Props = {
  initialConfig: DialerDomainConfigRow;
};

type Message = { type: "success" | "error"; text: string } | null;

export function AdminDialerDomainClient({ initialConfig }: Props) {
  const [pbxPlatform, setPbxPlatform] = useState(initialConfig.pbxPlatform ?? "");
  const [domain, setDomain] = useState(initialConfig.domain ?? "");
  const [sipPort, setSipPort] = useState(initialConfig.sipPort ? String(initialConfig.sipPort) : "");
  const [sipTransport, setSipTransport] = useState(initialConfig.sipTransport ?? "");
  const [websocketHost, setWebsocketHost] = useState(initialConfig.websocketHost ?? "");
  const [isEnabled, setIsEnabled] = useState(initialConfig.isEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [updatedAt, setUpdatedAt] = useState(initialConfig.updatedAt);
  const [updatedBy, setUpdatedBy] = useState(initialConfig.updatedBy ?? null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const sipPortValue = sipPort.trim();
    let normalizedSipPort: number | null = null;
    if (sipPortValue.length > 0) {
      const parsedPort = Number.parseInt(sipPortValue, 10);
      if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        setSaving(false);
        setMessage({ type: "error", text: "SIP Port must be a number between 1 and 65535." });
        return;
      }
      normalizedSipPort = parsedPort;
    }

    const result = await updateDialerDomain({
      pbxPlatform: pbxPlatform.trim() || null,
      domain: domain.trim() || null,
      sipPort: normalizedSipPort,
      sipTransport: sipTransport.trim() || null,
      websocketHost: websocketHost.trim() || null,
      isEnabled,
    });

    setSaving(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to save domain settings." });
      return;
    }

    setMessage({ type: "success", text: result.data.message });
    setPbxPlatform(result.data.config.pbxPlatform ?? "");
    setDomain(result.data.config.domain ?? "");
    setSipPort(result.data.config.sipPort ? String(result.data.config.sipPort) : "");
    setSipTransport(result.data.config.sipTransport ?? "");
    setWebsocketHost(result.data.config.websocketHost ?? "");
    setIsEnabled(result.data.config.isEnabled);
    setUpdatedAt(result.data.config.updatedAt);
    setUpdatedBy(result.data.config.updatedBy ?? null);
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Domain Settings</h1>
          <p className="page-subtitle">
            Configure PBX and WebRTC connection details used by all agent dialers.
          </p>
        </div>
      </header>

      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h2.5A2.75 2.75 0 0 1 10 4.75v10.5A2.75 2.75 0 0 1 7.25 18h-2.5A2.75 2.75 0 0 1 2 15.25V4.75Zm10 0A2.75 2.75 0 0 1 14.75 2h.5A2.75 2.75 0 0 1 18 4.75v3.5a.75.75 0 0 1-1.5 0v-3.5c0-.69-.56-1.25-1.25-1.25h-.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h.5c.69 0 1.25-.56 1.25-1.25v-3.5a.75.75 0 0 1 1.5 0v3.5A2.75 2.75 0 0 1 15.25 18h-.5A2.75 2.75 0 0 1 12 15.25V4.75Z" />
            </svg>
            PBX Connectivity
          </h2>
          <span className={`badge ${isEnabled ? "badge-active" : "badge-locked"}`}>
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="admin-card-body">
          <form className="field-grid" style={{ maxWidth: 720 }} onSubmit={handleSubmit}>
            <div className="two-col">
              <label className="field">
                <span className="label">PBX Platform</span>
                <UIInput
                  value={pbxPlatform}
                  onChange={(event) => setPbxPlatform(event.target.value)}
                  placeholder="Yeastar"
                  autoComplete="off"
                />
                <span className="hint-text">
                  Example: Yeastar, 3CX, Asterisk.
                </span>
              </label>
              <label className="field">
                <span className="label">SIP Transport</span>
                <UIInput
                  value={sipTransport}
                  onChange={(event) => setSipTransport(event.target.value)}
                  placeholder="TLS"
                  autoComplete="off"
                />
                <span className="hint-text">
                  Usually TLS for secure SIP.
                </span>
              </label>
            </div>

            <label className="field">
              <span className="label">SIP Server (Domain)</span>
              <UIInput
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="infernallltd.cloud.ezipbx.biz"
                autoComplete="off"
              />
              <span className="hint-text">
                Primary SIP/PBX server used by extension credentials.
              </span>
            </label>

            <label className="field">
              <span className="label">SIP Port</span>
              <UIInput
                type="number"
                value={sipPort}
                onChange={(event) => setSipPort(event.target.value)}
                placeholder="5061"
                min={1}
                max={65535}
                autoComplete="off"
              />
              <span className="hint-text">
                Provider SIP port (for reference and troubleshooting).
              </span>
            </label>

            <label className="field">
              <span className="label">WebSocket Host (Optional)</span>
              <UIInput
                value={websocketHost}
                onChange={(event) => setWebsocketHost(event.target.value)}
                placeholder="wss://infernallltd.cloud.ezipbx.biz/ws"
                autoComplete="off"
              />
              <span className="hint-text">
                If left empty, dialer will auto-try wss://server/ws.
              </span>
            </label>

            <label className="inline-row" style={{ alignItems: "center", gap: "0.65rem" }}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
              />
              <span style={{ fontSize: "0.88rem", color: "var(--text)" }}>
                Enable dialer features for agents
              </span>
            </label>

            <div className="inline-row">
              <UIButton type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Domain Settings"}
              </UIButton>
            </div>
          </form>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Audit Snapshot</h2>
        </div>
        <div className="admin-card-body">
          <div className="dialer-meta-grid">
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">Last Updated</p>
              <p className="dialer-meta-value">{updatedAt ? formatDateTime(updatedAt) : "Never"}</p>
            </div>
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">Updated By</p>
              <p className="dialer-meta-value">
                {updatedBy ? `${updatedBy.agentDisplayName} (${updatedBy.email})` : "System default"}
              </p>
            </div>
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">Current Domain</p>
              <p className="dialer-meta-value">{domain || "Not configured"}</p>
            </div>
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">PBX Platform</p>
              <p className="dialer-meta-value">{pbxPlatform || "Not configured"}</p>
            </div>
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">SIP Port</p>
              <p className="dialer-meta-value">{sipPort || "Not configured"}</p>
            </div>
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">SIP Transport</p>
              <p className="dialer-meta-value">{sipTransport || "Not configured"}</p>
            </div>
            <div className="dialer-meta-item">
              <p className="dialer-meta-label">Current WebSocket Host</p>
              <p className="dialer-meta-value">{websocketHost || "Not configured"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
