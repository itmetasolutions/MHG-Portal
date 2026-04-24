import Link from "next/link";

export const metadata = { title: "Start Call — MHG Portal" };

const workflowSteps = [
  {
    index: "01",
    title: "Check ownership first",
    copy: "Confirm whether the number is owned by you, owned by another agent, or brand new before moving forward.",
    icon: "⚡",
  },
  {
    index: "02",
    title: "Pick the right outcome",
    copy: "Choose Interested or Follow Up so the lead and reporting stay consistent across the team.",
    icon: "✓",
  },
  {
    index: "03",
    title: "Land on the next form",
    copy: "Each branch sends you straight into the next step without forcing duplicate data entry.",
    icon: "→",
  },
];

const ownershipStates = [
  {
    title: "Owned by you",
    copy: "You have an active claim. Move straight into the outcome and keep the lead in your pipeline.",
    tone: "is-interest",
    signal: "success",
    signalLabel: "Your lead",
    indicator: "✓",
  },
  {
    title: "Owned by another",
    copy: "Another agent is active on this contact. Avoid duplicate outreach and keep the handoff clean.",
    tone: "is-follow-up",
    signal: "info",
    signalLabel: "Claimed",
    indicator: "⚠",
  },
  {
    title: "New lead",
    copy: "No existing ownership. Register a fresh landlord or follow-up without needing to backtrack through records.",
    tone: "is-muted",
    signal: "warning",
    signalLabel: "New",
    indicator: "+",
  },
] as const;

const options = [
  {
    href: "/start/interested",
    title: "Interested",
    tone: "is-interest",
    summary: "Register a new property lead and move directly into landlord and listing details.",
    tag: "Property onboarding",
    cta: "Start →",
    detail: "Creates landlord record, adds property details, enters pipeline.",
  },
  {
    href: "/start/follow-up",
    title: "Follow Up",
    tone: "is-follow-up",
    summary: "Schedule the next touchpoint and keep the lead reserved under your workflow.",
    tag: "Lead nurturing",
    cta: "Schedule →",
    detail: "Sets follow-up date, logs contact, keeps ownership locked.",
  },
] as const;

export default function StartPage() {
  return (
    <div className="start-shell">

      {/* ── Hero + Steps ──────────────────────────────── */}
      <section className="start-hero workspace-panel">
        <div className="start-hero-copy">
          <p className="section-label">Call workflow</p>
          <h1 className="page-title">Choose the right outcome and keep the lead moving cleanly</h1>
          <p className="page-subtitle">
            Use this guided handoff after checking a landlord number. Pick the correct ownership state, then jump into the right next step without duplicating work.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <Link href="/start/interested" className="btn btn-primary">Interested lead →</Link>
            <Link href="/start/follow-up" className="btn btn-secondary">Follow-up lead →</Link>
          </div>
        </div>

        <div className="start-steps">
          {workflowSteps.map((step) => (
            <div key={step.title} className="start-step-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="start-step-index">{step.index}</span>
                <span style={{ fontSize: '0.9rem' }}>{step.icon}</span>
              </div>
              <h2 className="start-step-title">{step.title}</h2>
              <p className="start-step-copy">{step.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ownership State Reference ─────────────────── */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <p className="workspace-kicker">Ownership states</p>
          <span style={{ height: 1, flex: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reference guide</span>
        </div>
        <div className="start-options">
          {ownershipStates.map((state) => (
            <article key={state.title} className={`start-option-card ${state.tone}`}>
              <div className="start-option-head">
                <span className="start-option-tag">Ownership state</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '1.6rem', height: '1.6rem', borderRadius: '999px',
                  fontSize: '0.78rem', fontWeight: 800,
                  background: state.signal === 'success' ? 'rgba(95,188,106,0.14)' :
                               state.signal === 'info'    ? 'rgba(107,168,255,0.14)' :
                                                            'rgba(202,155,54,0.14)',
                  color:      state.signal === 'success' ? '#bce8c2' :
                               state.signal === 'info'    ? '#d3e4ff' : '#f8e6bc',
                  border:     `1px solid ${state.signal === 'success' ? 'rgba(95,188,106,0.28)' :
                               state.signal === 'info'    ? 'rgba(107,168,255,0.28)' :
                                                            'rgba(202,155,54,0.28)'}`,
                }}>
                  {state.indicator}
                </span>
              </div>
              <h2 className="start-option-title">{state.title}</h2>
              <p className="start-option-copy">{state.copy}</p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: state.signal === 'success' ? '#bce8c2' :
                       state.signal === 'info'    ? '#d3e4ff' : '#f8e6bc',
                marginTop: 'auto', paddingTop: '0.25rem',
              }}>
                {state.signalLabel}
              </span>
            </article>
          ))}
        </div>
      </div>

      {/* ── Decision Actions ──────────────────────────── */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <p className="workspace-kicker">Take action</p>
          <span style={{ height: 1, flex: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Choose an outcome</span>
        </div>
        <div className="start-options">
          {options.map((option) => (
            <Link key={option.href} href={option.href} className={`start-option-card ${option.tone}`}>
              <div className="start-option-head">
                <span className="start-option-tag">{option.tag}</span>
                <span className="start-option-arrow">{option.cta}</span>
              </div>
              <h2 className="start-option-title">{option.title}</h2>
              <p className="start-option-copy">{option.summary}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', marginTop: '0.25rem', lineHeight: 1.5 }}>
                {option.detail}
              </p>
            </Link>
          ))}

          {/* Not interested — info card */}
          <div className="start-option-card is-muted">
            <div className="start-option-head">
              <span className="start-option-tag">Instant logging</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No form needed</span>
            </div>
            <h2 className="start-option-title">Not Interested</h2>
            <p className="start-option-copy">
              Use the <strong style={{ color: 'var(--text-primary)' }}>Not Interested</strong> action in the lookup bar after checking the number. It records the outcome immediately without opening another form.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', marginTop: '0.25rem', lineHeight: 1.5 }}>
              Logs contact, marks lead as closed, no pipeline entry created.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
