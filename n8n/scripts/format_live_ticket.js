const formatDate = (isoStr) => {
    if (!isoStr || typeof isoStr !== 'string' || !isoStr.includes('T')) return isoStr;
    const [date, fullTime] = isoStr.split('T');
    const time = fullTime.split('.')[0];
    return `${date} ${time}`;
};

const parseToUTC = (isoStr) => {
    if (!isoStr) return null;
    return new Date(isoStr).getTime();
};

const parseJiraDescription = (desc) => {
    if (desc == null || desc === '') return '';
    if (typeof desc === 'string') {
        const trimmed = desc.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"type"')) {
            try { return parseJiraDescription(JSON.parse(trimmed)); } catch (e) { return trimmed; }
        }
        return trimmed;
    }
    if (typeof desc === 'object' && desc.type === 'doc' && Array.isArray(desc.content)) {
        const parts = [];
        const walk = (nodes) => {
            if (!nodes) return;
            for (const node of nodes) {
                if (node.type === 'text' && node.text) parts.push(node.text);
                if (node.type === 'hardBreak') parts.push('\n');
                if (node.content) walk(node.content);
            }
        };
        walk(desc.content);
        return parts.join('').trim();
    }
    return String(desc);
};

// Synced with packages/shared/src/sla_timing.json — single source of truth
const SLA_CONFIG = [
    { main_status: 'Report', timings: {}, workflow: [
        { team: 'Support', status: 'Triage Required with Product' },
        { team: 'Product', status: 'Migrated to Prod' },
        { team: 'Support', status: null }
    ]},
    { main_status: 'RCA Discovery', timings: { Highest: 45, High: 45, Medium: 60 }, workflow: [
        { team: 'QA', status: 'Triage Required with Tech' },
        { team: 'Tech', status: 'Backend Changes Ticket Created/Attached' },
        { team: 'Support', status: null }
    ]},
    { main_status: 'Bug (Tech RCA)', timings: { Highest: 45, High: 45, Medium: 360 }, workflow: [
        { team: 'Tech', status: 'In Progress' },
        { team: 'Tech', status: 'No Action Required' },
        { team: 'Support', status: null }
    ]},
    { main_status: 'Triaged', timings: { Highest: 20, High: 20, Medium: 60 }, workflow: [
        { team: 'Product', status: 'QA Failed' },
        { team: 'Tech', status: 'UAT Done with Customer' },
        { team: 'Support', status: null }
    ]},
    { main_status: 'Sprint ticket available/created', timings: { Highest: 'Due Date', High: 'Due Date', Medium: 'Due Date' }, workflow: [
        { team: 'QA/Tech', status: 'Clone Ticket Created' },
        { team: 'Tech', status: null }
    ]},
    { main_status: 'Fastrack ticket available/created', timings: { Highest: 'Due Date', High: 'Due Date', Medium: 'Due Date' }, workflow: [
        { team: 'QA/Tech', status: 'Ready for Unit Test (HF)' },
        { team: 'Tech', status: null }
    ]},
    { main_status: 'HotFix Route', timings: { Highest: 'Due Date', High: 'Due Date', Medium: 'Due Date' }, workflow: [
        { team: 'QA/Tech', status: 'Ready for Unit Test (PP)' },
        { team: 'Tech', status: null }
    ]},
    { main_status: 'Config Changes', timings: { Highest: 20, High: 20, Medium: 60 }, workflow: [
        { team: 'Product', status: 'Ready for Unit Test (Prod)' },
        { team: 'Tech', status: null }
    ]},
    { main_status: 'Approved by CSM/Product', timings: { Highest: 20, High: 20, Medium: 60 }, workflow: [
        { team: 'Product', status: 'Ready for QA (HF)' },
        { team: 'QA', status: null }
    ]},
    { main_status: 'Changes Completed', timings: { Highest: 10, High: 10, Medium: 30 }, workflow: [
        { team: 'QA', status: 'Ready for QA (PP)' },
        { team: 'QA', status: null }
    ]},
    { main_status: 'Backend Changes Required', timings: { Highest: 15, High: 15, Medium: 30 }, workflow: [
        { team: 'QA', status: 'Ready for QA (Prod)' },
        { team: 'QA', status: null }
    ]},
    { main_status: null, timings: {}, workflow: [
        { team: null, status: 'QA Done (HF)' },
        { team: 'Tech', status: null }
    ]},
    { main_status: null, timings: {}, workflow: [
        { team: null, status: 'QA Done (PP)' },
        { team: 'Tech', status: null }
    ]},
    { main_status: null, timings: {}, workflow: [
        { team: null, status: 'QA Done (Prod)' },
        { team: 'Support', status: null }
    ]}
];

