const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/v1';

export const fetchJson = async <T>(
  path: string,
  token?: string | null,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export type TicketListItem = {
  ticket_key: string;
  summary: string | null;
  assignee: string | null;
  priority: string | null;
  current_status: string | null;
  current_status_start: string | null;
  current_status_duration: number | null;
  current_status_sla: string | null;
  current_status_sla_threshold: number | null;
  status_team: string | null;
  status_category: string | null;
  due_date: string | null;
  due_date_missing: boolean | null;
  jira_ticket_url: string | null;
  project: string | null;
  updated: string | null;
};

export type TicketListResponse = {
  items: TicketListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type DashboardStats = {
  totalTickets: number;
  activeBreaches: number;
  missingDueDates: number;
  avgStatusDuration: number;
  byTeam: Record<string, number>;
  byStatus: Record<string, number>;
};
