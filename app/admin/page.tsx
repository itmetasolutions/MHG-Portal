import Link from 'next/link';

type SearchParams = Record<string, string | string[] | undefined>;

type Metric = {
  label: string;
  value: string;
  delta: string;
  detail: string;
};

type Leader = {
  name: string;
  team: string;
  score: number;
  closes: string;
  approvals: string;
};

type QueueItem = {
  title: string;
  owner: string;
  age: string;
  priority: 'High' | 'Medium' | 'Low';
  route: string;
};

const periods = ['7d', '30d', '90d', '12m'] as const;

const leaders: Leader[] = [
  { name: 'Amina Khan', team: 'Sales North', score: 96, closes: '34 closes', approvals: '2 pending' },
  { name: 'Marcus Reed', team: 'Lettings West', score: 93, closes: '29 closes', approvals: '1 pending' },
  { name: 'Sophia Patel', team: 'Accounts', score: 91, closes: '18 saves', approvals: '0 pending' },
  { name: 'Daniel Okoro', team: 'Support', score: 89, closes: '26 interventions', approvals: '3 pending' },
];

const queue: QueueItem[] = [
  { title: 'Commission uplift request', owner: 'Amina Khan', age: '12 min', priority: 'High', route: '/admin/commission' },
  { title: 'Property onboarding approval', owner: 'Marcus Reed', age: '24 min', priority: 'High', route: '/admin/approvals' },
  { title: 'Profile policy exception', owner: 'Sophia Patel', age: '41 min', priority: 'Medium', route: '/admin/audit' },
  { title: 'Potential landlord verification', owner: 'Daniel Okoro', age: '58 min', priority: 'Low', route: '/admin/potential-landlords' },
];

const auditItems = [
  { label: 'Policy change', value: '22', detail: 'Today' },
  { label: 'Manual overrides', value: '14', detail: 'Last 7 days' },
  { label: 'Escalations resolved', value: '91%', detail: 'SLA' },
];