const normalizeTimingToMinutes = (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return Math.round(value);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        const lower = trimmed.toLowerCase();
        if (lower === 'due date') return null;
        const hrsMatch = lower.match(/^(\d+(?:\.\d+)?)\s*hrs?$/);
        if (hrsMatch) return Math.round(parseFloat(hrsMatch[1]) * 60);
        const minMatch = lower.match(/^(\d+(?:\.\d+)?)\s*min(?:s)?$/);
        if (minMatch) return Math.round(parseFloat(minMatch[1]));
        const asNumber = Number(trimmed);
        if (!Number.isNaN(asNumber)) return Math.round(asNumber);
    }
    return null;
};

const parseTiming = (value) => {
    if (value == null) return { kind: 'none', minutes: null };
    if (typeof value === 'string' && value.trim().toLowerCase() === 'due date') {
        return { kind: 'due_date', minutes: null };
    }
    return { kind: 'minutes', minutes: normalizeTimingToMinutes(value) };
};

const buildStatusMaps = (config) => {
    const main = new Map();
    const sub = new Map();
    const final = new Map();
    for (const row of config) {
        const workflow = Array.isArray(row.workflow) ? row.workflow : [];
        const mainStatus = row.main_status || null;
        const timings = row.timings || {};
        const mainTeam = workflow[0]?.team ?? null;
        const subStatus = workflow[0]?.status ?? null;
        const subTeam = workflow[1]?.team ?? null;
        const finalStatus = workflow[1]?.status ?? null;
        const finalTeam = workflow[2]?.team ?? null;
        if (mainStatus) main.set(mainStatus, { team: mainTeam, timings, mainStatus });
        if (subStatus) sub.set(subStatus, { team: subTeam, timings, mainStatus });
        if (finalStatus) final.set(finalStatus, { team: finalTeam, timings, mainStatus });
    }
    return { main, sub, final };
};

const statusMaps = buildStatusMaps(SLA_CONFIG);

const getStatusMeta = (status) => {
    if (statusMaps.main.has(status)) return { ...statusMaps.main.get(status), category: 'Main' };
    if (statusMaps.sub.has(status)) return { ...statusMaps.sub.get(status), category: 'Sub' };
    if (statusMaps.final.has(status)) return { ...statusMaps.final.get(status), category: 'Final' };
    return { team: null, timings: null, mainStatus: null, category: 'Unknown' };
};

const getTimingForPriority = (timings, priorityName) => {
    if (!timings) return null;
    const keys = Object.keys(timings);
    if (!keys.length) return null;
    if (priorityName) {
        const match = keys.find((k) => k.toLowerCase() === priorityName.toLowerCase());
        if (match) return timings[match];
    }
    return timings.Highest ?? timings.High ?? timings.Medium ?? null;
};

const getDueDateEndUtc = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-').map((v) => Number(v));
    if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) return null;
    const [year, month, day] = parts;
    return Date.UTC(year, month - 1, day, 23, 59, 59);
};

const issue = $json;
const JIRA_BASE_URL = "https://swagatcompany1.atlassian.net";
const jira_ticket_url = `${JIRA_BASE_URL}/browse/${issue.key}`;
const staticData = $getWorkflowStaticData('global');
if ($itemIndex === 0) staticData.slaAlertKeys = new Set();

const flagIsYes = (v) => {
    const s = String(v ?? '').trim().toUpperCase();
    return s === 'YES' || s === 'TRUE' || v === true;
};

const changelog = issue.changelog || { histories: [] };
const created = issue.fields.created;
let transitions = [];
for (const history of changelog.histories) {
    for (const item of history.items) {
        if (item.field === 'status') {
            transitions.push({ to: item.toString, from: item.fromString, timestamp: history.created });
        }
    }
}
transitions.sort((a, b) => parseToUTC(a.timestamp) - parseToUTC(b.timestamp));

const currentStatus = issue.fields.status?.name || '';
let lifecycle = {
    todo_start: null, todo_end: null, todo_duration: null,
    inprogress_start: null, inprogress_end: null, inprogress_duration: null,
    done_start: null, done_duration: null, was_regression: false
};

