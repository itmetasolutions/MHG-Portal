import Link from 'next/link';

function settingsToggle(label: string, description: string, defaultChecked = false) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" defaultChecked={defaultChecked} />
      <span className="settings-toggle__ui" />
      <span className="settings-toggle__copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
    </label>
  );
}

export default function ProfilePage() {
  return (
    <div className="settings-page">
      <section className="workspace-panel settings-hero">
        <div className="settings-hero__content">
          <p className="workspace-kicker">Settings</p>
          <h1 className="workspace-panel__title">Profile and workspace preferences</h1>
          <p className="workspace-panel__summary">
            Personalise your account, dialer behaviour, notification cadence, and theme in one premium settings surface.
          </p>
        </div>
        <div className="settings-hero__actions">
          <Link href="/dashboard" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="settings-layout">
        <div className="settings-layout__main">
          <form className="workspace-panel settings-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Profile</p>
                <h2 className="workspace-panel__title">Account information</h2>
              </div>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Full name</span>
                <input className="input" name="name" defaultValue="" placeholder="Agent name" />
              </label>
              <label className="settings-field">
                <span>Email address</span>
                <input className="input" name="email" type="email" defaultValue="" placeholder="name@company.com" />
              </label>
              <label className="settings-field">
                <span>Phone number</span>
                <input className="input" name="phone" defaultValue="" placeholder="+44..." />
              </label>
              <label className="settings-field settings-field--wide">
                <span>Bio</span>
                <textarea className="input" name="bio" rows={5} defaultValue="" placeholder="A short professional summary..." />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="btn btn-primary">
                Save profile
              </button>
            </div>
          </form>

          <form className="workspace-panel settings-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Security</p>
                <h2 className="workspace-panel__title">Password update</h2>
              </div>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Current password</span>
                <input className="input" name="currentPassword" type="password" />
              </label>
              <label className="settings-field">
                <span>New password</span>
                <input className="input" name="newPassword" type="password" />
              </label>
              <label className="settings-field">
                <span>Confirm password</span>
                <input className="input" name="confirmPassword" type="password" />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="btn btn-secondary">
                Update password
              </button>
            </div>
          </form>

          <section className="workspace-panel settings-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Communication</p>
                <h2 className="workspace-panel__title">Notifications and dialer preferences</h2>
              </div>
            </div>

            <div className="settings-stack">
              {settingsToggle('Email notifications', 'Receive important account and ownership updates.', true)}
              {settingsToggle('Push notifications', 'Surface urgent messages, approvals, and call outcomes.', true)}
              {settingsToggle('Call reminders', 'Prompt follow-ups when tasks are due.', true)}
              {settingsToggle('Typing indicators', 'Show live chat indicators in the workspace.', false)}
            </div>
          </section>
        </div>

        <aside className="settings-layout__aside">
          <section className="workspace-panel settings-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Dialer</p>
                <h2 className="workspace-panel__title">Call handling</h2>
              </div>
            </div>

            <div className="settings-stack">
              <label className="settings-field">
                <span>Default outcome</span>
                <select className="input" defaultValue="connected">
                  <option value="connected">Connected</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="call-back">Call back</option>
                  <option value="not-interested">Not interested</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Call timeout</span>
                <input className="input" defaultValue="45" />
              </label>
              <label className="settings-field">
                <span>Default tag</span>
                <input className="input" defaultValue="priority" />
              </label>
            </div>
          </section>

          <section className="workspace-panel settings-panel">
            <div className="workspace-panel__header">
              <div>
                <p className="workspace-kicker">Theme</p>
                <h2 className="workspace-panel__title">Workspace appearance</h2>
              </div>
            </div>

            <div className="settings-stack">
              {settingsToggle('Dark premium mode', 'Use the charcoal and gold command centre theme.', true)}
              {settingsToggle('Compact density', 'Increase information density for power usage.', false)}
              {settingsToggle('Motion reduced', 'Keep transitions subtle for focus.', false)}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}