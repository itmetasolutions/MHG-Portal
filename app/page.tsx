import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";

export default async function HomePage() {
  const session = await getAuthSession();
  if (session) {
    redirect(session.role === UserRole.ADMIN ? "/admin" : "/dashboard");
  }

  return (
    <div className="lp-root">
      {/* ── Ambient glow layers ── */}
      <div className="lp-glow lp-glow-top" aria-hidden="true" />
      <div className="lp-glow lp-glow-mid" aria-hidden="true" />
      <div className="lp-grid-dots" aria-hidden="true" />

      {/* ── HERO ── */}
      <section className="lp-hero">

        {/* LEFT — copy */}
        <div className="lp-hero-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/morehomesgroup-logo.png" alt="More Homes Group" className="lp-logo" />

          <div className="lp-badge">
            <span className="lp-badge-dot" />
            Internal Operations Portal
          </div>

          <h1 className="lp-headline">
            Your Team&apos;s Lettings<br />
            <span className="lp-headline-gold">Command Centre</span>
          </h1>

          <p className="lp-sub">
            One platform for your entire lettings operation — from first landlord contact
            to signed tenancy, with full visibility at every step.
          </p>

          <div className="lp-cta-row">
            <Link href="/login" className="btn btn-primary btn-lg lp-btn-sign-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </Link>
            <Link href="/admin/login" className="btn btn-secondary btn-lg">
              Admin Access
            </Link>
          </div>

          <div className="lp-pills">
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-green" />
              Call Workflow
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-gold" />
              Property Tracking
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-blue" />
              Commission Reports
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-purple" />
              OTP Secured
            </span>
          </div>
        </div>

        {/* RIGHT — portal mockup */}
        <div className="lp-hero-right">
          <div className="lp-card lp-portal-card">
            {/* Card header */}
            <div className="lp-card-header">
              <div className="lp-card-dots">
                <span /><span /><span />
              </div>
              <span className="lp-card-title">Daily Overview</span>
              <span className="lp-card-date">Today</span>
            </div>

            {/* Stat row */}
            <div className="lp-stat-row">
              <div className="lp-stat lp-stat-muted">
                <span className="lp-stat-val">24</span>
                <span className="lp-stat-lbl">Searches</span>
              </div>
              <div className="lp-stat lp-stat-green">
                <span className="lp-stat-val">7</span>
                <span className="lp-stat-lbl">Confirmed</span>
              </div>
              <div className="lp-stat lp-stat-blue">
                <span className="lp-stat-val">11</span>
                <span className="lp-stat-lbl">Follow Ups</span>
              </div>
              <div className="lp-stat lp-stat-gold">
                <span className="lp-stat-val">3</span>
                <span className="lp-stat-lbl">Sales</span>
              </div>
            </div>

            {/* Activity list */}
            <div className="lp-activity-section">
              <p className="lp-activity-heading">Recent Activity</p>
              <div className="lp-activity-list">
                <div className="lp-activity-row">
                  <span className="lp-status-dot lp-dot-green" />
                  <span className="lp-activity-phone">+44 791 1122 33</span>
                  <span className="lp-activity-badge lp-badge-confirmed">Confirmed</span>
                  <span className="lp-activity-time">2m</span>
                </div>
                <div className="lp-activity-row">
                  <span className="lp-status-dot lp-dot-blue" />
                  <span className="lp-activity-phone">+44 771 4455 66</span>
                  <span className="lp-activity-badge lp-badge-followup">Follow Up</span>
                  <span className="lp-activity-time">18m</span>
                </div>
                <div className="lp-activity-row">
                  <span className="lp-status-dot lp-dot-red" />
                  <span className="lp-activity-phone">+44 756 8899 00</span>
                  <span className="lp-activity-badge lp-badge-notint">Not Interested</span>
                  <span className="lp-activity-time">1h</span>
                </div>
                <div className="lp-activity-row">
                  <span className="lp-status-dot lp-dot-gold" />
                  <span className="lp-activity-phone">+44 787 2233 44</span>
                  <span className="lp-activity-badge lp-badge-closed">Sale Closed</span>
                  <span className="lp-activity-time">3h</span>
                </div>
              </div>
            </div>

            {/* Properties bar */}
            <div className="lp-prop-section">
              <div className="lp-prop-header">
                <span className="lp-prop-label">Active Properties</span>
                <span className="lp-prop-count">9 <span className="lp-prop-total">/ 14</span></span>
              </div>
              <div className="lp-prog-track">
                <div className="lp-prog-fill" style={{ width: "64%" }} />
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <div className="lp-chip lp-chip-top">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span>+23% conversions this week</span>
          </div>

          <div className="lp-chip lp-chip-bottom">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            <span>3 sales closed today</span>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="lp-divider" />

      {/* ── FEATURES ── */}
      <section className="lp-features">
        <div className="lp-features-header">
          <p className="lp-features-kicker">Built for lettings teams</p>
          <h2 className="lp-features-title">Everything your agents need, nothing they don&apos;t</h2>
        </div>

        <div className="lp-feature-grid">

          <div className="lp-feature-card">
            <div className="lp-feature-icon lp-icon-gold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="lp-feature-body">
              <h3 className="lp-feature-title">Call Workflow</h3>
              <p className="lp-feature-desc">
                Look up any landlord by phone. Mark them Interested, schedule a Follow Up, or log Not Interested — every action is automatically recorded.
              </p>
              <div className="lp-feature-tags">
                <span>Interested Flow</span>
                <span>Follow Up Lock</span>
                <span>Auto Call Log</span>
              </div>
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon lp-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="lp-feature-body">
              <h3 className="lp-feature-title">Property Lifecycle</h3>
              <p className="lp-feature-desc">
                Manage private and shared properties from Draft to Available to Closed. Full room-level tracking for HMO properties with individual statuses.
              </p>
              <div className="lp-feature-tags">
                <span>Private &amp; Shared</span>
                <span>Room Tracking</span>
                <span>Auto Reference</span>
              </div>
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon lp-icon-green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="lp-feature-body">
              <h3 className="lp-feature-title">Sales &amp; Commission</h3>
              <p className="lp-feature-desc">
                Close sales in one flow — create the tenant record, log the deal, and have agent commission automatically calculated from admin configuration.
              </p>
              <div className="lp-feature-tags">
                <span>Close Sale Flow</span>
                <span>Agent Split</span>
                <span>Tenant Form</span>
              </div>
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon lp-icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </div>
            <div className="lp-feature-body">
              <h3 className="lp-feature-title">Reports &amp; Compliance</h3>
              <p className="lp-feature-desc">
                Daily activity reports are auto-calculated from real actions. Every change is audit-logged, role-gated, and secured with OTP verification.
              </p>
              <div className="lp-feature-tags">
                <span>Auto Reports</span>
                <span>Full Audit Log</span>
                <span>Role Access</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div className="lp-trust-strip">
        <div className="lp-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          JWT Session Auth
        </div>
        <span className="lp-trust-sep" aria-hidden="true" />
        <div className="lp-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          OTP Verification
        </div>
        <span className="lp-trust-sep" aria-hidden="true" />
        <div className="lp-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Role-Based Access
        </div>
        <span className="lp-trust-sep" aria-hidden="true" />
        <div className="lp-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Full Audit Trail
        </div>
        <span className="lp-trust-sep" aria-hidden="true" />
        <div className="lp-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Encrypted at Rest
        </div>
      </div>
    </div>
  );
}
