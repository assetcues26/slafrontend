const row = $input.item.json;
const sentAt = new Date().toISOString();

if (row.action === 'send' && !row._emailSent) {
  return {
    json: {
      'Alert Key': '',
      _skipAlertStateWrite: true,
      _skipReason: 'Gmail send failed — reconnect Gmail credential in n8n',
    },
  };
}

return {
  json: {
    'Alert Key': row.breachId,
    'Issue Key': row.issueKey,
    'Breach Type': row.activeBreach?.breachType || row.breachType || '',
    Status: row.breachStatus || row.status || '',
    'Escalation Level': String(row.escalationLevel ?? ''),
    'SLA Limit Min': String(row.breachSlaLimitMin ?? row.slaLimitMin ?? ''),
    'Threshold Min': String(row.thresholdMin ?? ''),
    'After Breach Min': String(row.afterBreachMin ?? ''),
    'First Alerted At IST': row.firstAlertedAt || sentAt,
    'Last Alerted At IST': sentAt,
    'Sent At IST': sentAt,
    'To Emails': row.sendTo || '',
    'CC Emails': row.sendCc || '',
    'BCC Emails': row.sendBcc || '',
    Subject: row.subjectLine || '',
    'Alert Count': String(row.alertCount || 1),
    'Alert Status': row.alertStatus || 'active',
  },
};
