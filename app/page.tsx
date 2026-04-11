/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";

const homeImage = (path: string) => encodeURI(`/assets/images/Home/${path}`);

const landingHeroImages = {
  primary: {
    src: homeImage("Why MHG/A dependable partner for tenants, landlords, and investors.webp"),
    alt: "More Homes Group team supporting tenants, landlords, and investors",
  },
  secondary: [
    {
      label: "Mission",
      src: homeImage("About/A customer-first property company built to grow the right way Mission.webp"),
      alt: "More Homes Group mission and customer-first property support",
    },
    {
      label: "Vision",
      src: homeImage("About/A customer-first property company built to grow the right way Vision.webp"),
      alt: "More Homes Group vision for property growth and service",
    },
  ],
};

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

export default async function HomePage() {
  const session = await getAuthSession();
  if (session) {
    redirect(session.role === UserRole.ADMIN ? "/admin" : "/dashboard");
  }

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
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
          </div>

          <div className="landing-hero-visuals">
            <div className="landing-hero-visual-glow" aria-hidden="true" />
            <div className="landing-hero-visual-grid-accent" aria-hidden="true" />

            <figure className="landing-hero-primary-card">
              <img
                src={landingHeroImages.primary.src}
                alt={landingHeroImages.primary.alt}
                className="landing-hero-primary-image"
              />
              <figcaption className="landing-hero-primary-caption">
                Trusted support across lettings, management, and agency growth.
              </figcaption>
            </figure>

            <div className="landing-hero-secondary-stack">
              {landingHeroImages.secondary.map((image, index) => (
                <figure
                  key={image.label}
                  className={`landing-hero-secondary-card ${
                    index === 0
                      ? "landing-hero-secondary-card-top"
                      : "landing-hero-secondary-card-bottom"
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="landing-hero-secondary-image"
                  />
                  <figcaption className="landing-hero-secondary-label">
                    {image.label}
                  </figcaption>
                </figure>
              ))}

              <aside className="landing-hero-insight-card">
                <p className="landing-hero-insight-kicker">Customer-led delivery</p>
                <p className="landing-hero-insight-title">
                  Mission-led service with structure for every role.
                </p>
                <p className="landing-hero-insight-copy">
                  From secure sign-in to daily coordination, the platform helps
                  teams move faster without losing visibility.
                </p>
              </aside>
            </div>

            <div className="landing-hero-floating-chip">
              <span className="landing-hero-floating-label">Agency workflow</span>
              <strong className="landing-hero-floating-value">
                Secure, role-ready, and built to scale
              </strong>
            </div>
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
