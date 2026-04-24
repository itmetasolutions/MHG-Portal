import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";

const featureCards = [
  {
    title: "Ownership-aware lead handling",
    copy: "Every landlord and tenant flow shows who owns the relationship, what the next step is, and when a handoff needs intervention.",
    stat: "Owned by you, owned by another, or new lead",
  },
  {
    title: "Command center dashboards",
    copy: "Daily KPIs, sales movements, portfolio health, and conversation status sit together in a single premium operating view.",
    stat: "Built for decisions, not just records",
  },
  {
    title: "Guided calling workflow",
    copy: "Move from call to note-taking to outcome logging without leaving the record, so the context stays attached to every conversation.",
    stat: "Dialer, notes, and outcomes in one place",
  },
  {
    title: "Operational intelligence",
    copy: "Spot hot leads, stale follow-ups, property bottlenecks, and revenue shifts before they become missed opportunities.",
    stat: "Signals surfaced in real time",
  },
  {
    title: "Team collaboration",
    copy: "Use chat, notifications, timelines, and approvals to keep agents, admins, and leadership aligned across the same workspace.",
    stat: "Less switching, faster coordination",
  },
  {
    title: "Trust-first authentication",
    copy: "Secure login, OTP verification, and role-based redirects create a polished pre-login funnel for every user journey.",
    stat: "Protected access with clean routing",
  },
];

const workflowSteps = [
  {
    title: "Capture",
    copy: "New lead lands with ownership metadata and first-touch context.",
  },
  {
    title: "Qualify",
    copy: "Call, tag, and qualify with clear next-step prompts.",
  },
  {
    title: "Convert",
    copy: "Move into property creation, follow-up, or verified verification flows.",
  },
  {
    title: "Track",
    copy: "Monitor sales, tasks, timelines, and performance in live dashboards.",
  },
  {
    title: "Report",
    copy: "Surface outcomes and revenue insights in one command center.",
  },
];

const trustItems = [
  "Role-based portal access for agents and admins",
  "OTP protected authentication and secure session redirects",
  "Ownership-aware workflows that reduce duplicate work",
  "Premium UI language with audit-friendly data surfaces",
];

const dashboardHighlights = [
  { label: "Active leads", value: "148", meta: "+12 today" },
  { label: "Properties", value: "412", meta: "38 hot" },
  { label: "Sales", value: "31", meta: "9 this week" },
  { label: "Commission", value: "£48.2k", meta: "+8% forecast" },
];