for (const t of transitions) {
    if (t.from === 'In Progress' && t.to === 'To Do') lifecycle.was_regression = true;
    if (t.from === 'Done' && t.to === 'In Progress') {
        lifecycle.inprogress_start = t.timestamp;
        lifecycle.inprogress_end = null;
        lifecycle.done_start = null;
    }
    if (t.to === 'To Do') {
        lifecycle.todo_start = t.timestamp;
        lifecycle.todo_end = null;
        lifecycle.inprogress_start = null;
        lifecycle.inprogress_end = null;
        lifecycle.done_start = null;
    }
    if (t.to === 'In Progress' && t.from !== 'Done') {
        lifecycle.inprogress_start = t.timestamp;
        lifecycle.inprogress_end = null;
        lifecycle.done_start = null;
        if (lifecycle.todo_start && !lifecycle.todo_end) lifecycle.todo_end = t.timestamp;
    }
    if (t.to === 'Done') {
        lifecycle.done_start = t.timestamp;
        if (lifecycle.inprogress_start && !lifecycle.inprogress_end) lifecycle.inprogress_end = t.timestamp;
        if (lifecycle.todo_start && !lifecycle.todo_end) lifecycle.todo_end = t.timestamp;
    }
}

const calcRunningDur = (start, end) => {
    if (!start) return null;
    const startTime = parseToUTC(start);
    const endTime = end ? parseToUTC(end) : Date.now();
    return Math.max(0, Math.round((endTime - startTime) / 60000));
};

lifecycle.todo_duration = calcRunningDur(lifecycle.todo_start, lifecycle.todo_end);
lifecycle.inprogress_duration = calcRunningDur(lifecycle.inprogress_start, lifecycle.inprogress_end);

if (!lifecycle.todo_start && currentStatus === 'To Do') lifecycle.todo_start = created;
if (!lifecycle.inprogress_start && currentStatus === 'In Progress') lifecycle.inprogress_start = created;
if (!lifecycle.done_start && currentStatus === 'Done') lifecycle.done_start = created;
lifecycle.done_duration = calcRunningDur(lifecycle.done_start, null);

let current_status_start = null;
for (const t of transitions) {
    if (t.to === currentStatus) current_status_start = t.timestamp;
}
if (!current_status_start) current_status_start = created;

const current_status_duration = calcRunningDur(current_status_start, null);
const statusMeta = getStatusMeta(currentStatus);
const status_team = statusMeta.team || null;
const status_category = statusMeta.category || 'Unknown';
const timingValue = getTimingForPriority(statusMeta.timings || {}, issue.fields.priority?.name || null);
const timing = parseTiming(timingValue);

let current_status_sla_threshold = null;
let current_status_sla = 'NO';
let due_date_missing = false;
const jiraDueDate = issue.fields.duedate || null;

if (timing.kind === 'minutes' && timing.minutes != null) {
    current_status_sla_threshold = timing.minutes;
    current_status_sla = (current_status_duration != null && current_status_duration > timing.minutes) ? 'YES' : 'NO';
} else if (timing.kind === 'due_date') {
    if (!jiraDueDate) {
        due_date_missing = true;
        current_status_sla = 'YES';
        current_status_sla_threshold = null;
    } else {
        const dueDateMs = getDueDateEndUtc(jiraDueDate);
        if (dueDateMs) {
            const startMs = parseToUTC(current_status_start);
            if (startMs) current_status_sla_threshold = Math.max(0, Math.round((dueDateMs - startMs) / 60000));
            current_status_sla = Date.now() > dueDateMs ? 'YES' : 'NO';
        }
    }
}

// Informational lifecycle SLAs (no alerts — status-based SLA drives alerts)
const todo_sla = (currentStatus === 'To Do' && lifecycle.todo_duration > 480) ? 'YES' : 'NO';
const inprogress_sla = (currentStatus === 'In Progress' && lifecycle.inprogress_duration > 480) ? 'YES' : 'NO';

const sheetData = $("Read Live Ticket1").all();
const sheetMap = new Map(sheetData.map(item => [String(item.json.ticket_key), item.json]));
const prevData = sheetMap.get(issue.key) || {};

let todo_sla_commented = prevData.todo_sla_commented || 'NO';
let inprogress_sla_commented = prevData.inprogress_sla_commented || 'NO';
let todo_sla_emailed = prevData.todo_sla_emailed || 'NO';
let inprogress_sla_emailed = prevData.inprogress_sla_emailed || 'NO';

// Reset alert flags when status changes or SLA clears
const prevStatus = prevData.current_status || '';
if (prevStatus && prevStatus !== currentStatus) {
    todo_sla_commented = 'NO';
    inprogress_sla_commented = 'NO';
    todo_sla_emailed = 'NO';
    inprogress_sla_emailed = 'NO';
}
if (current_status_sla === 'NO') {
    todo_sla_commented = 'NO';
    inprogress_sla_commented = 'NO';
    todo_sla_emailed = 'NO';
    inprogress_sla_emailed = 'NO';
}

let jira_comment = null;
let email_subject = null;
let email_body = null;

