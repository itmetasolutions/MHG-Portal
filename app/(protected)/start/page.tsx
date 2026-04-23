import Link from "next/link";

export const metadata = { title: "Start Call" };

export default function StartPage() {
  return (
    <div className="stack" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.25rem" }}>Start Call</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Look up the landlord number in the sidebar first, then choose an outcome below.
        </p>
      </div>

      <div className="stack" style={{ gap: "0.75rem" }}>
        <Link href="/start/interested" className="panel" style={{ display: "block", padding: "1.25rem 1.5rem", textDecoration: "none", cursor: "pointer", borderLeft: "3px solid var(--brand-gold)" }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "var(--brand-gold)" }}>
            Interested
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Landlord wants to list a property. Fill in landlord and property details to register.
          </p>
        </Link>

        <Link href="/start/follow-up" className="panel" style={{ display: "block", padding: "1.25rem 1.5rem", textDecoration: "none", cursor: "pointer", borderLeft: "3px solid #60a5fa" }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#60a5fa" }}>
            Follow Up
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Landlord needs more time. Schedule a follow-up call and lock the lead for your agent profile.
          </p>
        </Link>

        <div className="panel" style={{ padding: "1.25rem 1.5rem", borderLeft: "3px solid var(--text-subtle)" }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "var(--text-muted)" }}>
            Not Interested
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Use the <strong>Not Interested</strong> button in the lookup strip after checking the number.
            This logs the call immediately without navigating away.
          </p>
        </div>
      </div>
    </div>
  );
}
