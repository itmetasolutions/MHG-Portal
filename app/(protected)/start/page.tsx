import Link from "next/link";

export const metadata = { title: "Start Call" };

const steps = [
  "Check the landlord number in the lookup bar first.",
  "Pick the correct call outcome so ownership and history stay clean.",
  "Continue straight into the next form without re-entering the same context.",
];

const options = [
  {
    href: "/start/interested",
    title: "Interested",
    tone: "is-interest",
    summary: "Register a new property lead and move directly into landlord and listing details.",
    tag: "Property onboarding",
  },
  {
    href: "/start/follow-up",
    title: "Follow Up",
    tone: "is-follow-up",
    summary: "Schedule the next touchpoint and keep the lead reserved under your workflow.",
    tag: "Lead nurturing",
  },
];

export default function StartPage() {
  return (
    <div className="start-shell">
      <section className="start-hero panel">
        <div className="start-hero-copy">
          <p className="section-label">Call workflow</p>
          <h1 className="page-title">Choose the right outcome and keep the lead moving cleanly</h1>
          <p className="page-subtitle">
            This page is your handoff point after a number check. Start from the correct branch so
            every call is logged properly and the next step stays obvious for the team.
          </p>
        </div>

        <div className="start-steps">
          {steps.map((step, index) => (
            <div key={step} className="start-step-card">
              <span className="start-step-index">0{index + 1}</span>
              <p className="start-step-copy">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="start-options">
        {options.map((option) => (
          <Link key={option.href} href={option.href} className={`start-option-card ${option.tone}`}>
            <div className="start-option-head">
              <span className="start-option-tag">{option.tag}</span>
              <span className="start-option-arrow">Open</span>
            </div>
            <h2 className="start-option-title">{option.title}</h2>
            <p className="start-option-copy">{option.summary}</p>
          </Link>
        ))}

        <div className="start-option-card is-muted">
          <div className="start-option-head">
            <span className="start-option-tag">Instant logging</span>
          </div>
          <h2 className="start-option-title">Not Interested</h2>
          <p className="start-option-copy">
            Use the <strong>Not Interested</strong> button in the lookup bar after checking the
            number. It records the outcome immediately without taking you into another form.
          </p>
        </div>
      </section>
    </div>
  );
}
