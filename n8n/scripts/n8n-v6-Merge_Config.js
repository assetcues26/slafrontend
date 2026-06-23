const slaRows = $('Read SLA Matrix').all().map(i => i.json);
const finalRows = $('Read Final Statuses').all().map(i => i.json);
const configRows = $('Read Notification Config').all().map(i => i.json);
const statusEscalationRows = $('Read Status Escalation').all().map(i => i.json);
const alertRows = $('Read Alert State').all().map(i => i.json);
const pgAlertRows = $('Read Alert State PostgreSQL').all().map(i => i.json);
const sheetRows = $('Read Sheet1 Tickets').all().map(i => i.json);

function isGuideText(value) {
  const text = String(value || '').trim();
  return text.startsWith('TAB GUIDE') || text.startsWith('COLUMN GUIDE');
}

function isGuideRow(row) {
  return isGuideText(row.Description)
    || isGuideText(row.description)
    || isGuideText(row.Key)
    || isGuideText(row.key)
    || isGuideText(row.Status)
    || isGuideText(row.status)
    || isGuideText(row['Alert Key'])
    || isGuideText(row.alertKey)
    || isGuideText(row.Level)
    || isGuideText(row.level);
}

function parseAfterBreachMin(value) {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeFieldName(name) {
  return String(name || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();
}

/** Google Sheets / CSV may vary header spacing or casing — match flexibly. */
function pickRowField(row, ...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const direct = row[candidate];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
      return String(direct).trim();
    }
  }

  const normalizedEntries = Object.entries(row).map(([key, value]) => ({
    key,
    norm: normalizeFieldName(key),
    value,
  }));

  for (const candidate of candidates) {
    const normCandidate = normalizeFieldName(candidate);
    const match = normalizedEntries.find((entry) => entry.norm === normCandidate);
    if (match && String(match.value ?? '').trim() !== '') {
      return String(match.value).trim();
    }
  }

  return '';
}

const notificationConfig = {};
for (const row of configRows) {
  if (isGuideRow(row)) continue;
  const key = String(row.Key || row.key || '').trim();
  const value = row.Value ?? row.value;
  if (!key) continue;
  notificationConfig[key.trim()] = value;
}

const statusEscalationMap = {};
for (const row of statusEscalationRows.filter((r) => !isGuideRow(r))) {
  const status = String(row.Status || row.status || '').trim();
  if (!status || status === 'Status') continue;

  statusEscalationMap[status.toLowerCase()] = {
    status,
    breach: {
      level: 1,
      tier: 'breach',
      afterBreachMin: 0,
      subjectPrefix: pickRowField(row, 'Breach Subject Prefix', 'breachSubjectPrefix') || '[SLA BREACH]',
      toEmails: pickRowField(row, 'Breach To', 'breachTo', 'Breach TO'),
      ccEmails: pickRowField(row, 'Breach CC', 'breachCc', 'Breach Cc'),
      bccEmails: pickRowField(row, 'Breach BCC', 'breachBcc', 'Breach Bcc'),
    },
    l2AfterBreachMin: parseAfterBreachMin(pickRowField(row, 'L2 After Breach Min', 'l2AfterBreachMin')),
    l2: {
      level: 2,
      tier: 'L2',
      subjectPrefix: pickRowField(row, 'L2 Subject Prefix', 'l2SubjectPrefix') || '[ESCALATION L2]',
      toEmails: pickRowField(row, 'L2 To', 'l2To', 'L2 TO'),
      ccEmails: pickRowField(row, 'L2 CC', 'l2Cc', 'L2 Cc'),
      bccEmails: pickRowField(row, 'L2 BCC', 'l2Bcc', 'L2 Bcc'),
    },
    l3AfterBreachMin: parseAfterBreachMin(pickRowField(row, 'L3 After Breach Min', 'l3AfterBreachMin')),
    l3: {
      level: 3,
      tier: 'L3',
      subjectPrefix: pickRowField(row, 'L3 Subject Prefix', 'l3SubjectPrefix') || '[URGENT ESCALATION L3]',
      toEmails: pickRowField(row, 'L3 To', 'l3To', 'L3 TO'),
      ccEmails: pickRowField(row, 'L3 CC', 'l3Cc', 'L3 Cc'),
      bccEmails: pickRowField(row, 'L3 BCC', 'l3Bcc', 'L3 Bcc'),
    },
  };
}

