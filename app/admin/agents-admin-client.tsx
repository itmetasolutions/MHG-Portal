"use client";

import { FormEvent, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { UISelect } from "@/components/ui/select";
import { apiPatch, apiPost } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { listAgents } from "@/lib/portal-api";

type AgentRow = {
  id: string;
  email: string;
  agentDisplayName: string;
  isActive: boolean;
  createdAt: string;
  ownedLandlords: number;
  ownedProperties: number;
};

type CreateMode = "TEMP_PASSWORD" | "AUTO_GENERATE";

type CreateFormState = {
  email: string;
  agentDisplayName: string;
  mode: CreateMode;
  tempPassword: string;
};

type Props = {
  initialAgents: AgentRow[];
};

function validate(form: CreateFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = form.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email.";
  if (!form.agentDisplayName.trim())
    errors.agentDisplayName = "Agent name is required.";
  if (form.mode === "TEMP_PASSWORD") {
    if (!form.tempPassword)
      errors.tempPassword = "Temporary password is required.";
    else if (form.tempPassword.length < 8)
      errors.tempPassword = "Minimum 8 characters.";
  }
  return errors;
}

function AgentInitials({ name, email }: { name: string; email: string }) {
  const src = name || email;
  const chars = src
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "var(--brand-gold-light)",
        border: "1px solid var(--border-gold)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--brand-gold)",
        flexShrink: 0,
      }}
    >
      {chars}
    </div>
  );
}

