import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="landing-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/morehomesgroup-logo.png"
          alt="More Homes Group"
          className="landing-logo"
        />
        <h1 className="landing-title">Landlord Registry Portal</h1>
        <p className="landing-subtitle">
          The secure, all-in-one platform for More Homes Group agents to manage
          landlords, properties, and compliance records.
        </p>
        <div className="inline-row landing-cta">
          <Link className="btn btn-primary btn-lg" href="/login">
            Sign In to Portal
          </Link>
        </div>
      </section>

      <hr className="landing-divider" />

      <div className="landing-features-grid">
        <div className="feature-card">
          <span className="feature-icon">🏠</span>
          <h3 className="feature-title">Landlord Registry</h3>
          <p className="feature-desc">
            Maintain a complete, searchable registry of all landlords with
            status tracking and compliance records.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏘</span>
          <h3 className="feature-title">Property Management</h3>
          <p className="feature-desc">
            Track properties linked to each landlord, with full address details
            and reference management.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">👥</span>
          <h3 className="feature-title">Agent Accounts</h3>
          <p className="feature-desc">
            Role-based access for agents with isolated portfolio views and full
            audit trail logging.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🔒</span>
          <h3 className="feature-title">Secure 2-Factor Login</h3>
          <p className="feature-desc">
            Email OTP verification on every login keeps your data protected at
            all times.
          </p>
        </div>
      </div>
    </div>
  );
}
