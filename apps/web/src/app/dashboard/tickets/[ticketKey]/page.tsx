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

const isYes = (value?: string | null) => (value || '').toUpperCase() === 'YES';

function SlaPhase({
  name,
  sla,
  commented,
  emailed,
}: {
  name: string;
  sla?: string | null;
  commented?: string | null;
  emailed?: string | null;
}) {
  const hasData = sla != null && sla !== '';
  const breached = isYes(sla);
  const dotClass = hasData ? (breached ? 'dot-red' : 'dot-green') : '';
  return (
    <div className={`phase-row ${hasData ? '' : 'phase-row-pending'}`}>
      <div className="phase-marker">
        <span className={`phase-dot ${dotClass}`} />
      </div>
      <div className="phase-content">
        <div className="phase-head">
          <h4>{name}</h4>
          {hasData ? (
            <span className={`badge ${breached ? 'badge-breach' : 'badge-ok'}`}>
              {breached ? 'SLA breached' : 'On track'}
            </span>
          ) : (
            <span className="muted">No SLA data</span>
          )}
        </div>
        {hasData ? (
          <div className="sla-flags">
            <span className={`flag ${isYes(commented) ? 'flag-on' : ''}`}>
              {isYes(commented) ? '✓ Breach comment posted' : 'No breach comment'}
            </span>
            <span className={`flag ${isYes(emailed) ? 'flag-on' : ''}`}>
              {isYes(emailed) ? '✓ Breach email sent' : 'No breach email'}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProgressBar({
  duration,
  threshold,
  breached,
}: {
  duration?: number | null;
  threshold?: number | null;
  breached: boolean;
}) {
  const hasThreshold = threshold != null && threshold > 0;
  const pct = hasThreshold
    ? Math.min(Math.round(((duration ?? 0) / threshold) * 100), 100)
    : breached
      ? 100
      : 10;
  return (
    <div className="sla-progress">
      <div className="sla-progress-track">
        <div
          className={`sla-progress-fill ${breached ? 'is-breached' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="sla-progress-meta">
        <span>
          <strong>{fmtDuration(duration)}</strong> in status
        </span>
        <span>{hasThreshold ? `Threshold ${fmtDuration(threshold)}` : 'No threshold set'}</span>
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
                  <Field
                    label="Due date"
                    value={
                      ticket.due_date && ticket.due_date !== 'No Due Date'
                        ? ticket.due_date
                        : ticket.due_date_missing
                          ? 'Missing'
                          : 'Not set'
                    }
                  />
                  <Field label="In current status since" value={fmtDate(ticket.current_status_start)} />
                </div>
              </div>

              <div className="dash-section">
                <h2>Current status SLA</h2>
                <div className="detail-fields">
                  <Field label="Status" value={ticket.current_status} />
                  <Field label="SLA state" value={slaPill(ticket.current_status_sla)} />
                </div>
                <ProgressBar
                  duration={ticket.current_status_duration}
                  threshold={ticket.current_status_sla_threshold}
                  breached={isYes(ticket.current_status_sla)}
                />
              </div>
            </div>

            <section className="dash-section">
              <h2>SLA escalation journey</h2>
              <p className="muted">
                Per-phase SLA outcome and whether breach escalations (comment / email) were triggered.
              </p>
              <div className="phase-timeline">
                <SlaPhase
                  name="To Do"
                  sla={ticket.todo_sla}
                  commented={ticket.todo_sla_commented}
                  emailed={ticket.todo_sla_emailed}
                />
                <SlaPhase
                  name="In Progress"
                  sla={ticket.inprogress_sla}
                  commented={ticket.inprogress_sla_commented}
                  emailed={ticket.inprogress_sla_emailed}
                />
                <div className="phase-row">
                  <div className="phase-marker">
                    <span className={`phase-dot ${isYes(ticket.current_status_sla) ? 'dot-red' : 'dot-green'}`} />
                  </div>
                  <div className="phase-content">
                    <div className="phase-head">
                      <h4>Current · {ticket.current_status || 'Unknown'}</h4>
                      {slaPill(ticket.current_status_sla)}
                    </div>
                    <div className="phase-meta">
                      <span>
                        <strong>{fmtDuration(ticket.current_status_duration)}</strong> in status
                      </span>
                      <span>
                        <strong>Threshold:</strong>{' '}
                        {ticket.current_status_sla_threshold
                          ? fmtDuration(ticket.current_status_sla_threshold)
                          : 'none'}
                      </span>
                    </div>
                  </div>
                </div>
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
                <div className="history-empty">
                  No status transitions recorded yet. History appears here once the sync pipeline
                  logs status changes for this ticket.
                </div>
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
