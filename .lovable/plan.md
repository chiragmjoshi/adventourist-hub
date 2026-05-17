## Goal
Seed 14 automation rules into `automation_rules` table, all active, default IST window 09:00–21:00 unless rule specifies otherwise.

## Schema mapping
Columns used: `name`, `trigger_event`, `trigger_days_before`, `trigger_inactivity_days`, `delay_hours`, `condition_status`, `condition_disposition`, `send_time_window_start`, `send_time_window_end`, `is_active=true`, `wa_enabled`, `wa_recipient`, `wa_message_body`, `wa_template_name` (null), `email_enabled`, `email_recipient`, `email_subject`, `email_body`, `email_format='html'`.

## Trigger event normalization
- `lead_created`, `status_changed`, `disposition_changed`, `travel_date_approaching`, `travel_date_passed`, `inactivity_days` — all already supported by automation engine pattern.

## Rule 14 special handling
The schema stores one channel-recipient pair per rule (single `wa_recipient`). Rule 14 has both customer + agent WA messages → split into **two rows**: `"Inactive — 7 Day Check-in (Customer)"` and `"Inactive — 7 Day Check-in (Agent)"`. Total inserted rows = **15**.

## Pre-seed cleanup
Delete any existing rule whose `name` matches the 15 names being inserted, to keep the operation idempotent (no duplicates if re-run).

## Execution
1. Single `supabase--insert` call:
   - `DELETE FROM automation_rules WHERE name IN (...15 names...)`
   - `INSERT INTO automation_rules (...) VALUES (...15 rows...)`
2. Verify with `supabase--read_query`:
   - Count = 15, all `is_active = true`
   - Group by `trigger_event` to confirm distribution
   - Group by `wa_enabled`, `email_enabled` flags

## Verification checklist (post-seed)
- 15 rows present, all active
- Rules with email content: 1, 3, 4, 8, 10, 11, 12 (7 emails)
- Agent-recipient rules: 2, 6, 14b (3 agent rules)
- Time windows set on rules 8, 9, 10, 11, 12 (and default 09:00–21:00 on others)

Hand back a one-line pass/fail summary after verification.