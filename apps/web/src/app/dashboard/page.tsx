'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardNav from '../../components/DashboardNav';
import TicketTable from '../../components/TicketTable';
import { useAuthSession } from '../../hooks/useAuthSession';
import { fetchJson, type DashboardStats, type TicketListItem } from '../../lib/api';

export default function DashboardPage() {
  const { session, loading: authLoading } = useAuthSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [breaches, setBreaches] = useState<TicketListItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/');
      return;
    }

    const token = session.access_token;
    Promise.all([
      fetchJson<DashboardStats>('/stats', token),
      fetchJson<{ items: TicketListItem[] }>('/tickets/breaches?limit=10', token),
    ])
      .then(([statsData, breachData]) => {
        setStats(statsData);
        setBreaches(breachData.items);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router]);

  if (authLoading || (!session && loading)) {
    return <div className="dash-page"><DashboardNav /><div className="table-empty">Loading…</div></div>;
  }

  return (
    <div className="dash-page">
      <DashboardNav />
      <main className="dash-main">
        <div className="dash-header">
          <div>
            <p className="eyebrow">Operations dashboard</p>
            <h1>SLA overview</h1>
            <p className="lead">Live ticket data synced from Jira via n8n every 10 minutes.</p>
          </div>
          <Link href="/dashboard/breaches" className="primary">
            View all breaches
          </Link>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="stats-grid">
          <div className="stat-card stat-breach">
            <p className="stat-label">Active SLA breaches</p>
            <p className="stat-value">{stats?.activeBreaches ?? '—'}</p>
          </div>
          <div className="stat-card stat-warn">
            <p className="stat-label">Missing due dates</p>
            <p className="stat-value">{stats?.missingDueDates ?? '—'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total tickets tracked</p>
            <p className="stat-value">{stats?.totalTickets ?? '—'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Avg time in status</p>
            <p className="stat-value">{stats ? `${stats.avgStatusDuration}m` : '—'}</p>
          </div>
        </div>

        {stats && Object.keys(stats.byTeam).length > 0 && (
          <section className="dash-section">
            <h2>Breaches by team</h2>
            <div className="chip-row">
              {Object.entries(stats.byTeam).map(([team, count]) => (
                <span key={team} className="chip chip-breach">
                  {team}: {count}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="dash-section">
          <div className="section-head">
            <h2>Recent SLA breaches &amp; alerts</h2>
            <Link href="/dashboard/tickets?sla=breached">See all</Link>
          </div>
          <TicketTable tickets={breaches} loading={loading} />
        </section>
      </main>
    </div>
  );
}
