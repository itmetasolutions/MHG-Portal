"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UICard, UICardBody } from "@/components/ui/card";
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

function validateCreateForm(form: CreateFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = form.email.trim();

  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  if (!form.agentDisplayName.trim()) errors.agentDisplayName = "Agent display name is required.";

  if (form.mode === "TEMP_PASSWORD") {
    if (!form.tempPassword) errors.tempPassword = "Temporary password is required.";
    else if (form.tempPassword.length < 8) errors.tempPassword = "Must be at least 8 characters.";
  }

  return errors;
}

export function AgentsAdminClient({ initialAgents }: Props) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [search, setSearch] = useState("");
  const [includeDisabled, setIncludeDisabled] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [workingAgentId, setWorkingAgentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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

    const mapped: AgentRow[] = (result.data.agents ?? []).map((agent) => ({
      id: agent.id,
      email: agent.email,
      agentDisplayName: agent.agentDisplayName,
      isActive: agent.isActive,
      createdAt: new Date(agent.createdAt).toISOString(),
      ownedLandlords: agent._count?.ownedLandlords ?? 0,
      ownedProperties: agent._count?.ownedProperties ?? 0,
    }));
    setAgents(mapped);
  }

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const errors = validateCreateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

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
    setForm({
      email: "",
      agentDisplayName: "",
      mode: "TEMP_PASSWORD",
      tempPassword: "",
    });
    setFieldErrors({});
    await fetchAgents();
  }

  async function toggleAgentStatus(agent: AgentRow) {
    setWorkingAgentId(agent.id);
    setMessage(null);
    const result = await apiPatch<{ isActive: boolean }, { message: string; agent: { isActive: boolean } }>(
      `/api/admin/users/${agent.id}`,
      { isActive: !agent.isActive },
    );
    setWorkingAgentId(null);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to update status." });
      return;
    }

    setAgents((prev) =>
      prev.map((item) => (item.id === agent.id ? { ...item, isActive: result.data.agent.isActive } : item)),
    );
    setMessage({ type: "success", text: result.data.message });
  }

  async function resetAgentPassword(agent: AgentRow) {
    setWorkingAgentId(agent.id);
    setMessage(null);
    const result = await apiPatch<{ resetPasswordAuto: boolean }, { message: string; generatedTempPassword?: string }>(
      `/api/admin/users/${agent.id}`,
      { resetPasswordAuto: true },
    );
    setWorkingAgentId(null);

    if (!result.ok) {
      setMessage({ type: "error", text: result.message ?? "Failed to reset password." });
      return;
    }

    const text = result.data.generatedTempPassword
      ? `${result.data.message} Temporary password: ${result.data.generatedTempPassword}`
      : result.data.message;
    setMessage({ type: "success", text });
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin: Agents</h1>
          <p className="page-subtitle">Create, enable/disable, and reset agent accounts.</p>
        </div>
        <Link className="btn btn-secondary" href="/admin">
          Back to Admin Dashboard
        </Link>
      </header>

      {message ? <UIAlert type={message.type}>{message.text}</UIAlert> : null}

      <UICard>
        <UICardBody>
          <h2 style={{ marginTop: 0 }}>Create Agent</h2>
          <form className="field-grid" onSubmit={handleCreateAgent} style={{ maxWidth: 560 }}>
            <label className="field">
              <span className="label">Email</span>
              <UIInput value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              {fieldErrors.email ? <span className="error-text">{fieldErrors.email}</span> : null}
            </label>

            <label className="field">
              <span className="label">Agent Display Name</span>
              <UIInput
                value={form.agentDisplayName}
                onChange={(event) => setForm((prev) => ({ ...prev, agentDisplayName: event.target.value }))}
              />
              {fieldErrors.agentDisplayName ? <span className="error-text">{fieldErrors.agentDisplayName}</span> : null}
            </label>

            <label className="field">
              <span className="label">Password Setup</span>
              <UISelect
                value={form.mode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    mode: event.target.value as CreateMode,
                    tempPassword: event.target.value === "TEMP_PASSWORD" ? prev.tempPassword : "",
                  }))
                }
              >
                <option value="TEMP_PASSWORD">Temporary Password</option>
                <option value="AUTO_GENERATE">Auto-generate Password</option>
              </UISelect>
            </label>

            {form.mode === "TEMP_PASSWORD" ? (
              <label className="field">
                <span className="label">Temporary Password</span>
                <UIInput
                  type="password"
                  value={form.tempPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, tempPassword: event.target.value }))}
                />
                {fieldErrors.tempPassword ? <span className="error-text">{fieldErrors.tempPassword}</span> : null}
              </label>
            ) : null}

            <div className="inline-row">
              <UIButton type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Agent"}
              </UIButton>
            </div>
          </form>
        </UICardBody>
      </UICard>

      <UICard>
        <UICardBody className="stack">
          <div className="inline-row">
            <UIInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents"
              style={{ minWidth: 240 }}
            />
            <label className="inline-row">
              <input
                type="checkbox"
                checked={includeDisabled}
                onChange={(event) => setIncludeDisabled(event.target.checked)}
              />
              <span className="label">Include disabled</span>
            </label>
            <UIButton variant="secondary" onClick={() => void fetchAgents()} disabled={loadingAgents}>
              {loadingAgents ? "Loading..." : "Refresh"}
            </UIButton>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Landlords</th>
                  <th>Properties</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const busy = workingAgentId === agent.id;
                  return (
                    <tr key={agent.id}>
                      <td>{agent.agentDisplayName}</td>
                      <td>{agent.email}</td>
                      <td>{agent.isActive ? "Enabled" : "Disabled"}</td>
                      <td>{agent.ownedLandlords}</td>
                      <td>{agent.ownedProperties}</td>
                      <td>{formatDate(agent.createdAt)}</td>
                      <td>
                        <div className="inline-row">
                          <UIButton
                            variant="secondary"
                            onClick={() => void toggleAgentStatus(agent)}
                            disabled={busy}
                          >
                            {agent.isActive ? "Disable" : "Enable"}
                          </UIButton>
                          <UIButton
                            variant="secondary"
                            onClick={() => void resetAgentPassword(agent)}
                            disabled={busy}
                          >
                            Reset Password
                          </UIButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No agents found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="muted">{shownCount} agents shown.</p>
        </UICardBody>
      </UICard>
    </div>
  );
}
