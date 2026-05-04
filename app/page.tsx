/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";

const homeImage = (path: string) =>
  encodeURI(`/assets/images/Home/${path}`);

const landingFeatureCards = [
  {
    title: "Landlord and Tenant Workflows",
    description:
      "Keep contacts, ownership details, notes, and tenancy records in one connected workflow.",
    image: homeImage("How it works/Discover Properties.webp"),
    imageAlt: "Property discovery and portfolio workflow support",
    label: "Discover",
  },
  {
    title: "Property Lifecycle Tracking",
    description:
      "Manage every property from intake to status updates with clear visibility for each assigned agent.",
    image: homeImage("How it works/Secure The Let.webp"),
    imageAlt: "Property lifecycle and letting workflow",
    label: "Track",
  },
  {
    title: "Agency Team Management",
    description:
      "Give admins and agents the exact permissions they need with structured oversight and accountability.",
    image: homeImage("How it works/Schedule a Visit.webp"),
    imageAlt: "Agency team coordination and scheduled activity",
    label: "Coordinate",
  },
  {
    title: "Compliance and Audit Trail",
    description:
      "Capture critical updates and operational events so reporting and governance stay reliable.",
    image: homeImage("How it works/Ongoing Support.webp"),
    imageAlt: "Ongoing support and compliance-friendly operations",
    label: "Support",
  },
];

const activityItems = [
  { phone: "+44 791 1122 33", status: "Confirmed", time: "2m", color: "green" },
  { phone: "+44 771 4455 66", status: "Follow Up", time: "18m", color: "blue" },
  { phone: "+44 756 8899 00", status: "Not Interested", time: "1h", color: "red" },
  { phone: "+44 787 2233 44", status: "Sale Closed", time: "3h", color: "gold" },
];

export default async function HomePage() {
  const session = await getAuthSession();
  if (session) {
    redirect(session.role === UserRole.ADMIN ? "/admin" : "/dashboard");
  }

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-grid">
          {/* Left: copy */}
          <div className="landing-hero-copy">
            <div className="landing-portal-badge">
              <span className="landing-portal-dot" />
              INTERNAL OPERATIONS PORTAL
            </div>
            <h1 className="landing-title">
              Your Team&apos;s Lettings
              <br />
              <span>Command Centre</span>
            </h1>
            <p className="landing-subtitle">
              One platform for your entire lettings operation — from first
              landlord contact to signed tenancy, with full visibility at every
              step.
            </p>
            <div className="inline-row landing-cta">
              <Link className="btn btn-primary btn-lg" href="/login">
                <span className="landing-btn-arrow">→</span> Sign In
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/admin/login">
                Admin Access
              </Link>
            </div>
            <div className="landing-tags">
              <span className="landing-tag" data-color="green">
                Call Workflow
              </span>
              <span className="landing-tag" data-color="gold">
                Property Tracking
              </span>
              <span className="landing-tag" data-color="blue">
                Commission Reports
              </span>
              <span className="landing-tag" data-color="purple">
                OTP Secured
              </span>
            </div>
          </div>

          {/* Right: dashboard mock */}
          <div className="landing-hero-dash-wrap">
            <div className="landing-conv-chip">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +23% conversions this week
            </div>

            <div className="landing-dash-card">
              <div className="landing-dash-header">
                <div className="landing-dash-dots">
                  <span className="dash-dot dash-dot-red" />
                  <span className="dash-dot dash-dot-yellow" />
                  <span className="dash-dot dash-dot-green" />
                </div>
                <span className="landing-dash-title">Daily Overview</span>
                <span className="landing-dash-today">Today</span>
              </div>

              <div className="landing-dash-stats">
                <div className="landing-dash-stat">
                  <strong>24</strong>
                  <span>SEARCHES</span>
                </div>
                <div className="landing-dash-stat landing-dash-stat-blue">
                  <strong>7</strong>
                  <span>CONFIRMED</span>
                </div>
                <div className="landing-dash-stat landing-dash-stat-orange">
                  <strong>11</strong>
                  <span>FOLLOW UPS</span>
                </div>
                <div className="landing-dash-stat landing-dash-stat-gold">
                  <strong>3</strong>
                  <span>SALES</span>
                </div>
              </div>

              <div className="landing-dash-divider" />

              <div className="landing-dash-section">
                <p className="landing-dash-section-label">RECENT ACTIVITY</p>
                <div className="landing-dash-activities">
                  {activityItems.map((item) => (
                    <div key={item.phone} className="landing-dash-activity-row">
                      <span
                        className={`landing-dash-activity-dot activity-dot-${item.color}`}
                      />
                      <span className="landing-dash-activity-phone">
                        {item.phone}
                      </span>
                      <span
                        className={`landing-dash-status landing-dash-status-${item.color}`}
                      >
                        {item.status}
                      </span>
                      <span className="landing-dash-activity-time">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="landing-dash-divider" />

              <div className="landing-dash-section">
                <div className="landing-dash-props-row">
                  <span className="landing-dash-section-label">
                    ACTIVE PROPERTIES
                  </span>
                  <span className="landing-dash-props-count">
                    9{" "}
                    <span className="landing-dash-props-total">/ 14</span>
                  </span>
                </div>
                <div className="landing-dash-progress-track">
                  <div className="landing-dash-progress-fill" />
                </div>
              </div>
            </div>

            <div className="landing-sales-chip">☕ 3 sales closed today</div>
          </div>
        </div>
      </section>

      <section className="landing-features-grid">
        {landingFeatureCards.map((card) => (
          <article key={card.title} className="feature-card">
            <div className="feature-card-media">
              <img
                src={card.image}
                alt={card.imageAlt}
                className="feature-card-image"
              />
              <span className="feature-card-label">{card.label}</span>
            </div>
            <div className="feature-card-body">
              <h3 className="feature-title">{card.title}</h3>
              <p className="feature-desc">{card.description}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
