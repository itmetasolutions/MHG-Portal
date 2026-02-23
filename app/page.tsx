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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/morehomesgroup-logo.png"
          alt="More Homes Group"
          className="landing-logo"
        />
        <p className="landing-kicker">More Homes Group</p>
        <h1 className="landing-title">
          Letting Agency <span>Portal</span>
        </h1>
        <p className="landing-subtitle">
          A single platform for your lettings team to manage landlords,
          tenancies, properties, and compliance without switching systems.
        </p>
        <div className="inline-row landing-cta">
          <Link className="btn btn-primary btn-lg" href="/login">
            Sign In
          </Link>
          <Link className="btn btn-secondary btn-lg" href="/admin/login">
            Admin Access
          </Link>
        </div>
        <div className="landing-metrics">
          <div className="landing-metric">
            <p className="landing-metric-label">Portfolio Control</p>
            <p className="landing-metric-value">Landlords + Tenants + Properties</p>
          </div>
          <div className="landing-metric">
            <p className="landing-metric-label">Daily Operations</p>
            <p className="landing-metric-value">Sales, status changes, and activity logs</p>
          </div>
          <div className="landing-metric">
            <p className="landing-metric-label">Security</p>
            <p className="landing-metric-value">Role-based access with OTP verification</p>
          </div>
        </div>
      </section>

      <section className="landing-features-grid">
        <article className="feature-card">
          <h3 className="feature-title">Landlord and Tenant Workflows</h3>
          <p className="feature-desc">
            Keep contacts, ownership details, notes, and tenancy records in one
            connected workflow.
          </p>
        </article>
        <article className="feature-card">
          <h3 className="feature-title">Property Lifecycle Tracking</h3>
          <p className="feature-desc">
            Manage every property from intake to status updates with clear
            visibility for each assigned agent.
          </p>
        </article>
        <article className="feature-card">
          <h3 className="feature-title">Agency Team Management</h3>
          <p className="feature-desc">
            Give admins and agents the exact permissions they need with
            structured oversight and accountability.
          </p>
        </article>
        <article className="feature-card">
          <h3 className="feature-title">Compliance and Audit Trail</h3>
          <p className="feature-desc">
            Capture critical updates and operational events so reporting and
            governance stay reliable.
          </p>
        </article>
      </section>
    </div>
  );
}
