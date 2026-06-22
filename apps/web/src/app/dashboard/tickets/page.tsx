'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardNav from '../../../components/DashboardNav';
import TicketTable from '../../../components/TicketTable';
import { useAuthSession } from '../../../hooks/useAuthSession';
import { fetchJson, type TicketListItem, type TicketListResponse } from '../../../lib/api';
import { getAccessToken } from '../../../lib/authToken';

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))).sort();

function exportCsv(items: TicketListItem[]) {
  const headers = [
    'Key', 'Summary', 'Status', 'Team', 'Category', 'Priority', 'Issue Type', 'Assignee',
    'Reporter', 'Project', 'Duration (min)', 'Threshold (min)', 'SLA Breached', 'Due Date',
    'Due Date Missing', 'Created', 'Updated', 'Jira URL',
  ];
  const escape = (val: unknown) => {
    const s = val == null ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map((t) =>
    [
      t.ticket_key, t.summary, t.current_status, t.status_team, t.status_category, t.priority,
      t.issue_type, t.assignee, t.reporter, t.project, t.current_status_duration,
      t.current_status_sla_threshold, t.current_status_sla === 'YES' ? 'YES' : 'NO', t.due_date,
      t.due_date_missing ? 'YES' : 'NO', t.created, t.updated, t.jira_ticket_url,
    ]
      .map(escape)
      .join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function TicketsContent() {
  const { session, loading: authLoading } = useAuthSession();
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState<TicketListItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [slaFilter, setSlaFilter] = useState(params.get('sla') || '');
  const [status, setStatus] = useState('');
  const [team, setTeam] = useState('');
  const [priority, setPriority] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [dueDateFilter, setDueDateFilter] = useState('');

  const normalizeDueDate = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'missing' || trimmed.toLowerCase() === 'no due date') {
      return null;
    }
    return trimmed.slice(0, 10);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/');
      return;
    }

    getAccessToken()
      .then((token) => {
        if (!token) {
          router.replace('/');
          return;
        }
        return fetchJson<TicketListResponse>('/tickets?limit=200', token);
      })
      .then((res) => {
        if (res) setItems(res.items);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router]);

  const facets = useMemo(
    () => ({
      statuses: uniqueSorted(items.map((t) => t.current_status)),
      teams: uniqueSorted(items.map((t) => t.status_team)),
      priorities: uniqueSorted(items.map((t) => t.priority)),
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((t) => {
      if (slaFilter === 'breached' && t.current_status_sla !== 'YES') return false;
      if (slaFilter === 'ontrack' && (t.current_status_sla === 'YES' || t.due_date_missing)) return false;
      if (status && t.current_status !== status) return false;
      if (team && t.status_team !== team) return false;
      if (priority && t.priority !== priority) return false;
      if (missingOnly && !t.due_date_missing) return false;
      if (dueDateFilter && normalizeDueDate(t.due_date) !== dueDateFilter) return false;
      if (q) {
        const hay = `${t.ticket_key} ${t.summary ?? ''} ${t.assignee ?? ''} ${t.reporter ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, slaFilter, status, team, priority, missingOnly, dueDateFilter]);

  return (
    <main className="dash-main">
      <div className="dash-header">
        <div>
          <p className="eyebrow">Ticket board</p>
          <h1>All tickets</h1>
          <p className="lead">{loading ? 'Loading…' : `${items.length} tickets tracked`}</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="search"
          placeholder="Search key, summary, assignee, reporter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)}>
          <option value="">All SLAs</option>
          <option value="breached">Breached only</option>
          <option value="ontrack">On track only</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {facets.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">All teams</option>
          {facets.teams.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {facets.priorities.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="filter-date-wrap">
          <input
            type="date"
            className="filter-date"
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            aria-label="Filter by due date"
            title="Filter by due date"
          />
          {dueDateFilter ? (
            <button
              type="button"
              className="filter-date-clear"
              onClick={() => setDueDateFilter('')}
              aria-label="Clear due date filter"
              title="Clear date"
            >
              ×
            </button>
          ) : null}
        </div>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
          />
          Missing due date
        </label>
        <span className="filter-spacer" />
        <span className="filter-count">
          {filtered.length} of {items.length}
        </span>
        <button
          type="button"
          className="btn-export"
          onClick={() => exportCsv(filtered)}
          disabled={!filtered.length}
        >
          Export CSV
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      <TicketTable tickets={filtered} loading={loading} />
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
