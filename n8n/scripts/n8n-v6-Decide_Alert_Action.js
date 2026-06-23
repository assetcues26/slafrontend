const config = $('Merge Config').first().json;
const alertStateMap = { ...(config.alertStateMap || {}) };
const statusEscalationMap = config.statusEscalationMap || {};
const emailTheme = config.emailTheme || 'light';
const emailVideoUrl = config.emailVideoUrl || '';
const emailLogoGifUrl = config.emailLogoGifUrl || '';
const emailVideoPosterUrl = config.emailVideoPosterUrl || '';
const emailLogoUrl = config.emailLogoUrl || '';
const jiraHost = config.jiraHost || 'arhata.atlassian.net';
const baselineEmails = ['tejasjagdale00@gmail.com', 'tejas.jagdale@assetcues.com'];
const configEmails = (config.defaultEmails || '').split(',').map((e) => e.trim()).filter(Boolean);
const defaultEmails = [...new Set([...baselineEmails, ...configEmails])];
const noAlertStatuses = config.noAlertStatuses || config.finalStatuses || [];

const DEFAULT_BREACH_TIER = {
  level: 1,
  tier: 'breach',
  afterBreachMin: 0,
  subjectPrefix: '[SLA BREACH]',
  toEmails: '',
  ccEmails: '',
  bccEmails: '',
};

const DEFAULT_L2_TIER = {
  level: 2,
  tier: 'L2',
  subjectPrefix: '[ESCALATION L2]',
  toEmails: '',
  ccEmails: '',
  bccEmails: '',
};

const DEFAULT_L3_TIER = {
  level: 3,
  tier: 'L3',
  subjectPrefix: '[URGENT ESCALATION L3]',
  toEmails: '',
  ccEmails: '',
  bccEmails: '',
};

