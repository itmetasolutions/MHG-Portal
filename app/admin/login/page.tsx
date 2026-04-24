import Link from 'next/link';

type SearchParams = Record<string, string | string[] | undefined>;

function readValue(searchParams: SearchParams, key: string, fallback = '') {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

export default function AdminLoginPage({ searchParams }: { searchParams?: SearchParams }) {
  const initialEmail = readValue(searchParams ?? {}, 'initialEmail');
  const reason = readValue(searchParams ?? {}, 'reason', 'admin');

  return (
    <div className="auth-shell auth-shell--admin">
      <section className="auth-hero auth-hero--admin">
        <div className="auth-hero__copy">
          <p className="auth-hero__eyebrow">Admin portal</p>
          <h1 className="auth-hero__title">Secure access for the people who keep the platform moving.</h1>
          <p className="auth-hero__copy-text">
            Enter your admin email to continue to the shared secure sign-in. You will be routed back to the control tower once verified.
          </p>

          <div className="auth-hero__bullets">
            <div className="auth-hero__bullet">
              <strong>Approvals</strong>
              <span>Review and release pending requests fast.</span>
            </div>
            <div className="auth-hero__bullet">
              <strong>Audit</strong>
              <span>Track every intervention with a complete trail.</span>
            </div>
            <div className="auth-hero__bullet">
              <strong>Performance</strong>
              <span>Score agents and monitor revenue in real time.</span>
            </div>
          </div>
        </div>

        <div className="auth-hero__panel">
          <div className="auth-hero__panel-label">Premium control tower</div>
          <div className="auth-hero__panel-stat">
            <strong>99.98%</strong>
            <span>availability target</span>
          </div>
          <div className="auth-hero__panel-stat">
            <strong>4 min</strong>
            <span>approval response target</span>
          </div>
          <div className="auth-hero__panel-stat">
            <strong>24/7</strong>
            <span>operations monitoring</span>
          </div>
        </div>
      </section>

      <section className="auth-card auth-card--admin">
        <div className="auth-card__header">
          <p className="auth-card__eyebrow">Admin sign in</p>
          <h2 className="auth-card__title">Continue to the secure login flow</h2>
          <p className="auth-card__copy">We will pass you through to the shared authentication flow and preserve your admin session routing.</p>
        </div>

        <form className="auth-form" action="/login" method="get">
          <input type="hidden" name="reason" value={reason} />
          <label className="auth-field">
            <span className="auth-field__label">Admin email</span>
            <input
              type="email"
              name="initialEmail"
              defaultValue={initialEmail}
              placeholder="name@company.com"
              className="input auth-field__input"
              autoComplete="email"
              required
            />
          </label>

          <div className="auth-card__meta">
            <span className="badge badge--neutral">Dedicated admin access</span>
            <span className="badge badge--gold">Verified staff only</span>
          </div>

          <button type="submit" className="btn btn--primary auth-card__submit">
            Continue to secure sign-in
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Need the general portal instead?</span>
          <Link href="/login" className="auth-card__link">
            Use standard sign in
          </Link>
        </div>
      </section>
    </div>
  );
}