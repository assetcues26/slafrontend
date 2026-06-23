const item = $input.item.json;
const config = $('Merge Config').first().json;
const slaMatrix = config.slaMatrix || [];
const timezone = config.timezone || 'Asia/Kolkata';
const revisedDueDateField = config.revisedDueDateField || 'Revised due date';

const istFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: timezone,
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatIST(isoOrDate) {
  if (!isoOrDate) return '';
  return istFormatter.format(new Date(isoOrDate));
}

function formatDurationMin(totalMin) {
  const m = Math.max(0, Math.round(totalMin));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min} min`;
  return `${h}h ${min} min`;
}

function buildStatusFlowSummary(detailedStatusFlow) {
  if (!detailedStatusFlow?.length) return '';
  return detailedStatusFlow.map((step, idx) => {
    const isNow = step.toStatus === 'CURRENT';
    const segments = [`${idx + 1}. ${step.fromStatus}`, `${step.durationMin} min`];
    if (step.slaLimitMin !== null && step.slaLimitMin !== undefined) {
      segments.push(`limit ${step.slaLimitMin} min`);
    }
    if (step.slaBreached) segments.push('BREACH');
    if (isNow) segments.push('NOW');
    return segments.join(' · ');
  }).join('  →  ');
}

function buildTimePerStatus(totalTimeInStatuses) {
  if (!totalTimeInStatuses || !Object.keys(totalTimeInStatuses).length) return '';
  return Object.entries(totalTimeInStatuses)
    .map(([status, min]) => `${status}: ${Math.round(min)} min`)
    .join('  |  ');
}

function buildActiveBreachSummary(slaBreached, currentStatus, slaBreachReason, allBreaches) {
  if (!slaBreached) return '';
  const active = (allBreaches || []).find(
    (b) => b.breachType === 'current' || b.breachType === 'duedate',
  );
  if (active) return active.breachReason;
  return slaBreachReason || `${currentStatus}: SLA breached`;
}

function parseTimingToMinutes(timingStr) {
  if (!timingStr || timingStr === 'Due Date' || timingStr === '—' || timingStr === '-') return null;
  const str = String(timingStr).trim();
  const match = str.match(/(\d+)\s*(Min|Hrs?)/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return unit.startsWith('min') ? value : value * 60;
}

function normalizeDateValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const datePart = value.split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    return null;
  }
  return null;
}

function resolveRevisedDueDate(fields, fieldConfig) {
  if (!fields) return null;

  const standard = normalizeDateValue(fields.duedate);

  if (fieldConfig && fieldConfig.startsWith('customfield_')) {
    return normalizeDateValue(fields[fieldConfig]);
  }

  // arhata.atlassian.net V6-Support: Revised Due Date = customfield_11455
  const revisedFieldIds = ['customfield_11455', 'customfield_11812'];
  for (const fieldId of revisedFieldIds) {
    const normalized = normalizeDateValue(fields[fieldId]);
    if (normalized) return normalized;
  }

  if (fieldConfig && fields[fieldConfig]) {
    return normalizeDateValue(fields[fieldConfig]);
  }

  const dateCustomFields = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!key.startsWith('customfield_')) continue;
    const normalized = normalizeDateValue(value);
    if (normalized) dateCustomFields.push({ key, date: normalized });
  }

  const others = dateCustomFields.filter((f) => f.date !== standard);
  if (others.length === 1) return others[0].date;

  if (others.length > 1) {
    const later = others
      .filter((f) => !standard || f.date > standard)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (later.length) return later[0].date;
  }

  return null;
}

function getEffectiveDueDate(fields, fieldConfig) {
  const standard = normalizeDateValue(fields?.duedate);
  const revised = resolveRevisedDueDate(fields, fieldConfig);
  if (!standard && !revised) return { standard: null, revised: null, effective: null };
  if (!standard) return { standard: null, revised, effective: revised };
  if (!revised) return { standard, revised: null, effective: standard };
  const effective = standard >= revised ? standard : revised;
  return { standard, revised, effective };
}

function findRule(statusName) {
  return slaMatrix.find(r => r.status === statusName)
    || slaMatrix.find(r => r.status.toLowerCase() === (statusName || '').toLowerCase());
}

function isNoAlertStatus(statusName, noAlertStatuses) {
  const s = (statusName || '').trim().toLowerCase();
  if (!s) return false;
  if ((noAlertStatuses || []).some((x) => (x || '').trim().toLowerCase() === s)) return true;
  const rule = findRule(statusName);
  return rule?.slaType === 'terminal' || rule?.slaType === 'none';
}

function getDueDateEODIST(dueDateStr) {
  if (!dueDateStr) return null;
  const [y, m, d] = dueDateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 18, 29, 59));
}

function getSLAForStatus(statusName, priority, effectiveDueDate, enteredAt) {
  const rule = findRule(statusName);
  if (!rule) return { slaType: 'none', slaLimitMin: null, owner: null };
  if (rule.slaType === 'terminal' || rule.slaType === 'none') {
    return { slaType: rule.slaType, slaLimitMin: null, owner: rule.team };
  }

  const priorityLower = (priority || '').toLowerCase();
  let timingValue;
  if (priorityLower === 'highest') timingValue = rule.highest;
  else if (priorityLower === 'high') timingValue = rule.high;
  else timingValue = rule.medium;

  if (rule.slaType === 'duedate' || timingValue === 'Due Date') {
    if (!effectiveDueDate) {
      return { slaType: 'duedate', slaLimitMin: null, owner: rule.team, dueDateMissing: true };
    }
    const dueEOD = getDueDateEODIST(effectiveDueDate);
    const entered = new Date(enteredAt);
    const allowedMin = Math.round((dueEOD - entered) / 60000);
    return { slaType: 'duedate', slaLimitMin: allowedMin > 0 ? allowedMin : 0, owner: rule.team, dueDate: effectiveDueDate };
  }

  const slaLimitMin = parseTimingToMinutes(timingValue);
  return { slaType: 'duration', slaLimitMin, owner: rule.team };
}

function evaluateBreach(slaRule, durationMin, now, effectiveDueDate) {
  if (slaRule.slaType === 'terminal' || slaRule.slaType === 'none') {
    return { breached: false, reason: 'No SLA for this status' };
  }
  if (slaRule.slaType === 'duedate') {
    if (slaRule.dueDateMissing || !effectiveDueDate) {
      return { breached: true, reason: 'Due date not set — required for this status' };
    }
    const dueEOD = getDueDateEODIST(effectiveDueDate);
    if (now > dueEOD) {
      const overdueMin = Math.round((now - dueEOD) / 60000);
      return {
        breached: true,
        reason: `Passed effective due date ${effectiveDueDate} (overdue by ${overdueMin} min)`,
      };
    }
    return { breached: false, reason: 'Within effective due date' };
  }
  if (slaRule.slaLimitMin === null) {
    return { breached: false, reason: 'No SLA limit configured' };
  }
  if (durationMin > slaRule.slaLimitMin) {
    return {
      breached: true,
      reason: `Exceeded ${slaRule.slaLimitMin} min limit by ${durationMin - slaRule.slaLimitMin} min`,
    };
  }
  return { breached: false, reason: 'No breach' };
}

const dueDates = getEffectiveDueDate(item.fields, revisedDueDateField);
const effectiveDueDate = dueDates.effective;
const now = new Date();

const result = {
  issueKey: item.key,
  issueId: item.id,
  summary: item.fields.summary,
  currentStatus: item.fields.status.name,
  priority: item.fields.priority?.name || 'None',
  assignee: item.fields.assignee?.displayName || 'Unassigned',
  assigneeEmail: item.fields.assignee?.emailAddress || '',
  created: item.fields.created,
  createdIST: formatIST(item.fields.created),
  updated: item.fields.updated,
  updatedIST: formatIST(item.fields.updated),
  dueDate: dueDates.standard,
  revisedDueDate: dueDates.revised,
  effectiveDueDate,
  timezone: 'IST',
  statusHistory: [],
  detailedStatusFlow: [],
  totalTimeInStatuses: {},
  currentStatusDurationMin: 0,
  currentStatusEnteredAt: null,
  currentStatusEnteredAtIST: null,
  slaBreached: false,
  slaBreachReason: '',
  slaLimitMin: null,
  slaOwner: null,
  slaType: null,
  dueDateMissing: false,
  totalFlowTimeMin: 0,
  allBreaches: [],
};

const statusChanges = [];
if (item.changelog && item.changelog.histories) {
  for (const history of item.changelog.histories) {
    for (const historyItem of history.items || []) {
      if (historyItem.field === 'status') {
        statusChanges.push({
          timestamp: history.created,
          fromStatus: historyItem.fromString,
          toStatus: historyItem.toString,
          author: history.author?.displayName || 'Unknown',
          authorEmail: history.author?.emailAddress || '',
        });
      }
    }
  }
}

statusChanges.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

let previousTimestamp = new Date(item.fields.created);
let previousStatus = statusChanges.length > 0 ? statusChanges[0].fromStatus : item.fields.status.name;
let stepNumber = 1;

for (const change of statusChanges) {
  const currentTimestamp = new Date(change.timestamp);
  const durationMin = Math.round((currentTimestamp - previousTimestamp) / 60000);

  const slaRule = getSLAForStatus(previousStatus, result.priority, effectiveDueDate, previousTimestamp.toISOString());
  const breach = evaluateBreach(slaRule, durationMin, currentTimestamp, effectiveDueDate);

  const flowStep = {
    stepNumber: stepNumber++,
    fromStatus: previousStatus,
    toStatus: change.toStatus,
    startTime: previousTimestamp.toISOString(),
    startTimeIST: formatIST(previousTimestamp),
    endTime: currentTimestamp.toISOString(),
    endTimeIST: formatIST(currentTimestamp),
    durationMin,
    durationFormatted: formatDurationMin(durationMin),
    changedBy: change.author,
    changedByEmail: change.authorEmail,
    statusChangeTime: currentTimestamp.toISOString(),
    statusChangeTimeIST: formatIST(currentTimestamp),
    slaLimitMin: slaRule.slaLimitMin,
    slaType: slaRule.slaType,
    slaOwner: slaRule.owner,
    slaBreached: breach.breached,
    slaBreachReason: breach.reason,
  };

  result.detailedStatusFlow.push(flowStep);

  if (breach.breached && slaRule.slaType !== 'terminal' && slaRule.slaType !== 'none') {
    const noAlertStatuses = config.noAlertStatuses || config.finalStatuses || [];
    if (!isNoAlertStatus(change.toStatus, noAlertStatuses)) {
      result.allBreaches.push({
      breachId: `${result.issueKey}|historical|${previousStatus}|${currentTimestamp.toISOString()}`,
      breachType: 'historical',
      status: previousStatus,
      breachReason: breach.reason,
      durationMin,
      slaLimitMin: slaRule.slaLimitMin,
      slaOwner: slaRule.owner,
      slaType: slaRule.slaType,
    });
    }
  }

  result.statusHistory.push({
    status: previousStatus,
    startTime: previousTimestamp.toISOString(),
    endTime: currentTimestamp.toISOString(),
    durationMin,
    changedBy: change.author,
  });

  if (!result.totalTimeInStatuses[previousStatus]) result.totalTimeInStatuses[previousStatus] = 0;
  result.totalTimeInStatuses[previousStatus] += durationMin;

  previousTimestamp = currentTimestamp;
  previousStatus = change.toStatus;
}

const currentDurationMin = Math.round((now - previousTimestamp) / 60000);
result.currentStatusDurationMin = currentDurationMin;
result.currentStatusEnteredAt = previousTimestamp.toISOString();
result.currentStatusEnteredAtIST = formatIST(previousTimestamp);

const currentSlaRule = getSLAForStatus(result.currentStatus, result.priority, effectiveDueDate, previousTimestamp.toISOString());
const currentBreach = evaluateBreach(currentSlaRule, currentDurationMin, now, effectiveDueDate);

result.slaType = currentSlaRule.slaType;
result.slaOwner = currentSlaRule.owner;
result.slaLimitMin = currentSlaRule.slaLimitMin;
result.dueDateMissing = !!(currentSlaRule.dueDateMissing || (currentSlaRule.slaType === 'duedate' && !effectiveDueDate));

const currentFlowStep = {
  stepNumber,
  fromStatus: result.currentStatus,
  toStatus: 'CURRENT',
  startTime: previousTimestamp.toISOString(),
  startTimeIST: formatIST(previousTimestamp),
  endTime: now.toISOString(),
  endTimeIST: formatIST(now),
  durationMin: currentDurationMin,
  durationFormatted: formatDurationMin(currentDurationMin),
  changedBy: 'N/A (Current Status)',
  changedByEmail: '',
  statusChangeTime: 'In Progress',
  statusChangeTimeIST: formatIST(now),
  slaLimitMin: currentSlaRule.slaLimitMin,
  slaType: currentSlaRule.slaType,
  slaOwner: currentSlaRule.owner,
  slaBreached: currentBreach.breached,
  slaBreachReason: currentBreach.reason,
};

result.detailedStatusFlow.push(currentFlowStep);

if (!result.totalTimeInStatuses[item.fields.status.name]) {
  result.totalTimeInStatuses[item.fields.status.name] = 0;
}
result.totalTimeInStatuses[item.fields.status.name] += currentDurationMin;

result.totalFlowTimeMin = Math.round((now - new Date(item.fields.created)) / 60000);

const noAlertStatuses = config.noAlertStatuses || config.finalStatuses || [];

if (currentBreach.breached && !isNoAlertStatus(result.currentStatus, noAlertStatuses)) {
  result.slaBreached = true;
  result.slaBreachReason = `${result.currentStatus}: ${currentBreach.reason}`;

  const breachType = currentSlaRule.slaType === 'duedate' ? 'duedate' : 'current';
  result.allBreaches.push({
    breachId: `${result.issueKey}|${breachType}|${result.currentStatus}|ongoing`,
    breachType,
    status: result.currentStatus,
    breachReason: result.slaBreachReason,
    durationMin: currentDurationMin,
    slaLimitMin: currentSlaRule.slaLimitMin,
    slaOwner: currentSlaRule.owner,
    slaType: currentSlaRule.slaType,
  });
}

if (isNoAlertStatus(result.currentStatus, noAlertStatuses)) {
  result.allBreaches = [];
  result.slaBreached = false;
  result.slaBreachReason = '';
}

result.statusFlowSummary = buildStatusFlowSummary(result.detailedStatusFlow);
result.timePerStatus = buildTimePerStatus(result.totalTimeInStatuses);
result.activeBreachSummary = buildActiveBreachSummary(
  result.slaBreached,
  result.currentStatus,
  result.slaBreachReason,
  result.allBreaches,
);
result.shouldEvaluateAlerts = result.allBreaches.length > 0;

return result;
