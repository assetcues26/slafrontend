'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardNav from '../../../../components/DashboardNav';
import { useAuthSession } from '../../../../hooks/useAuthSession';
import { fetchJson, type TicketDetail, type StatusHistoryItem } from '../../../../lib/api';
import { getAccessToken } from '../../../../lib/authToken';

const fmtDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtDuration = (mins?: number | null) => {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs ? `${days}d ${remHrs}h` : `${days}d`;
};

const slaPill = (value?: string | null) => {
  if (!value) return <span className="prio">—</span>;
  const breached = value.toUpperCase() === 'YES';
  return <span className={`badge ${breached ? 'badge-breach' : 'badge-ok'}`}>{breached ? 'Breached' : 'On track'}</span>;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-field">
      <span className="detail-field-label">{label}</span>
      <span className="detail-field-value">{value ?? '—'}</span>
    </div>
  );
}

function PhaseRow({
  name,
  start,
  end,
  duration,
  sla,
  commented,
  emailed,
}: {
  name: string;
  start?: string | null;
  end?: string | null;
  duration?: number | null;
  sla?: string | null;
  commented?: string | null;
  emailed?: string | null;
}) {
  const reached = Boolean(start);
  return (
    <div className={`phase-row ${reached ? '' : 'phase-row-pending'}`}>
      <div className="phase-marker">
        <span className="phase-dot" />
      </div>
      <div className="phase-content">
        <div className="phase-head">
          <h4>{name}</h4>
          {sla ? slaPill(sla) : null}
        </div>
        <div className="phase-meta">
          <span><strong>Start:</strong> {fmtDate(start)}</span>
          {end !== undefined ? <span><strong>End:</strong> {fmtDate(end)}</span> : null}
          <span><strong>Duration:</strong> {fmtDuration(duration)}</span>
          {commented ? <span><strong>Commented:</strong> {commented}</span> : null}
          {emailed ? <span><strong>Emailed:</strong> {emailed}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { session, loading: authLoading } = useAuthSession();
  const ticketKey = decodeURIComponent(String(params.ticketKey ?? ''));
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
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
        fetchJson<TicketDetail>(`/tickets/${encodeURIComponent(ticketKey)}`, token),
        fetchJson<{ items: StatusHistoryItem[] }>(`/status-history/${encodeURIComponent(ticketKey)}`, token).catch(
          () => ({ items: [] }),
        ),
      ]);
    })
      .then((result) => {
        if (!result) return;
        const [detail, hist] = result;
        setTicket(detail);
        setHistory(hist.items);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router, ticketKey]);

  return (
    <div className="dash-page">
      <DashboardNav />
      <main className="dash-main">
        <div className="detail-breadcrumb">
          <Link href="/dashboard/tickets">← All tickets</Link>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {loading ? (
          <div className="table-empty">Loading ticket…</div>
        ) : ticket ? (
          <>
            <div className="detail-header">
              <div>
                <p className="eyebrow">{ticket.project || 'Ticket'} · {ticket.issue_type || 'Issue'}</p>
                <h1>{ticket.ticket_key}</h1>
                <p className="lead">{ticket.summary || 'No summary'}</p>
                <div className="detail-badges">
                  <span className="prio">{ticket.current_status || 'Unknown status'}</span>
                  {ticket.priority ? <span className="prio">{ticket.priority}</span> : null}
                  {ticket.due_date_missing ? (
                    <span className="badge badge-warn">Missing due date</span>
                  ) : null}
                  {ticket.current_status_sla?.toUpperCase() === 'YES' ? (
                    <span className="badge badge-breach">SLA breached</span>
                  ) : (
                    <span className="badge badge-ok">On track</span>
                  )}
                </div>
              </div>
              {ticket.jira_ticket_url ? (
                <a href={ticket.jira_ticket_url} target="_blank" rel="noreferrer" className="primary">
                  Open in Jira
                </a>
              ) : null}
            </div>

            <div className="detail-grid">
              <div className="dash-section">
                <h2>People</h2>
                <div className="detail-fields">
                  <Field label="Assignee" value={ticket.assignee || 'Unassigned'} />
                  <Field label="Reporter" value={ticket.reporter || '—'} />
                </div>
              </div>

              <div className="dash-section">
                <h2>Classification</h2>
                <div className="detail-fields">
                  <Field label="Project" value={ticket.project} />
                  <Field label="Issue type" value={ticket.issue_type} />
                  <Field label="Status category" value={ticket.status_category} />
                  <Field label="Team" value={ticket.status_team} />
                </div>
              </div>

              <div className="dash-section">
                <h2>Dates</h2>
                <div className="detail-fields">
                  <Field label="Created" value={fmtDate(ticket.created)} />
                  <Field label="Updated" value={fmtDate(ticket.updated)} />
                  <Field label="Due date" value={ticket.due_date || (ticket.due_date_missing ? 'Missing' : '—')} />
                  <Field label="Current status since" value={fmtDate(ticket.current_status_start)} />
                </div>
              </div>

              <div className="dash-section">
                <h2>Current SLA</h2>
                <div className="detail-fields">
                  <Field label="Status" value={ticket.current_status} />
                  <Field label="Time in status" value={fmtDuration(ticket.current_status_duration)} />
                  <Field label="Threshold" value={fmtDuration(ticket.current_status_sla_threshold)} />
                  <Field label="SLA state" value={slaPill(ticket.current_status_sla)} />
                </div>
              </div>
            </div>

            <section className="dash-section">
              <h2>Lifecycle timeline</h2>
              <div className="phase-timeline">
                <PhaseRow
                  name="To Do"
                  start={ticket.todo_start}
                  end={ticket.todo_end}
                  duration={ticket['todo_duration (min)']}
                  sla={ticket.todo_sla}
                  commented={ticket.todo_sla_commented}
                  emailed={ticket.todo_sla_emailed}
                />
                <PhaseRow
                  name="In Progress"
                  start={ticket.inprogress_start}
                  end={ticket.inprogress_end}
                  duration={ticket['inprogress_duration (min)']}
                  sla={ticket.inprogress_sla}
                  commented={ticket.inprogress_sla_commented}
                  emailed={ticket.inprogress_sla_emailed}
                />
                <PhaseRow
                  name="Done"
                  start={ticket.done_start}
                  end={undefined}
                  duration={ticket['done_duration (min)']}
                />
              </div>
            </section>

            {ticket.description ? (
              <section className="dash-section">
                <h2>Description</h2>
                <p className="detail-description">{ticket.description}</p>
              </section>
            ) : null}

            <section className="dash-section">
              <div className="section-head">
                <h2>Status history</h2>
                <span className="muted">{history.length} change{history.length === 1 ? '' : 's'}</span>
              </div>
              {history.length === 0 ? (
                <div className="table-empty">No status changes recorded.</div>
              ) : (
                <div className="table-wrap">
                  <table className="ticket-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Assignee</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row) => (
                        <tr key={row.history_id}>
                          <td>{fmtDate(row.updated_time || row.timestamp)}</td>
                          <td>{row.old_status || '—'}</td>
                          <td>{row.new_status || '—'}</td>
                          <td>{row.assignee || '—'}</td>
                          <td>{fmtDuration(row.duration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="table-empty">Ticket not found.</div>
        )}
      </main>
    </div>
  );
}
