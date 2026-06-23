const t = $input.item.json;
const config = $('Merge Config').first().json;
const jiraHost = config.jiraHost || 'arhata.atlassian.net';

if (!t.issueKey || String(t.issueKey).startsWith('(GUIDE')) {
  return { json: {} };
}

return {
  json: {
    ticket_key: t.issueKey,
    summary: t.summary || '',
    assignee: t.assignee || 'Unassigned',
    priority: t.priority || 'None',
    todo_start: null,
    todo_end: null,
    'todo_duration (min)': null,
    todo_sla: 'NO',
    todo_sla_commented: 'NO',
    todo_sla_emailed: 'NO',
    inprogress_start: null,
    inprogress_end: null,
    'inprogress_duration (min)': null,
    inprogress_sla: 'NO',
    inprogress_sla_commented: 'NO',
    inprogress_sla_emailed: 'NO',
    done_start: null,
    'done_duration (min)': null,
    current_status: t.currentStatus || '',
    current_status_start: t.currentStatusEnteredAt || null,
    current_status_duration: t.currentStatusDurationMin ?? null,
    current_status_sla: t.slaBreached ? 'YES' : 'NO',
    current_status_sla_threshold: t.slaLimitMin ?? null,
    status_team: t.slaOwner || null,
    status_category: t.slaType || null,
    created: t.created || null,
    updated: t.updated || null,
    reporter: t.assignee || 'Unknown',
    issue_type: 'Support',
    project: 'V6-Support',
    due_date: t.effectiveDueDate || t.dueDate || 'No Due Date',
    due_date_missing: !!t.dueDateMissing,
    description: t.summary || '',
    jira_ticket_url: `https://${jiraHost}/browse/${t.issueKey}`,
  },
};