const buildSlaEmailBody = (breachReason, currentDuration, threshold) => {
    const divider = '====================================================';
    return [
        'SLA BREACH ALERT', '', divider, '', 'TICKET DETAILS', '',
        `Ticket Key:      ${issue.key}`,
        `Summary:         ${issue.fields.summary}`,
        `Current Status:  ${issue.fields.status.name}`,
        `Assignee:        ${issue.fields.assignee?.displayName || 'Unassigned'}`,
        `Priority:        ${issue.fields.priority?.name || 'None'}`,
        `Project:         ${issue.fields.project.name}`,
        `Reporter:        ${issue.fields.reporter?.displayName || 'Unknown'}`,
        `Created Time:    ${formatDate(issue.fields.created)}`,
        `Last Updated:    ${formatDate(issue.fields.updated)}`,
        `Due Date:        ${jiraDueDate || 'No Due Date'}`,
        '', divider, '', 'SLA DETAILS', '',
        `Breached SLA Type:      ${breachReason}`,
        `Status Team:            ${status_team || 'Unknown'}`,
        `Status Category:        ${status_category}`,
        `Time in Status:         ${currentDuration ?? 'N/A'} minutes`,
        `Allowed Threshold:      ${threshold != null ? threshold + ' minutes' : (due_date_missing ? 'Due date required' : 'Due date')}`,
        '', divider, '', 'DIRECT JIRA LINK', '', `Open Ticket: ${jira_ticket_url}`,
        '', divider, '', 'ACTION REQUIRED', '',
        due_date_missing
            ? 'This ticket requires a due date in Jira. Please set one immediately.'
            : 'Immediate attention is required. Please review ownership, blockers, and prioritization.',
    ].join('\n');
};

if (current_status_sla === 'YES') {
    const breachReason = due_date_missing
        ? 'MISSING DUE DATE'
        : `STATUS SLA (${currentStatus})`;
    if (!flagIsYes(todo_sla_commented)) {
        jira_comment = due_date_missing
            ? '⚠️ SLA breach: Due date is missing for this status.\n\nPlease set a due date in Jira immediately.'
            : `⚠️ SLA breached in status "${currentStatus}".\n\nTime in status: ${current_status_duration} min (threshold: ${current_status_sla_threshold ?? 'due date'} min).\nPlease review and take necessary action.`;
        todo_sla_commented = 'YES';
    }
    if (!flagIsYes(todo_sla_emailed)) {
        email_subject = due_date_missing
            ? `[SLA BREACH][MISSING DUE DATE] ${issue.key}`
            : `[SLA BREACH][${currentStatus}] ${issue.key}`;
        email_body = buildSlaEmailBody(breachReason, current_status_duration, current_status_sla_threshold);
        todo_sla_emailed = 'YES';
    }
}

let shouldSendSlaAlert = Boolean(jira_comment || email_body);
if (shouldSendSlaAlert) {
    const alertKey = String(issue.key);
    if (staticData.slaAlertKeys.has(alertKey)) {
        shouldSendSlaAlert = false;
        jira_comment = null;
        email_subject = null;
        email_body = null;
    } else {
        staticData.slaAlertKeys.add(alertKey);
    }
}

console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'TICKET_EVAL',
    key: issue.key,
    status: currentStatus,
    current_status_sla,
    current_status_duration,
    current_status_sla_threshold,
    due_date_missing,
    status_category,
}));

return {
    ticket_key: issue.key,
    summary: issue.fields.summary,
    assignee: issue.fields.assignee?.displayName || 'Unassigned',
    priority: issue.fields.priority?.name || 'None',
    todo_start: formatDate(lifecycle.todo_start),
    todo_end: formatDate(lifecycle.todo_end),
    'todo_duration (min)': lifecycle.todo_duration,
    todo_sla,
    todo_sla_commented,
    todo_sla_emailed,
    inprogress_start: formatDate(lifecycle.inprogress_start),
    inprogress_end: formatDate(lifecycle.inprogress_end),
    'inprogress_duration (min)': lifecycle.inprogress_duration,
    inprogress_sla,
    inprogress_sla_commented,
    inprogress_sla_emailed,
    done_start: formatDate(lifecycle.done_start),
    'done_duration (min)': lifecycle.done_duration,
    jira_comment,
    email_subject,
    email_body,
    current_status: currentStatus,
    current_status_start: formatDate(current_status_start),
    current_status_duration,
    current_status_sla,
    current_status_sla_threshold,
    status_team,
    status_category,
    created: formatDate(issue.fields.created),
    updated: formatDate(issue.fields.updated),
    reporter: issue.fields.reporter?.displayName || 'Unknown',
    issue_type: issue.fields.issuetype.name,
    project: issue.fields.project.name,
    due_date: jiraDueDate || 'No Due Date',
    due_date_missing,
    description: parseJiraDescription(issue.fields.description),
    jira_ticket_url,
};
