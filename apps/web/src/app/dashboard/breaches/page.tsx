'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '../../../components/DashboardNav';
import TicketTable from '../../../components/TicketTable';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { fetchJson, type TicketListItem } from '../../../lib/api';

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

    fetchJson<{ items: TicketListItem[] }>('/tickets/breaches?limit=200', session.access_token)
      .then((data) => setTickets(data.items))
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

        <div className="alert alert-breach">
          Tickets shown here require immediate attention — either the status SLA threshold was
          exceeded, or a due date is required but not set in Jira.
        </div>

        <TicketTable tickets={tickets} loading={loading} />
      </main>
    </div>
  );
}