function readValue(searchParams: SearchParams, key: string, fallback: string) {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

function clampPeriod(value: string) {
  return periods.includes(value as (typeof periods)[number]) ? value : '30d';
}

function sectionTitle(value: string) {
  return value === '7d'
    ? 'This week'
    : value === '90d'
      ? 'Quarter to date'
      : value === '12m'
        ? 'Trailing year'
        : 'Last 30 days';
}

function metricAdjust(period: string) {
  switch (period) {
    case '7d':
      return 0.42;
    case '90d':
      return 1.34;
    case '12m':
      return 4.8;
    default:
      return 1;
  }
}

export default function AdminDashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const period = clampPeriod(readValue(searchParams ?? {}, 'period', '30d'));
  const postcode = readValue(searchParams ?? {}, 'postcode', '');
  const scale = metricAdjust(period);

  const metrics: Metric[] = [
    {
      label: 'Open opportunities',
      value: Math.round(146 * scale).toString(),
      delta: '+12.4%',
      detail: `${sectionTitle(period)} across the platform`,
    },
    {
      label: 'Approvals pending',
      value: Math.max(4, Math.round(18 * scale)).toString(),
      delta: '-8.2%',
      detail: 'Queue health improving',
    },
    {
      label: 'Revenue tracked',
      value: `£${(432000 * scale).toLocaleString('en-GB')}`,
      delta: '+19.7%',
      detail: 'Commission and rent roll',
    },
    {
      label: 'Active agents',
      value: Math.round(38 * scale).toString(),
      delta: '+4.1%',
      detail: 'Live this period',
    },
  ];

  const searchLabel = postcode ? `Filtered to postcode ${postcode}` : 'All postcodes';

  return (
    <div className="dashboard dashboard--admin">
      <section className="dashboard-hero admin-dashboard__hero">
        <div className="dashboard-hero__content">
          <p className="dashboard-hero__eyebrow">Platform intelligence</p>
          <h2 className="dashboard-hero__title">A premium control tower for every decision, exception, and intervention.</h2>
          <p className="dashboard-hero__copy">
            Monitor agent scores, revenue velocity, approvals, audit trails, and live operations from one clean command surface.
          </p>

          <div className="dashboard-hero__actions">
            <Link href="/admin/approvals" className="btn btn--primary">
              Review approvals
            </Link>
            <Link href="/admin/agents" className="btn btn--ghost">
              View agent rankings
            </Link>
          </div>

          <div className="dashboard-hero__meta">
            <span className="badge badge--success">{sectionTitle(period)}</span>
            <span className="badge badge--neutral">{searchLabel}</span>
            <span className="badge badge--warning">Admin visibility only</span>
          </div>
        </div>

        <form className="dashboard-filters admin-dashboard__filters" method="get">
          <div className="dashboard-filters__row">
            <label className="input-group">
              <span className="input-group__label">Period</span>
              <select name="period" defaultValue={period} className="input">
                {periods.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-group">
              <span className="input-group__label">Postcode</span>
              <input name="postcode" defaultValue={postcode} placeholder="Search postcode" className="input" />
            </label>

            <button type="submit" className="btn btn--primary">
              Refresh view
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-kpis admin-dashboard__kpis">
        {metrics.map((metric) => (
          <article key={metric.label} className="card dashboard-kpis__card">
            <p className="dashboard-kpis__label">{metric.label}</p>
            <div className="dashboard-kpis__value-row">
              <strong className="dashboard-kpis__value">{metric.value}</strong>
              <span className="dashboard-kpis__delta">{metric.delta}</span>
            </div>
            <p className="dashboard-kpis__detail">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard__grid">
        <article className="card smart-panel smart-panel--leaderboard leaderboard-panel">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Agent leaderboard</p>
              <h3 className="section-heading__title">Performance scorecard</h3>
            </div>
            <Link href="/admin/agents" className="section-heading__action">
              See all agents
            </Link>
          </div>

          <div className="leaderboard-panel__list">
            {leaders.map((leader, index) => (
              <div key={leader.name} className="leaderboard-row">
                <div className="leaderboard-row__rank">{index + 1}</div>
                <div className="leaderboard-row__copy">
                  <strong>{leader.name}</strong>
                  <span>{leader.team}</span>
                </div>
                <div className="leaderboard-row__stats">
                  <span className="leaderboard-row__score">{leader.score}</span>
                  <span>{leader.closes}</span>
                  <span>{leader.approvals}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card insight-panel revenue-panel">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Revenue tracking</p>
              <h3 className="section-heading__title">Portfolio monetisation</h3>
            </div>
            <span className="badge badge--success">+19.7%</span>
          </div>

          <div className="chart chart--bars revenue-panel__chart" aria-label="Revenue chart">
            {[72, 58, 81, 64, 93, 77, 88].map((value, index) => (
              <div key={index} className="chart__bar-row">
                <span className="chart__bar-label">W{index + 1}</span>
                <div className="chart__bar-track">
                  <span className="chart__bar-fill" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="revenue-panel__summary">
            <div>
              <span className="revenue-panel__summary-label">Commission forecast</span>
              <strong>£128,400</strong>
            </div>
            <div>
              <span className="revenue-panel__summary-label">Conversion rate</span>
              <strong>28.6%</strong>
            </div>
            <div>
              <span className="revenue-panel__summary-label">Avg. deal cycle</span>
              <strong>11.2 days</strong>
            </div>
          </div>
        </article>

        <article className="card approval-panel">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Approval queue</p>
              <h3 className="section-heading__title">Fast interventions</h3>
            </div>
            <Link href="/admin/approvals" className="section-heading__action">
              Open queue
            </Link>
          </div>

          <div className="approval-panel__list">
            {queue.map((item) => (
              <div key={item.title} className="approval-card">
                <div className="approval-card__copy">
                  <strong>{item.title}</strong>
                  <span>
                    {item.owner} · {item.age}
                  </span>
                </div>
                <div className={`badge badge--${item.priority.toLowerCase()}`}>{item.priority}</div>
                <Link href={item.route} className="approval-card__action">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="card audit-panel">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Audit pulse</p>
              <h3 className="section-heading__title">Governance health</h3>
            </div>
            <Link href="/admin/audit" className="section-heading__action">
              View audit trail
            </Link>
          </div>

          <div className="audit-panel__metrics">
            {auditItems.map((item) => (
              <div key={item.label} className="audit-metric">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>

          <div className="timeline admin-dashboard__timeline">
            <div className="timeline__item">
              <span className="timeline__dot timeline__dot--success" />
              <div>
                <strong>Property ownership reassigned</strong>
                <p>A manual exception was resolved and logged.</p>
              </div>
            </div>
            <div className="timeline__item">
              <span className="timeline__dot timeline__dot--warning" />
              <div>
                <strong>Commission review escalated</strong>
                <p>A high-value payout is awaiting final approval.</p>
              </div>
            </div>
            <div className="timeline__item">
              <span className="timeline__dot timeline__dot--neutral" />
              <div>
                <strong>Agent score updated</strong>
                <p>Leaderboard rankings refreshed for the current period.</p>
              </div>
            </div>
          </div>
        </article>

        <article className="card smart-panel smart-panel--summary">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Platform summary</p>
              <h3 className="section-heading__title">Operational snapshots</h3>
            </div>
          </div>

          <div className="dashboard-summary-grid">
            <div className="dashboard-summary-card">
              <span>Lead ownership</span>
              <strong>82% assigned within 1 hour</strong>
            </div>
            <div className="dashboard-summary-card">
              <span>Calls completed</span>
              <strong>1,284 this period</strong>
            </div>
            <div className="dashboard-summary-card">
              <span>Tenant queries</span>
              <strong>94% resolved same day</strong>
            </div>
            <div className="dashboard-summary-card">
              <span>Map coverage</span>
              <strong>58 active postcodes</strong>
            </div>
          </div>
        </article>

        <article className="card table-panel admin-dashboard__table">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Performance table</p>
              <h3 className="section-heading__title">Agents at a glance</h3>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Team</th>
                  <th>Score</th>
                  <th>Closes</th>
                  <th>Approvals</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((leader) => (
                  <tr key={leader.name}>
                    <td>{leader.name}</td>
                    <td>{leader.team}</td>
                    <td>{leader.score}</td>
                    <td>{leader.closes}</td>
                    <td>{leader.approvals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}