import Image from 'next/image';
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
          <span className="landing-logo-pill">
            <Image
              src="/assetcues-logo.png"
              alt="AssetCues"
              width={146}
              height={36}
              priority
            />
          </span>
          <span className="landing-brand-tag">Support Console</span>
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

          <div className="hero-video">
            <video autoPlay loop muted playsInline preload="auto" aria-hidden="true">
              <source src="/ac-logo-animation.webm" type="video/webm" />
            </video>
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
