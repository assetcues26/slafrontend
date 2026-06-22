import Link from 'next/link';
import { slaConfig } from '@jira-sla/shared';
import AuthPanel from '../components/AuthPanel';

const mainStatuses = slaConfig.filter((row) => row.main_status).slice(0, 6);

const formatTiming = (value?: number | string) => {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  return `${value}m`;
};

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Support Operations</p>
          <h1>Live SLA clarity for every status transition.</h1>
          <p className="lead">
            Track main, sub, and final statuses with priority-aware SLAs. Sign in to view the
            live dashboard with breaches, missing due dates, and full ticket history.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="primary">
              Open Dashboard
            </Link>
            <Link href="/dashboard/breaches" className="ghost">
              SLA Breaches
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <AuthPanel />
          <p className="panel-hint">
            Use Google or email magic link. Data syncs from Jira every 10 minutes via n8n.
          </p>
        </div>
      </section>

      <section className="status-grid">
        <div className="section-title">
          <h2>Status timing map</h2>
          <p>Priority-aware SLAs normalized to minutes, ready for escalation.</p>
        </div>
        <div className="cards">
          {mainStatuses.map((row) => (
            <div key={row.main_status as string} className="status-card">
              <div>
                <p className="status-title">{row.main_status}</p>
                <p className="status-sub">Main workflow</p>
              </div>
              <div className="status-metrics">
                <span>Highest: {formatTiming(row.timings.Highest)}</span>
                <span>High: {formatTiming(row.timings.High)}</span>
                <span>Medium: {formatTiming(row.timings.Medium)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