const slaMatrix = slaRows
  .filter(r => r.Status && r.Status !== 'Status' && !isGuideRow(r))
  .map(r => ({
    status: r.Status,
    highest: r.Highest ?? '',
    high: r.High ?? '',
    medium: r.Medium ?? '',
    team: r['Owner Team'] || r.ownerTeam || '',
    slaType: (r['SLA Type'] || r.slaType || 'duration').toLowerCase(),
  }));

const finalStatuses = finalRows
  .filter((r) => !isGuideRow(r))
  .map((r) => r.Status || r.status)
  .filter((s) => s && s !== 'Status' && !isGuideText(s));

const terminalStatuses = slaMatrix
  .filter(r => r.slaType === 'terminal')
  .map(r => r.status);

const noAlertStatuses = [...new Set([...finalStatuses, ...terminalStatuses])];

const trackedSheetKeys = sheetRows
  .map((r) => r['Issue Key'] || r.issueKey)
  .filter((key) => {
    const k = String(key || '').trim();
    return k && k !== 'Issue Key' && !k.startsWith('(GUIDE') && !k.startsWith('TAB GUIDE');
  });

const sheetTicketMap = {};
for (const row of sheetRows) {
  const key = String(row['Issue Key'] || row.issueKey || '').trim();
  if (!key || key === 'Issue Key' || key.startsWith('(GUIDE') || key.startsWith('TAB GUIDE')) continue;
  sheetTicketMap[key] = row;
}

function buildAlertStateEntry(alertKey, issueKey, status, escalationLevel, fields) {
  return {
    alertKey,
    issueKey,
    breachType: fields.breachType ?? null,
    status,
    escalationLevel,
    slaLimitMin: fields.slaLimitMin ?? null,
    thresholdMin: fields.thresholdMin ?? null,
    afterBreachMin: fields.afterBreachMin ?? null,
    firstAlertedAt: fields.firstAlertedAt ?? null,
    lastAlertedAt: fields.lastAlertedAt ?? null,
    sentAt: fields.sentAt ?? null,
    toEmails: fields.toEmails ?? '',
    ccEmails: fields.ccEmails ?? '',
    bccEmails: fields.bccEmails ?? '',
    subject: fields.subject ?? '',
    alertCount: fields.alertCount ?? 1,
    alertStatus: fields.alertStatus || 'active',
  };
}

const alertStateMap = {};

for (const row of pgAlertRows) {
  const alertKey = row.alert_key || row.alertKey;
  const issueKey = row.ticket_key || row.issueKey;
  const status = row.status;
  if (!alertKey || !issueKey || !status) continue;

  const escalationLevel = parseInt(row.escalation_level ?? row.escalationLevel ?? '0', 10) || 1;
  const normalizedKey = `${issueKey}|${String(status).trim().toLowerCase()}|L${escalationLevel}`;

  alertStateMap[normalizedKey] = buildAlertStateEntry(normalizedKey, issueKey, status, escalationLevel, {
    breachType: row.breach_type ?? row.breachType,
    slaLimitMin: row.sla_limit_min ?? row.slaLimitMin,
    thresholdMin: row.threshold_min ?? row.thresholdMin,
    afterBreachMin: row.after_breach_min ?? row.afterBreachMin,
    firstAlertedAt: row.first_alerted_at ?? row.firstAlertedAt,
    lastAlertedAt: row.last_alerted_at ?? row.lastAlertedAt,
    sentAt: row.sent_at ?? row.sentAt,
    toEmails: row.to_emails ?? row.toEmails,
    ccEmails: row.cc_emails ?? row.ccEmails,
    bccEmails: row.bcc_emails ?? row.bccEmails,
    subject: row.subject,
    alertCount: 1,
    alertStatus: row.alert_status ?? row.alertStatus ?? 'active',
  });
}

