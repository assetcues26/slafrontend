CREATE TABLE IF NOT EXISTS alert_sent_log (
  alert_key        TEXT PRIMARY KEY,
  ticket_key       TEXT NOT NULL,
  status           TEXT NOT NULL,
  escalation_level SMALLINT NOT NULL,
  alert_status     TEXT NOT NULL DEFAULT 'active',
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  to_emails        TEXT,
  cc_emails        TEXT,
  bcc_emails       TEXT,
  subject          TEXT,
  breach_type      TEXT,
  sla_limit_min    INTEGER,
  threshold_min    INTEGER,
  after_breach_min INTEGER,
  first_alerted_at TIMESTAMPTZ,
  last_alerted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_sent_ticket ON alert_sent_log(ticket_key);

CREATE INDEX IF NOT EXISTS idx_alert_sent_active
  ON alert_sent_log(ticket_key, status, escalation_level)
  WHERE alert_status = 'active';
