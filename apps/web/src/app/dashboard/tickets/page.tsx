'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardNav from '../../../components/DashboardNav';
import TicketTable from '../../../components/TicketTable';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { fetchJson, type TicketListItem, type TicketListResponse } from '../../../lib/api';

function TicketsContent() {
  const { session, loading: authLoading } = useAuthSession();
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [slaFilter, setSlaFilter] = useState(params.get('sla') || '');

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/');
      return;
    }

    const query = new URLSearchParams({ limit: '100' });
    if (slaFilter) query.set('sla', slaFilter);
    if (search.trim()) query.set('search', search.trim());

    setLoading(true);
    fetchJson<TicketListResponse>(`/tickets?${query}`, session.access_token)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router, slaFilter, search]);

  return (
    <main className="dash-main">
      <div className="dash-header">
        <div>
          <p className="eyebrow">Ticket board</p>
          <h1>All tickets</h1>
          <p className="lead">{data ? `${data.total} tickets tracked` : 'Loading…'}</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="search"
          placeholder="Search key, summary, assignee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)}>
          <option value="">All SLAs</option>
          <option value="breached">Breached only</option>
        </select>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <TicketTable tickets={data?.items ?? []} loading={loading} />
    </main>
  );
}

export default function TicketsPage() {
  return (
    <div className="dash-page">
      <DashboardNav />
      <Suspense fallback={<div className="table-empty">Loading…</div>}>
        <TicketsContent />
      </Suspense>
    </div>
  );
}