export function AgentsAdminClient({ initialAgents }: Props) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [search, setSearch] = useState("");
  const [includeDisabled, setIncludeDisabled] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [workingAgentId, setWorkingAgentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CreateFormState>({
    email: "",
    agentDisplayName: "",
    mode: "TEMP_PASSWORD",
    tempPassword: "",
  });

  const shownCount = useMemo(() => agents.length, [agents.length]);

  async function fetchAgents() {
    setLoadingAgents(true);
    setMessage(null);
    const result = await listAgents({
      search: search.trim() || undefined,
      includeDisabled,
    });
    setLoadingAgents(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to load agents." });
      return;
    }
    const mapped: AgentRow[] = (result.data.agents ?? []).map((a) => ({
      id: a.id,
      email: a.email,
      agentDisplayName: a.agentDisplayName,
      isActive: a.isActive,
      createdAt: new Date(a.createdAt).toISOString(),
      ownedLandlords: a._count?.ownedLandlords ?? 0,
      ownedProperties: a._count?.ownedProperties ?? 0,
    }));
    setAgents(mapped);
  }

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreating(true);
    const result = await apiPost<
      { email: string; agentDisplayName: string; mode: CreateMode; tempPassword?: string },
      { message: string; generatedTempPassword?: string }
    >("/api/admin/users", {
      email: form.email.trim(),
      agentDisplayName: form.agentDisplayName.trim(),
      mode: form.mode,
      tempPassword: form.mode === "TEMP_PASSWORD" ? form.tempPassword : undefined,
    });
    setCreating(false);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to create agent." });
      return;
    }

    const successText = result.data.generatedTempPassword
      ? `${result.data.message} Temporary password: ${result.data.generatedTempPassword}`
      : result.data.message;

    setMessage({ type: "success", text: successText });
    setForm({ email: "", agentDisplayName: "", mode: "TEMP_PASSWORD", tempPassword: "" });
    setFieldErrors({});
    setShowForm(false);
    await fetchAgents();
  }

  async function toggleAgentStatus(agent: AgentRow) {
    setWorkingAgentId(agent.id);
    setMessage(null);
    const result = await apiPatch<
      { isActive: boolean },
      { message: string; agent: { isActive: boolean } }
    >(`/api/admin/users/${agent.id}`, { isActive: !agent.isActive });
    setWorkingAgentId(null);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update." });
      return;
    }
    setAgents((prev) =>
      prev.map((item) =>
        item.id === agent.id ? { ...item, isActive: result.data.agent.isActive } : item
      )
    );
    setMessage({ type: "success", text: result.data.message });
  }

  async function resetAgentPassword(agent: AgentRow) {
    setWorkingAgentId(agent.id);
    setMessage(null);
    const result = await apiPatch<
      { resetPasswordAuto: boolean },
      { message: string; generatedTempPassword?: string }
    >(`/api/admin/users/${agent.id}`, { resetPasswordAuto: true });
    setWorkingAgentId(null);
    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to reset password." });
      return;
    }
    const text = result.data.generatedTempPassword
      ? `${result.data.message} Temp password: ${result.data.generatedTempPassword}`
      : result.data.message;
    setMessage({ type: "success", text });
  }

  return (
    <div className="stack">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Agent Management</h1>
          <p className="page-subtitle">
            Create, enable/disable, and manage agent accounts.
          </p>
        </div>
        <button
          className="admin-action-btn admin-action-btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          {showForm ? "Cancel" : "Add Agent"}
        </button>
      </header>

      {/* Notification */}
      {message && <UIAlert type={message.type}>{message.text}</UIAlert>}

      {/* Create Agent Form (collapsible) */}
      {showForm && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              New Agent
            </h2>
          </div>
          <div className="admin-card-body">
            <form className="field-grid" onSubmit={handleCreateAgent} style={{ maxWidth: 540 }}>
              <div className="two-col">
                <label className="field">
                  <span className="label">Email Address</span>
                  <UIInput
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="agent@example.com"
                  />
                  {fieldErrors.email && (
                    <span className="error-text">{fieldErrors.email}</span>
                  )}
                </label>
                <label className="field">
                  <span className="label">Display Name</span>
                  <UIInput
                    value={form.agentDisplayName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, agentDisplayName: e.target.value }))
                    }
                    placeholder="James Wilson"
                  />
                  {fieldErrors.agentDisplayName && (
                    <span className="error-text">{fieldErrors.agentDisplayName}</span>
                  )}
                </label>
              </div>

              <label className="field">
                <span className="label">Password Setup</span>
                <UISelect
                  value={form.mode}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      mode: e.target.value as CreateMode,
                      tempPassword: e.target.value === "TEMP_PASSWORD" ? p.tempPassword : "",
                    }))
                  }
                >
                  <option value="TEMP_PASSWORD">Set a temporary password</option>
                  <option value="AUTO_GENERATE">Auto-generate password</option>
                </UISelect>
              </label>

              {form.mode === "TEMP_PASSWORD" && (
                <label className="field">
                  <span className="label">Temporary Password</span>
                  <UIInput
                    type="password"
                    value={form.tempPassword}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tempPassword: e.target.value }))
                    }
                    placeholder="Min. 8 characters"
                  />
                  {fieldErrors.tempPassword && (
                    <span className="error-text">{fieldErrors.tempPassword}</span>
                  )}
                </label>
              )}

              <div className="inline-row">
                <UIButton type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create Agent"}
                </UIButton>
                <UIButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setFieldErrors({});
                    setForm({ email: "", agentDisplayName: "", mode: "TEMP_PASSWORD", tempPassword: "" });
                  }}
                >
                  Cancel
                </UIButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agent List */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
            </svg>
            All Agents
            <span
              style={{
                fontSize: "0.72rem",
                background: "var(--brand-gold-light)",
                color: "var(--brand-gold)",
                padding: "0.1rem 0.45rem",
                borderRadius: 99,
                fontWeight: 700,
                border: "1px solid var(--border-gold)",
              }}
            >
              {shownCount}
            </span>
          </h2>

          <div className="inline-row">
            <UIInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents…"
              style={{ minWidth: 200 }}
            />
            <label className="inline-row" style={{ cursor: "pointer", gap: "0.4rem" }}>
              <input
                type="checkbox"
                checked={includeDisabled}
                onChange={(e) => setIncludeDisabled(e.target.checked)}
              />
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Show disabled
              </span>
            </label>
            <UIButton
              variant="secondary"
              onClick={() => void fetchAgents()}
              disabled={loadingAgents}
            >
              {loadingAgents ? "Loading…" : "Refresh"}
            </UIButton>
          </div>
        </div>

        <div style={{ padding: 0 }}>
          {agents.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p className="muted">No agents found.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ borderRadius: 0, border: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Landlords</th>
                    <th>Properties</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const busy = workingAgentId === agent.id;
                    return (
                      <tr key={agent.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <AgentInitials
                              name={agent.agentDisplayName}
                              email={agent.email}
                            />
                            <div>
                              <strong>{agent.agentDisplayName}</strong>
                              <span
                                className="muted"
                                style={{ display: "block", fontSize: "0.78rem" }}
                              >
                                {agent.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${agent.isActive ? "badge-active" : "badge-locked"}`}
                          >
                            {agent.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="gold" style={{ fontWeight: 700 }}>
                          {agent.ownedLandlords}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {agent.ownedProperties}
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          {formatDate(agent.createdAt)}
                        </td>
                        <td>
                          <div className="inline-row">
                            <UIButton
                              variant={agent.isActive ? "danger" : "secondary"}
                              onClick={() => void toggleAgentStatus(agent)}
                              disabled={busy}
                            >
                              {busy
                                ? "…"
                                : agent.isActive
                                ? "Disable"
                                : "Enable"}
                            </UIButton>
                            <UIButton
                              variant="secondary"
                              onClick={() => void resetAgentPassword(agent)}
                              disabled={busy}
                            >
                              Reset PW
                            </UIButton>
                          </div>
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
    </div>
  );
}
