import AuthPanel from '../components/AuthPanel';

const features = [
  {
    title: 'SLA Tracking',
    description: 'Automatic deadline enforcement with business-hour calculations.',
  },
  {
    title: 'Real-time Alerts',
    description: 'Instant breach notifications and missing due-date detection.',
  },
  {
    title: 'Analytics',
    description: 'SLA compliance dashboards and breach monitoring.',
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-logo">AC</span>
          <div>
            <strong>Assetcues Support</strong>
            <span>Customer Ticket Management</span>
          </div>
        </div>
        <span className="landing-badge">Enterprise-grade support management</span>
      </header>

      <main className="landing-main">
        <section className="landing-copy">
          <p className="landing-eyebrow">Internal Portal</p>
          <h1>Resolve issues faster with SLA-driven workflows</h1>
          <p className="landing-lead">
            Track, triage, and resolve support tickets with built-in SLA monitoring, real-time
            alerts, and team collaboration.
          </p>

          <div className="portal-cards">
            <div className="portal-card portal-card-muted">
              <p className="portal-label">Customer Portal</p>
              <h3>Submit &amp; track support tickets</h3>
              <span className="portal-note">Coming soon</span>
            </div>
            <div className="portal-card portal-card-active">
              <p className="portal-label">Internal Portal</p>
              <h3>Team management console</h3>
              <span className="portal-note">Sign in to access dashboard</span>
            </div>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article key={feature.title} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-auth">
          <AuthPanel />
        </section>
      </main>

      <footer className="landing-footer">
        © 2026 Assetcues Solution Pvt. Ltd. · Customer Support Ticket Management
      </footer>
    </div>
  );
}
