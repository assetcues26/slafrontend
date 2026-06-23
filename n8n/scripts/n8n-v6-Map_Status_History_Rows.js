const formatDate = (isoStr) => {
  if (!isoStr || typeof isoStr !== 'string' || !isoStr.includes('T')) return isoStr;
  const [date, fullTime] = isoStr.split('T');
  return `${date} ${fullTime.split('.')[0]}`;
};

const outputs = [];
for (const item of $('Calculate Status Flow Times').all()) {
  const t = item.json;
  if (!t.issueKey || !Array.isArray(t.detailedStatusFlow)) continue;

  for (const step of t.detailedStatusFlow) {
    if (!step || step.toStatus === 'CURRENT') continue;
    const endTime = step.endTime || step.statusChangeTime;
    if (!endTime || typeof endTime !== 'string') continue;

    outputs.push({
      json: {
        history_id: `${t.issueKey}_${endTime}`.trim(),
        timestamp: formatDate(new Date().toISOString()),
        ticket_key: t.issueKey,
        old_status: step.fromStatus || '',
        new_status: step.toStatus || '',
        updated_time: formatDate(endTime),
        assignee: step.changedBy || '',
        duration: step.durationMin ?? 0,
      },
    });
  }
}

return outputs;