export default async function HomePage() {
  const session = await getAuthSession();

  if (session) {
    redirect(session.role === UserRole.ADMIN ? "/admin" : "/dashboard");
  }

  return (
    <main className="lp-root lp-root-premium">
      <div className="lp-glow lp-glow-top" aria-hidden="true" />
      <div className="lp-glow lp-glow-mid" aria-hidden="true" />
      <div className="lp-grid-dots" aria-hidden="true" />

      <section className="lp-hero lp-hero-premium">
        <div className="lp-hero-copy-pane">
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            More Homes Group Portal
          </div>

          <h1 className="lp-headline lp-headline-premium">
            A premium command center for
            <span className="lp-headline-gold"> property, leads, and team execution</span>
          </h1>

          <p className="lp-sub lp-sub-premium">
            From the first call to the final report, the portal keeps ownership, follow-up, sales,
            and communication connected inside one polished workspace built for letting teams.
          </p>

          <div className="lp-cta-row">
            <Link href="/login" className="btn btn-primary btn-lg">
              Login
            </Link>
            <a
              href="mailto:hello@morehomesgroup.com?subject=Request%20Portal%20Access"
              className="btn btn-secondary btn-lg"
            >
              Request Access
            </a>
          </div>

          <div className="lp-metric-row">
            {dashboardHighlights.map((item) => (
              <article key={item.label} className="lp-metric-card">
                <span className="lp-metric-label">{item.label}</span>
                <strong className="lp-metric-value">{item.value}</strong>
                <span className="lp-metric-meta">{item.meta}</span>
              </article>
            ))}
          </div>

          <div className="lp-pills lp-pills-premium">
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-gold" />
              Agent workspace
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-blue" />
              Admin command center
            </span>
            <span className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-green" />
              OTP protected access
            </span>
          </div>
        </div>

        <div className="lp-hero-dashboard">
          <div className="lp-dashboard-frame">
            <div className="lp-dashboard-topbar">
              <div className="lp-card-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="lp-dashboard-search">Search leads, properties, agents...</div>
              <div className="lp-dashboard-user">Live workspace</div>
            </div>

            <div className="lp-dashboard-grid">
              {dashboardHighlights.map((item) => (
                <article key={item.label} className="lp-dashboard-kpi-card">
                  <span className="lp-dashboard-kpi-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <span className="lp-dashboard-kpi-trend">{item.meta}</span>
                </article>
              ))}

              <div className="lp-dashboard-main-card">
                <div className="lp-dashboard-card-head">
                  <div>
                    <p className="lp-dashboard-card-kicker">Workflow intelligence</p>
                    <h3>From contact to conversion</h3>
                  </div>
                  <span>Live</span>
                </div>

                <div className="lp-dashboard-workflow">
                  {workflowSteps.map((step, index) => (
                    <div key={step.title} className="lp-dashboard-step">
                      <span className="lp-dashboard-step-index">0{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lp-dashboard-chart" aria-hidden="true">
                  <span className="lp-dashboard-chart-bar" style={{ height: "38%" }} />
                  <span className="lp-dashboard-chart-bar" style={{ height: "62%" }} />
                  <span className="lp-dashboard-chart-bar" style={{ height: "54%" }} />
                  <span className="lp-dashboard-chart-bar" style={{ height: "76%" }} />
                  <span className="lp-dashboard-chart-bar is-gold" style={{ height: "88%" }} />
                </div>
              </div>

              <div className="lp-dashboard-side-card">
                <div className="lp-dashboard-card-head">
                  <div>
                    <p className="lp-dashboard-card-kicker">Current status</p>
                    <h3>Ownership clarity</h3>
                  </div>
                  <span>Today</span>
                </div>

                <div className="lp-dashboard-insight-list">
                  <div className="lp-dashboard-insight">
                    <span className="lp-dashboard-insight-dot is-owned" />
                    Owned by you - continue to property creation
                  </div>
                  <div className="lp-dashboard-insight">
                    <span className="lp-dashboard-insight-dot is-warning" />
                    Owned by another - show conflict and handoff
                  </div>
                  <div className="lp-dashboard-insight">
                    <span className="lp-dashboard-insight-dot is-new" />
                    New lead - choose interested, follow-up, or not interested
                  </div>
                </div>

                <div className="lp-dashboard-feed">
                  <div className="lp-dashboard-feed-item">
                    <span className="lp-feed-time">2m</span>
                    <p>Call completed with a landlord in HA3</p>
                  </div>
                  <div className="lp-dashboard-feed-item">
                    <span className="lp-feed-time">12m</span>
                    <p>New property captured and tagged</p>
                  </div>
                  <div className="lp-dashboard-feed-item">
                    <span className="lp-feed-time">34m</span>
                    <p>Follow-up task created for a tenant lead</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-head">
          <p className="lp-features-kicker">Product features</p>
          <h2 className="lp-features-title">A premium operating system for day-to-day property work</h2>
        </div>

        <div className="lp-feature-grid lp-feature-grid-wide">
          {featureCards.map((feature) => (
            <article key={feature.title} className="lp-feature-card lp-feature-card-premium">
              <div className="lp-feature-icon lp-icon-gold">
                <span className="lp-feature-icon-core" />
              </div>
              <div className="lp-feature-body">
                <h3 className="lp-feature-title">{feature.title}</h3>
                <p className="lp-feature-desc">{feature.copy}</p>
                <div className="lp-feature-meta">{feature.stat}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-workflow-showcase">
        <div className="lp-section-head">
          <p className="lp-features-kicker">Workflow visualization</p>
          <h2 className="lp-features-title">Call to close, mapped as a guided operational journey</h2>
        </div>

        <div className="lp-workflow-strip">
          {workflowSteps.map((step, index) => (
            <article key={step.title} className="lp-workflow-node">
              <div className="lp-workflow-node-index">0{index + 1}</div>
              <h3 className="lp-workflow-node-title">{step.title}</h3>
              <p className="lp-workflow-node-copy">{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-trust-panel">
        <div className="lp-section-head">
          <p className="lp-features-kicker">Trust section</p>
          <h2 className="lp-features-title">Built for teams that need clarity, speed, and control</h2>
        </div>

        <div className="lp-trust-strip lp-trust-strip-premium">
          {trustItems.map((item) => (
            <div key={item} className="lp-trust-item">
              <span className="lp-trust-bullet" />
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}