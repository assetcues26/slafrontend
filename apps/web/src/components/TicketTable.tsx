'use client';

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
        <thead>
          <tr>
            <th>Key</th>
            <th>Summary</th>
            <th>Status</th>
            <th>Team</th>
            <th>Priority</th>
            <th>Duration</th>
            <th>Due date</th>
            <th>SLA</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const badge = slaBadge(ticket);
            return (
              <tr key={ticket.ticket_key} className={badge.className === 'badge-breach' ? 'row-breach' : ''}>
                <td>
                  <a href={ticket.jira_ticket_url || '#'} target="_blank" rel="noreferrer">
                    {ticket.ticket_key}
                  </a>
                </td>
                <td className="cell-summary">{ticket.summary}</td>
                <td>{ticket.current_status}</td>
                <td>{ticket.status_team || '—'}</td>
                <td><span className={prioClass(ticket.priority)}>{ticket.priority || '—'}</span></td>
                <td>
                  {ticket.current_status_duration != null
                    ? `${ticket.current_status_duration}m`
                    : '—'}
                  {ticket.current_status_sla_threshold != null && (
                    <span className="muted"> / {ticket.current_status_sla_threshold}m</span>
                  )}
                </td>
                <td>{ticket.due_date_missing ? 'Missing' : ticket.due_date || '—'}</td>
                <td>
                  <span className={`badge ${badge.className}`}>{badge.label}</span>
                </td>
                <td>{ticket.assignee || 'Unassigned'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
