'use client';

import Link from 'next/link';
import type { TicketListItem } from '../lib/api';

const slaBadge = (ticket: TicketListItem) => {
  if (ticket.due_date_missing) return { label: 'Missing due date', className: 'badge-warn' };
  if (ticket.current_status_sla === 'YES') return { label: 'SLA breached', className: 'badge-breach' };
  return { label: 'On track', className: 'badge-ok' };
};

const prioClass = (priority?: string | null) => {
  const value = (priority || '').toLowerCase();
  if (value.includes('highest') || value.includes('critical') || value.includes('blocker')) return 'prio prio-highest';
  if (value.includes('high')) return 'prio prio-high';
  if (value.includes('medium')) return 'prio prio-medium';
  if (value.includes('low')) return 'prio prio-low';
  return 'prio';
};

type Props = {
  tickets: TicketListItem[];
  loading?: boolean;
};

export default function TicketTable({ tickets, loading }: Props) {
  if (loading) {
    return <div className="table-empty">Loading tickets…</div>;
  }

  if (!tickets.length) {
    return <div className="table-empty">No tickets found.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="ticket-table">
        <colgroup>
          <col className="col-key" />
          <col className="col-summary" />
          <col className="col-status" />
          <col className="col-team" />
          <col className="col-priority" />
          <col className="col-duration" />
          <col className="col-due" />
          <col className="col-sla" />
          <col className="col-assignee" />
        </colgroup>
        <thead>
          <tr>
            <th className="col-key">Key</th>
            <th className="col-summary">Summary</th>
            <th className="col-status">Status</th>
            <th className="col-team">Team</th>
            <th className="col-priority">Priority</th>
            <th className="col-duration">Duration</th>
            <th className="col-due">Due date</th>
            <th className="col-sla">SLA</th>
            <th className="col-assignee">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const badge = slaBadge(ticket);
            return (
              <tr key={ticket.ticket_key} className={badge.className === 'badge-breach' ? 'row-breach' : ''}>
                <td className="col-key cell-compact">
                  <div className="key-cell">
                    <Link href={`/dashboard/tickets/${ticket.ticket_key}`} className="key-link">
                      {ticket.ticket_key}
                    </Link>
                    {ticket.jira_ticket_url ? (
                      <a
                        href={ticket.jira_ticket_url}
                        target="_blank"
                        rel="noreferrer"
                        className="key-external"
                        title="Open in Jira"
                        aria-label="Open in Jira"
                      >
                        ↗
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="col-summary cell-summary">{ticket.summary}</td>
                <td className="col-status">{ticket.current_status}</td>
                <td className="col-team">{ticket.status_team || '—'}</td>
                <td className="col-priority"><span className={prioClass(ticket.priority)}>{ticket.priority || '—'}</span></td>
                <td className="col-duration cell-compact">
                  {ticket.current_status_duration != null
                    ? `${ticket.current_status_duration}m`
                    : '—'}
                  {ticket.current_status_sla_threshold != null && (
                    <span className="muted"> / {ticket.current_status_sla_threshold}m</span>
                  )}
                </td>
                <td className="col-due cell-compact">{ticket.due_date_missing ? 'Missing' : ticket.due_date || '—'}</td>
                <td className="col-sla">
                  <span className={`badge ${badge.className}`}>{badge.label}</span>
                </td>
                <td className="col-assignee">{ticket.assignee || 'Unassigned'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
