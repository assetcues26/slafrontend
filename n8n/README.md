# n8n assets

Workflow exports and Code node scripts for **Jira SLA Tracker - V6-Support (arhata)** (`PVpN907j3OMXFQFk` on n8n.tracknmanage.com).

## Workflows

| File | Description |
|------|-------------|
| `workflows/Jira Production Analytics Pipeline v17.json` | Production analytics + SLA tracking pipeline |

## Scripts

Copy these into the matching n8n Code nodes (live workflow is updated via n8n MCP; keep this repo in sync):

| Script | Use in |
|--------|--------|
| `format_live_ticket.js` | Format Live Ticket node (Production Analytics workflow) |
| `n8n-v6-Calculate_Status_Flow_Times.js` | V6-Support: SLA time calculation |
| `n8n-v6-Extract_Issues_from_Response.js` | V6-Support: Jira response parsing |
| `n8n-v6-Merge_Config.js` | V6-Support: merge SLA matrix + alert state (Sheet + Supabase) |
| `n8n-v6-Format_for_Google_Sheets.js` | V6-Support: Sheets output |
| `n8n-v6-Decide_Alert_Action.js` | V6-Support: SLA breach / L1–L3 escalation decisions |
| `n8n-v6-Restore_Alert_Payload.js` | V6-Support: restore alert fields after Gmail send |
| `n8n-v6-Prepare_Alert_State_Write.js` | V6-Support: format Alert_State sheet + audit fields |
| `n8n-v6-Map_Ticket_for_Supabase.js` | V6-Support: map ticket fields for Postgres upsert |
| `n8n-v6-Map_Status_History_Rows.js` | V6-Support: map status flow → `status_history` rows |

## Alert dedupe

- Alert keys: `{ticketKey}|{status}|L{1|2|3}` (e.g. `V6SUP-870|bug (tech rca)|L1`)
- **Supabase** `alert_sent_log` is source of truth; **Google Sheet** `Alert_State` tab is backup
- Slack branch removed — email only
