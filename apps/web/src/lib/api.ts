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
  reporter: string | null;
  issue_type: string | null;
  updated: string | null;
  created: string | null;
};

export type TicketListResponse = {
  items: TicketListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type TicketDetail = TicketListItem & {
  description: string | null;
  todo_start: string | null;
  todo_end: string | null;
  'todo_duration (min)': number | null;
  todo_sla: string | null;
  todo_sla_commented: string | null;
  todo_sla_emailed: string | null;
  inprogress_start: string | null;
  inprogress_end: string | null;
  'inprogress_duration (min)': number | null;
  inprogress_sla: string | null;
  inprogress_sla_commented: string | null;
  inprogress_sla_emailed: string | null;
  done_start: string | null;
  'done_duration (min)': number | null;
};

export type StatusHistoryItem = {
  history_id: string;
  timestamp: string | null;
  ticket_key: string;
  old_status: string | null;
  new_status: string | null;
  updated_time: string | null;
  assignee: string | null;
  duration: number | null;
};

export type Me = {
  id: string;
  email: string | null;
  role: string;
  username: string | null;
  fullName: string | null;
};

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string | null;
  role: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  banned: boolean;
};

export type PhaseSla = { breached: number; total: number };

export type DashboardStats = {
  totalTickets: number;
  activeBreaches: number;
  missingDueDates: number;
  avgStatusDuration: number;
  byTeam: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byIssueType: Record<string, number>;
  byProject: Record<string, number>;
  allTeams: string[];
  slaByPhase: {
    todo: PhaseSla;
    inprogress: PhaseSla;
    current: PhaseSla;
  };
  createdTrend: Array<{ day: string; count: number }>;
  avgDurationByStatus: Array<{ status: string; avg: number }>;
};