for (const row of alertRows) {
  if (isGuideRow(row)) continue;

  const issueKey = row['Issue Key'] || row.issueKey;
  let alertKey = row['Alert Key'] || row.alertKey;
  if (!issueKey || !alertKey || alertKey === 'Alert Key' || String(alertKey).startsWith('(GUIDE')) continue;

  const status = row.Status || row.status;
  if (!status) continue;

  let escalationLevel = parseInt(row['Escalation Level'] || row.escalationLevel || '0', 10) || null;
  if (!escalationLevel) {
    escalationLevel = (() => {
      const match = String(alertKey || '').match(/\|L(\d+)$/i);
      if (match) return parseInt(match[1], 10);
      if (String(alertKey || '').includes('|active|')) return 1;
      return 1;
    })();
  }

  alertKey = `${issueKey}|${String(status).trim().toLowerCase()}|L${escalationLevel}`;
  if (alertStateMap[alertKey]) continue;

  alertStateMap[alertKey] = buildAlertStateEntry(alertKey, issueKey, status, escalationLevel, {
    breachType: row['Breach Type'] || row.breachType,
    slaLimitMin: row['SLA Limit Min'] ?? row.slaLimitMin,
    thresholdMin: row['Threshold Min'] ?? row.thresholdMin,
    afterBreachMin: row['After Breach Min'] ?? row.afterBreachMin,
    firstAlertedAt: row['First Alerted At IST'] || row.firstAlertedAt,
    lastAlertedAt: row['Last Alerted At IST'] || row.lastAlertedAt,
    sentAt: row['Sent At IST'] || row.sentAt,
    toEmails: row['To Emails'] || row.toEmails,
    ccEmails: row['CC Emails'] || row.ccEmails,
    bccEmails: row['BCC Emails'] || row.bccEmails,
    subject: row.Subject || row.subject,
    alertCount: parseInt(row['Alert Count'] || row.alertCount || '0', 10),
    alertStatus: row['Alert Status'] || row.alertStatus || 'active',
  });
}

const finalsJql = noAlertStatuses.map(s => `"${s.replace(/"/g, '\\"')}"`).join(', ');
// V6-Support (Jira sidebar) = project key V6SUP on arhata.atlassian.net.
// JIRA IS READ-ONLY: this workflow only searches issues via GET — never creates/updates/deletes Jira data.
let project = String(notificationConfig.jira_project || 'V6SUP').trim();
if (project === 'DEMO' || project === 'V6-Support') project = 'V6SUP';
const updatedDays = parseInt(notificationConfig.jira_updated_days || '14', 10);

const jql = noAlertStatuses.length
  ? `project = "${project}" AND statusCategory != Done AND status NOT IN (${finalsJql}) AND updated >= -${updatedDays}d ORDER BY updated DESC`
  : `project = "${project}" AND statusCategory != Done AND updated >= -${updatedDays}d ORDER BY updated DESC`;

return [{
  json: {
    slaMatrix,
    finalStatuses,
    terminalStatuses,
    noAlertStatuses,
    notificationConfig,
    statusEscalationMap,
    alertStateMap,
    sheetTicketMap,
    trackedSheetKeys,
    jql,
    timezone: notificationConfig.timezone || 'Asia/Kolkata',
    defaultEmails: notificationConfig.default_emails || 'tejasjagdale00@gmail.com, tejas.jagdale@assetcues.com',
    revisedDueDateField: notificationConfig.revised_due_date_field || 'customfield_11455',
    emailTheme: (() => {
      const raw = String(notificationConfig.email_theme || notificationConfig.emailTheme || 'light').trim().toLowerCase();
      if (raw === 'light' || raw === 'l') return 'light';
      if (raw === 'dark' || raw === 'd') return 'dark';
      return 'light';
    })(),
    emailVideoUrl: String(notificationConfig.email_video_url || 'https://d1pj1zqgt7za9d.cloudfront.net/wp-content/uploads/2025/12/22154534/AC-Logo-element-video_1_1_1.webm').trim(),
    emailLogoGifUrl: String(
      notificationConfig.email_logo_gif_url
      || 'https://files.catbox.moe/nqnlnl.gif',
    ).trim(),
    emailLogoUrl: String(notificationConfig.email_logo_url || notificationConfig.email_video_poster_url || 'https://raw.githubusercontent.com/aniketv31/Logo-New/main/AssetCues-Logo.png').trim(),
    emailVideoPosterUrl: String(notificationConfig.email_video_poster_url || 'https://raw.githubusercontent.com/aniketv31/Logo-New/main/AssetCues-Logo.png').trim(),
    jiraHost: String(notificationConfig.jira_host || 'arhata.atlassian.net').replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    jiraProject: project,
    jiraReadOnly: true,
  },
}];