function isNoAlertStatus(statusName) {
  const s = (statusName || '').trim().toLowerCase();
  if (!s) return false;
  if (noAlertStatuses.some((x) => (x || '').trim().toLowerCase() === s)) return true;
  const rule = (config.slaMatrix || []).find(
    (r) => r.status === statusName || r.status.toLowerCase() === s,
  );
  return rule?.slaType === 'terminal' || rule?.slaType === 'none';
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function getTierAlertKey(issueKey, status, level) {
  return `${issueKey}|${normalizeStatus(status)}|L${level}`;
}

function parseEmails(value) {
  return String(value || '')
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function getSentLevels(issueKey, status) {
  const normStatus = normalizeStatus(status);
  const sent = new Set();

  for (const level of [1, 2, 3]) {
    const key = getTierAlertKey(issueKey, status, level);
    const direct = alertStateMap[key];
    if (direct && String(direct.alertStatus || '').toLowerCase() === 'active') {
      sent.add(level);
      continue;
    }

    for (const row of Object.values(alertStateMap)) {
      if (row.issueKey !== issueKey) continue;
      if (normalizeStatus(row.status) !== normStatus) continue;
      const rowLevel = row.escalationLevel || inferLevelFromKey(row.alertKey);
      if (rowLevel !== level) continue;
      if (String(row.alertStatus || '').toLowerCase() === 'active') {
        sent.add(level);
      }
    }
  }

  return [...sent];
}

function inferLevelFromKey(alertKey) {
  const match = String(alertKey || '').match(/\|L(\d+)$/i);
  if (match) return parseInt(match[1], 10);
  if (String(alertKey || '').includes('|active|')) return 1;
  return null;
}

function getStatusEscalation(status) {
  const cfg = statusEscalationMap[normalizeStatus(status)];
  if (cfg) return cfg;

  return {
    status,
    breach: { ...DEFAULT_BREACH_TIER },
    l2AfterBreachMin: null,
    l2: { ...DEFAULT_L2_TIER },
    l3AfterBreachMin: null,
    l3: { ...DEFAULT_L3_TIER },
  };
}

function buildTierList(statusCfg, slaType) {
  const tiers = [{ ...statusCfg.breach, afterBreachMin: 0 }];

  if (slaType !== 'duedate') {
    if (statusCfg.l2AfterBreachMin > 0) {
      tiers.push({ ...statusCfg.l2, afterBreachMin: statusCfg.l2AfterBreachMin });
    }
    if (statusCfg.l3AfterBreachMin > 0) {
      tiers.push({ ...statusCfg.l3, afterBreachMin: statusCfg.l3AfterBreachMin });
    }
  }

  return tiers.sort((a, b) => a.level - b.level);
}

function computeEligibleLevel(breach, ticket, sentLevels) {
  const slaType = breach.slaType || ticket.slaType;
  const slaLimitMin = breach.slaLimitMin ?? ticket.slaLimitMin;
  const timeInStatusMin = ticket.currentStatusDurationMin ?? breach.durationMin ?? 0;

  if (breach.breachType === 'historical') return null;

  const statusCfg = getStatusEscalation(breach.status);
  const tiers = buildTierList(statusCfg, slaType);

  for (const tier of tiers) {
    if (sentLevels.includes(tier.level)) continue;

    if (slaType === 'duedate') {
      if (tier.level === 1) return { ...tier, thresholdMin: null };
      continue;
    }

    if (!slaLimitMin || slaLimitMin <= 0) continue;
    const thresholdMin = slaLimitMin + tier.afterBreachMin;
    if (timeInStatusMin >= thresholdMin) {
      return { ...tier, thresholdMin };
    }
  }

  return null;
}

function buildRecipients(tier, assigneeEmail) {
  const to = new Set();
  const cc = new Set();

  if (assigneeEmail) to.add(assigneeEmail);

  const levelTo = parseEmails(tier.toEmails);
  const levelCc = parseEmails(tier.ccEmails);
  const levelBcc = parseEmails(tier.bccEmails);
  const hasTierRecipients = levelTo.length > 0 || levelCc.length > 0 || levelBcc.length > 0;

  levelTo.forEach((e) => to.add(e));
  // Put escalation CC contacts in TO as well — Gmail/n8n often drops CC-only delivery.
  levelCc.forEach((e) => to.add(e));

  if (!hasTierRecipients) {
    defaultEmails.forEach((e) => to.add(e));
  }

  if (to.size === 0) {
    defaultEmails.forEach((e) => to.add(e));
  }

  levelCc.forEach((e) => cc.add(e));

  return {
    sendTo: [...to].join(', '),
    sendCc: [...cc].join(', '),
    sendBcc: levelBcc.join(', '),
  };
}

function buildSubject(tier, ticket, breach) {
  const prefix = tier.subjectPrefix || '[SLA BREACH]';
  const limit = breach.slaLimitMin ?? ticket.slaLimitMin ?? 'N/A';
  const dur = ticket.currentStatusDurationMin ?? breach.durationMin ?? 0;
  const status = breach.status || ticket.currentStatus;

  if (tier.level === 1) {
    return `${prefix} ${ticket.issueKey} — ${status} exceeded ${limit} min`;
  }

  const after = tier.afterBreachMin ?? 0;
  if (tier.level === 2) {
    return `${prefix} ${ticket.issueKey} — ${status} at ${dur} min (${after} min after breach)`;
  }

  return `${prefix} ${ticket.issueKey} — ${status} at ${dur} min (${after} min after breach) — immediate action required`;
}

function alertTypeForLevel(level) {
  if (level === 2) return 'ESCALATION_L2';
  if (level === 3) return 'ESCALATION_L3';
  return 'BREACH';
}

function pickPrimaryBreach(breaches) {
  const rank = { current: 0, duedate: 1, historical: 2 };
  return [...breaches].sort((a, b) => (rank[a.breachType] ?? 9) - (rank[b.breachType] ?? 9))[0];
}

const ticketItems = $('Calculate Status Flow Times').all();
const outputs = [];
const activeTicketState = new Map();

for (const ticketItem of ticketItems) {
  const ticket = ticketItem.json;
  const breached = ticket.allBreaches?.length > 0 && !isNoAlertStatus(ticket.currentStatus);
  activeTicketState.set(ticket.issueKey, {
    status: ticket.currentStatus,
    breached,
  });

  if (!ticket.allBreaches || ticket.allBreaches.length === 0) continue;
  if (isNoAlertStatus(ticket.currentStatus)) continue;

  const breach = pickPrimaryBreach(ticket.allBreaches);
  if (breach.breachType === 'historical') continue;

  const sentLevels = getSentLevels(ticket.issueKey, breach.status);
  const eligible = computeEligibleLevel(breach, ticket, sentLevels);

  if (!eligible) {
    outputs.push({
      json: {
        ...ticket,
        activeBreach: breach,
        action: 'skip',
        skipReason: sentLevels.length ? 'tier already sent or threshold not met' : 'threshold not met',
      },
    });
    continue;
  }

  const alertKey = getTierAlertKey(ticket.issueKey, breach.status, eligible.level);
  const nowIso = new Date().toISOString();
  const recipients = buildRecipients(eligible, ticket.assigneeEmail);
  const alertType = alertTypeForLevel(eligible.level);
  const thresholdMin = eligible.thresholdMin ?? (breach.slaLimitMin ?? ticket.slaLimitMin);

  alertStateMap[alertKey] = {
    alertKey,
    issueKey: ticket.issueKey,
    breachType: breach.breachType,
    status: breach.status,
    escalationLevel: eligible.level,
    slaLimitMin: breach.slaLimitMin,
    thresholdMin,
    afterBreachMin: eligible.afterBreachMin ?? 0,
    firstAlertedAt: nowIso,
    lastAlertedAt: nowIso,
    alertCount: 1,
    alertStatus: 'active',
  };

  outputs.push({
    json: {
      ...ticket,
      activeBreach: breach,
      action: 'send',
      alertType,
      alertCount: 1,
      escalationLevel: eligible.level,
      escalationTier: eligible.tier,
      thresholdMin,
      afterBreachMin: eligible.afterBreachMin ?? 0,
      firstAlertedAt: nowIso,
      lastAlertedAt: null,
      skipReason: '',
      subjectLine: buildSubject(eligible, ticket, breach),
      sendTo: recipients.sendTo,
      sendCc: recipients.sendCc,
      sendBcc: recipients.sendBcc,
      tierToEmails: eligible.toEmails || '',
      tierCcEmails: eligible.ccEmails || '',
      tierBccEmails: eligible.bccEmails || '',
      breachId: alertKey,
      breachStatus: breach.status,
      breachReason: breach.breachReason,
      breachDurationMin: breach.durationMin,
      breachSlaLimitMin: breach.slaLimitMin,
      alertStatus: 'active',
      emailTheme,
      emailVideoUrl,
      emailLogoGifUrl,
      emailVideoPosterUrl,
      emailLogoUrl,
      jiraHost,
    },
  });
}

function inferMissingTicketOutcome(issueKey, config) {
  const sheetRow = config.sheetTicketMap?.[issueKey] || {};
  const lastStatus = sheetRow['Current Status'] || sheetRow.currentStatus || '';
  const finals = [...(config.finalStatuses || []), ...(config.terminalStatuses || [])];
  const isFinal = finals.some((name) => normalizeStatus(name) === normalizeStatus(lastStatus));
  if (isFinal) {
    return {
      alertStatus: 'closed',
      action: 'close',
      closeReason: 'Ticket reached final/closed status — no further tracking',
    };
  }
  return {
    alertStatus: 'deleted',
    action: 'close',
    closeReason: 'Ticket deleted or removed from Jira — no further tracking',
  };
}

for (const [alertKey, row] of Object.entries(alertStateMap)) {
  if (String(row.alertStatus || '').toLowerCase() !== 'active') continue;

  const ticketInfo = activeTicketState.get(row.issueKey);
  const isMissingFromJira = !ticketInfo;
  const shouldResolve = isMissingFromJira
    || normalizeStatus(ticketInfo.status) !== normalizeStatus(row.status)
    || !ticketInfo.breached;

  if (!shouldResolve) continue;

  const missingOutcome = isMissingFromJira ? inferMissingTicketOutcome(row.issueKey, config) : null;
  const alertStatus = missingOutcome?.alertStatus || 'resolved';
  const action = missingOutcome?.action || 'resolve';
  const closeReason = missingOutcome?.closeReason || 'Status changed or breach cleared';

  alertStateMap[alertKey] = { ...row, alertStatus };
  outputs.push({
    json: {
      action,
      breachId: alertKey,
      issueKey: row.issueKey,
      breachType: row.breachType,
      breachStatus: row.status,
      status: row.status,
      escalationLevel: row.escalationLevel,
      breachSlaLimitMin: row.slaLimitMin,
      thresholdMin: row.thresholdMin,
      afterBreachMin: row.afterBreachMin,
      firstAlertedAt: row.firstAlertedAt,
      lastAlertedAt: row.lastAlertedAt,
      alertCount: row.alertCount || 1,
      alertStatus,
      closeReason,
      activeBreach: {
        breachType: row.breachType,
        status: row.status,
      },
    },
  });
}

return outputs.length ? outputs : [{ json: { action: 'skip', skipReason: 'no breaches or resolutions' } }];
