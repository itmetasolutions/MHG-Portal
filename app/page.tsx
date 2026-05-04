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
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-glow-a" aria-hidden="true" />
        <div className="landing-glow-b" aria-hidden="true" />
        <div className="landing-grid-bg" aria-hidden="true" />

        <div className="landing-content">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            Internal Operations Portal
          </div>

          <h1 className="landing-title">
            Your Team&apos;s Lettings
            <br />
            <span className="landing-title-accent">Command Centre</span>
          </h1>

          <p className="landing-subtitle">
            One platform for your entire lettings operation — from first landlord
            contact to signed tenancy, with full visibility at every step.
          </p>

          <div className="landing-actions">
            <Link href="/login" className="landing-btn-primary">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </Link>
            <Link href="/admin/login" className="landing-btn-secondary">
              Admin Access
            </Link>
          </div>

          <div className="landing-divider" aria-hidden="true" />

          <ul className="landing-features" aria-label="Portal features">
            <li>
              <span className="landing-feature-dot" style={{ background: "#22c55e" }} />
              Call Workflow
            </li>
            <li>
              <span className="landing-feature-dot" style={{ background: "#c9a84c" }} />
              Property Tracking
            </li>
            <li>
              <span className="landing-feature-dot" style={{ background: "#60a5fa" }} />
              Commission Reports
            </li>
            <li>
              <span className="landing-feature-dot" style={{ background: "#a78bfa" }} />
              OTP Secured
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
