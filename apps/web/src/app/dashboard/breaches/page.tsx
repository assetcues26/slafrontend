'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '../../../components/DashboardNav';
import TicketTable from '../../../components/TicketTable';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { fetchJson, type TicketListItem } from '../../../lib/api';
import { getAccessToken } from '../../../lib/authToken';

export default function BreachesPage() {
  const { session, loading: authLoading } = useAuthSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
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
      return fetchJson<{ items: TicketListItem[] }>('/tickets/breaches?limit=200', token);
    })
      .then((data) => {
        if (data) setTickets(data.items);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router]);

  const missingCount = tickets.filter((t) => t.due_date_missing).length;
  const breachCount = tickets.filter((t) => t.current_status_sla === 'YES' && !t.due_date_missing).length;

  return (
    <div className="dash-page">
      <DashboardNav />
      <main className="dash-main">
        <div className="dash-header">
          <div>
            <p className="eyebrow">Alerts</p>
            <h1>SLA breaches &amp; missing due dates</h1>
            <p className="lead">
              {breachCount} status SLA breaches · {missingCount} missing due dates
            </p>
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="stats-grid">
          <div className="stat-card stat-breach">
            <div className="stat-top">
              <p className="stat-label">Status SLA breaches</p>
            </div>
            <p className="stat-value">{loading ? '—' : breachCount}</p>
            <p className="stat-hint">Exceeded the configured status threshold</p>
          </div>
          <div className="stat-card stat-warn">
            <div className="stat-top">
              <p className="stat-label">Missing due dates</p>
            </div>
            <p className="stat-value">{loading ? '—' : missingCount}</p>
            <p className="stat-hint">Required but not set in Jira</p>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <p className="stat-label">Total flagged</p>
            </div>
            <p className="stat-value">{loading ? '—' : tickets.length}</p>
            <p className="stat-hint">Tickets needing attention</p>
          </div>
        </div>

        <div className="alert alert-breach">
          Tickets shown here require immediate attention — either the status SLA threshold was
          exceeded, or a due date is required but not set in Jira.
        </div>

        <TicketTable tickets={tickets} loading={loading} />
      </main>
    </div>
  );
}
