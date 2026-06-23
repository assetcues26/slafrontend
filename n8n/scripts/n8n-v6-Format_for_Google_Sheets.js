const t = $input.item.json;

function sheetDate(value) {
  if (!value || typeof value !== 'string') return '';
  const datePart = value.split('T')[0].trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
}

if (!t.issueKey || String(t.issueKey).startsWith('(GUIDE')) {
  return { json: {} };
}

return {
  json: {
    'Issue Key': t.issueKey,
    Summary: t.summary,
    Priority: t.priority,
    Assignee: t.assignee,
    'Assignee Email': t.assigneeEmail,
    'Current Status': t.currentStatus,
    'Tracking Status': 'Active',
    'Time in Status (Min)': t.currentStatusDurationMin,
    'SLA Limit (Min)': t.slaLimitMin ?? '',
    'SLA Owner': t.slaOwner || '',
    'SLA Breached': t.slaBreached ? 'Yes' : 'No',
    'Active Breach Summary': t.activeBreachSummary || '',
    'Status Flow': t.statusFlowSummary || '',
    'Time per Status (Min)': t.timePerStatus || '',
    'Due Date': sheetDate(t.dueDate),
    'Revised Due Date': sheetDate(t.revisedDueDate),
    'Effective Due Date': sheetDate(t.effectiveDueDate),
    'Total Flow (Min)': t.totalFlowTimeMin,
    'Status Entered At': t.currentStatusEnteredAtIST || '',
    Created: t.createdIST || '',
    'Last Updated': t.updatedIST || '',
    'Last Checked': new Date().toLocaleString('en-IN', {
      timeZone: t.timezone || 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    Timezone: t.timezone || 'IST',
  },
};
