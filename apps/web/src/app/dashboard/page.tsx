'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardNav from '../../components/DashboardNav';
import TicketTable from '../../components/TicketTable';
import { BarCard, DonutCard, TrendCard, PhaseSlaCard, PriorityBarCard } from '../../components/Charts';
import { useAuthSession } from '../../hooks/useAuthSession';
import { fetchJson, type DashboardStats, type TicketListItem } from '../../lib/api';
import { getAccessToken } from '../../lib/authToken';

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconTicket = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
    <line x1="13" y1="5" x2="13" y2="19" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

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

    getAccessToken().then((token) => {
      if (!token) {
        router.replace('/');
        return;
      }
      return Promise.all([
        fetchJson<DashboardStats>('/stats', token),
        fetchJson<{ items: TicketListItem[] }>('/tickets/breaches?limit=50', token),
      ]);
    })
      .then((result) => {
        if (!result) return;
        const [statsData, breachData] = result;
        setStats(statsData);
        setBreaches(breachData.items);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router]);

  if (authLoading || (!session && loading)) {
    return <div className="dash-page"><DashboardNav /><div className="table-empty">Loading…</div></div>;
  }

  const alertTickets = breaches.slice(0, 5);

  return (
    <div className="dash-page">
      <DashboardNav />
      <main className="dash-main">
        <div className="dash-header">
          <div>
            <p className="eyebrow">Operations dashboard</p>
            <h1>SLA overview</h1>
            <p className="lead">Live ticket analytics synced from Jira via n8n every 10 minutes.</p>
          </div>
          <Link href="/dashboard/breaches" className="primary">
            View all breaches
          </Link>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        {loading && !stats ? (
          <div className="skeleton-grid">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card stat-breach">
              <div className="stat-top">
                <p className="stat-label">Active SLA breaches</p>
                <span className="stat-icon"><IconAlert /></span>
              </div>
              <p className="stat-value">{stats?.activeBreaches ?? '—'}</p>
              <p className="stat-hint">Tickets past their status SLA threshold</p>
            </div>
            <div className="stat-card stat-warn">
              <div className="stat-top">
                <p className="stat-label">Missing due dates</p>
                <span className="stat-icon"><IconCalendar /></span>
              </div>
              <p className="stat-value">{stats?.missingDueDates ?? '—'}</p>
              <p className="stat-hint">Require a due date set in Jira</p>
            </div>
            <div className="stat-card stat-ok">
              <div className="stat-top">
                <p className="stat-label">Total tickets tracked</p>
                <span className="stat-icon"><IconTicket /></span>
              </div>
              <p className="stat-value">{stats?.totalTickets ?? '—'}</p>
              <p className="stat-hint">Synced from Jira via n8n</p>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <p className="stat-label">Avg time in status</p>
                <span className="stat-icon"><IconClock /></span>
              </div>
              <p className="stat-value">{stats ? `${stats.avgStatusDuration}m` : '—'}</p>
              <p className="stat-hint">Across all open tickets</p>
            </div>
          </div>
        )}

        {alertTickets.length > 0 && (
          <section className="alert-panel">
            <div className="alert-panel-head">
              <div className="alert-panel-title">
                <span className="alert-panel-icon"><IconAlert /></span>
                <div>
                  <h2>SLA breach alerts</h2>
                  <p>{breaches.length} ticket{breaches.length === 1 ? '' : 's'} need immediate attention</p>
                </div>
              </div>
              <Link href="/dashboard/breaches" className="ghost">See all</Link>
            </div>
            <ul className="alert-list">
              {alertTickets.map((ticket) => {
                const missing = ticket.due_date_missing;
                return (
                  <li key={ticket.ticket_key} className="alert-item">
                    <span className={`alert-dot ${missing ? 'dot-warn' : 'dot-breach'}`} />
                    <div className="alert-item-main">
                      <Link href={`/dashboard/tickets/${ticket.ticket_key}`} className="alert-key">
                        {ticket.ticket_key}
                      </Link>
                      <span className="alert-summary">{ticket.summary || 'No summary'}</span>
                    </div>
                    <span className="alert-meta">{ticket.current_status || '—'}</span>
                    <span className="alert-meta">{ticket.status_team || '—'}</span>
                    <span className={`badge ${missing ? 'badge-warn' : 'badge-breach'}`}>
                      {missing
                        ? 'Missing due date'
                        : ticket.current_status_duration != null && ticket.current_status_sla_threshold != null
                          ? `${ticket.current_status_duration}m / ${ticket.current_status_sla_threshold}m`
                          : 'SLA breached'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {stats && (
          <section className="charts-grid">
            <BarCard title="Tickets by status" subtitle="Current workflow distribution" record={stats.byStatus} horizontal span />
            <DonutCard title="Breaches by team" subtitle="Where SLAs are slipping" record={stats.byTeam} />
            <PriorityBarCard title="Tickets by priority" subtitle="Sorted by severity" record={stats.byPriority} />
            <PhaseSlaCard
              title="SLA compliance by phase"
              subtitle="On track vs breached per lifecycle stage"
              phases={stats.slaByPhase}
            />
            <DonutCard title="Status category" subtitle="Main · Sub · Final" record={stats.byCategory} />
            <DonutCard title="Issue type" subtitle="Ticket composition" record={stats.byIssueType} />
            <TrendCard title="Tickets created over time" subtitle="Intake trend" data={stats.createdTrend} span />
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
