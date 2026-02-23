"use client";

import { FormEvent, useState } from "react";
import { UIAlert } from "@/components/ui/alert";
import { UIButton } from "@/components/ui/button";
import { UIInput } from "@/components/ui/input";
import { apiPatch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

type UserProfile = {
  id: string;
  email: string;
  agentDisplayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  ownedLandlords: number;
  ownedProperties: number;
};

type Props = {
  user: UserProfile;
};

export function ProfileClient({ user }: Props) {
  const [displayName, setDisplayName] = useState(user.agentDisplayName);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || user.email[0].toUpperCase();

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameMsg({ type: "error", text: "Display name cannot be empty." });
      return;
    }
    setSavingName(true);
    const result = await apiPatch<{ agentDisplayName: string }, { message: string }>(
      "/api/profile",
      { agentDisplayName: trimmed }
    );
    setSavingName(false);
    if (!result.ok) {
      setNameMsg({ type: "error", text: result.message ?? "Failed to update name." });
      return;
    }
    setNameMsg({ type: "success", text: result.data.message });
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current = "Current password is required.";
    if (!newPassword) errors.new = "New password is required.";
    else if (newPassword.length < 8) errors.new = "Minimum 8 characters.";
    if (newPassword !== confirmPassword) errors.confirm = "Passwords do not match.";
    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPw(true);
    const result = await apiPatch<
      { currentPassword: string; newPassword: string },
      { message: string }
    >("/api/profile", { currentPassword, newPassword });
    setSavingPw(false);

    if (!result.ok) {
      setPwMsg({ type: "error", text: result.message ?? "Failed to change password." });
      return;
    }
    setPwMsg({ type: "success", text: result.data.message });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwErrors({});
  }

  return (
    <div className="stack">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account details and security settings.</p>
        </div>
      </header>

      <div className="profile-grid">
        {/* Left: Identity Card */}
        <div>
          <div className="profile-avatar-card">
            <div className="profile-avatar">{initials}</div>
            <h2 className="profile-name">{displayName}</h2>
            <p className="profile-email">{user.email}</p>
            <span className={`badge ${user.role === "ADMIN" ? "badge-admin" : "badge-active"}`}>
              {user.role}
            </span>

            <div className="profile-meta" style={{ marginTop: "0.5rem" }}>
              <div className="profile-meta-row">
                <span className="profile-meta-key">Status</span>
                <span className={`badge ${user.isActive ? "badge-active" : "badge-locked"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-key">Member since</span>
                <span className="profile-meta-value">{formatDate(user.createdAt)}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-key">Landlords</span>
                <span className="profile-meta-value gold">{user.ownedLandlords}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-key">Properties</span>
                <span className="profile-meta-value gold">{user.ownedProperties}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Edit Forms */}
        <div className="stack">
          {/* Edit Display Name */}
          <div className="panel">
            <div
              style={{
                padding: "0.9rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ color: "var(--brand-gold)" }}
              >
                <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
              <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
                Edit Display Name
              </h2>
            </div>
            <div className="panel-body">
              {nameMsg && <UIAlert type={nameMsg.type} style={{ marginBottom: "0.75rem" }}>{nameMsg.text}</UIAlert>}
              <form onSubmit={(e) => void handleSaveName(e)} className="field-grid" style={{ maxWidth: 400 }}>
                <label className="field">
                  <span className="label">Display Name</span>
                  <UIInput
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </label>
                <div>
                  <UIButton type="submit" disabled={savingName}>
                    {savingName ? "Saving…" : "Save Name"}
                  </UIButton>
                </div>
              </form>
            </div>
          </div>

          {/* Change Password */}
          <div className="panel">
            <div
              style={{
                padding: "0.9rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ color: "var(--brand-gold)" }}
              >
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
              <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
                Change Password
              </h2>
            </div>
            <div className="panel-body">
              {pwMsg && <UIAlert type={pwMsg.type} style={{ marginBottom: "0.75rem" }}>{pwMsg.text}</UIAlert>}
              <form
                onSubmit={(e) => void handleChangePassword(e)}
                className="field-grid"
                style={{ maxWidth: 400 }}
              >
                <label className="field">
                  <span className="label">Current Password</span>
                  <UIInput
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  {pwErrors.current && (
                    <span className="error-text">{pwErrors.current}</span>
                  )}
                </label>

                <label className="field">
                  <span className="label">New Password</span>
                  <UIInput
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  {pwErrors.new && (
                    <span className="error-text">{pwErrors.new}</span>
                  )}
                </label>

                <label className="field">
                  <span className="label">Confirm New Password</span>
                  <UIInput
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  {pwErrors.confirm && (
                    <span className="error-text">{pwErrors.confirm}</span>
                  )}
                </label>

                <div>
                  <UIButton type="submit" disabled={savingPw}>
                    {savingPw ? "Saving…" : "Change Password"}
                  </UIButton>
                </div>
              </form>
            </div>
          </div>

          {/* Account Info */}
          <div className="panel">
            <div
              style={{
                padding: "0.9rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ color: "var(--brand-gold)" }}
              >
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
              </svg>
              <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
                Account Information
              </h2>
            </div>
            <div className="panel-body">
              <div
                style={{
                  display: "grid",
                  gap: "0.6rem",
                  fontSize: "0.875rem",
                }}
              >
                {[
                  { label: "Email Address", value: user.email },
                  { label: "Account Role", value: user.role },
                  { label: "Account ID", value: user.id.slice(0, 16) + "…" },
                  { label: "Member Since", value: formatDate(user.createdAt) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid var(--border-muted)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                      {label}
                    </span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="hint-text" style={{ marginTop: "0.75rem" }}>
                To change your email address, contact an administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
