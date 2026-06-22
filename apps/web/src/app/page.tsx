import Image from 'next/image';
import AuthPanel from '../components/AuthPanel';

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
          <div className="landing-hero">
            <div className="landing-hero-text">
              <p className="landing-eyebrow">Internal Portal</p>
              <h1>Resolve issues faster with SLA-driven workflows</h1>
            </div>
            <div className="hero-video">
              <video autoPlay loop muted playsInline preload="auto" aria-hidden="true">
                <source src="/ac-logo-animation.webm" type="video/webm" />
              </video>
            </div>
          </div>
          <p className="landing-lead">
            Track, triage, and resolve support tickets with built-in SLA monitoring and real-time
            alerts.
          </p>
        </section>

        <section className="landing-auth">
          <AuthPanel />
        </section>
      </main>
    </div>
  );
}
