# Rebuild Automations Module — Flexible Rule Engine

Replace the hardcoded 5-template system with a no-code rule engine where any team member can define triggers, conditions, timing, and WA/email actions.

## Scope

1. Database overhaul (new `automation_rules` schema + `automation_executions`)
2. Migration of the 5 existing templates into rules
3. New Automations page (rules cards + slide-over editor + execution log)
4. Real-time + scheduled execution engine with variable resolution
5. Settings → Automations tab refresh
6. Wire trigger hooks into existing lead/cashflow update paths

---

## 1. Database Migration

**Drop & rebuild:**
- DROP existing `automation_rules` (current schema is incompatible — different columns)
- DROP `automation_templates` and `automation_queue` after data migration
- Keep `automations_log` for backward compat (read-only legacy)

**Create `automation_rules`** with the spec schema: name, description, is_active, trigger_event, trigger_days_before, trigger_inactivity_days, condition_status[], condition_disposition[], condition_platform[], condition_channel[], delay_hours, send_time_window_start/end, wa_enabled, wa_recipient, wa_template_name, wa_message_body, email_enabled, email_recipient, email_subject, email_body, email_format, run_count, last_run_at, created_by, timestamps.

**Create `automation_executions`** with: rule_id, lead_id, trigger_event, channel, recipient_type, recipient_contact, message_preview, status, skip_reason, error_message, scheduled_for, executed_at + indexes on rule_id, lead_id, status, scheduled_for (partial WHERE pending).

**RLS:** authenticated full access on both tables.

**Seed 8 default rules** (the 8 from the spec) via INSERT in the migration. Map old `automation_templates` rows (file_closed, pre_trip_3days, safe_journey, review_request, follow_up_reminder) into equivalent rules so live behavior is preserved.

## 2. Automations Page (`src/pages/Automations.tsx`)

Full rewrite. Layout:

- **Header**: "Automations" + subtitle + "+ New Rule" button (primary)
- **Stats bar** (existing 4 KPIs): Active rules, Sent today, Pending, Failed — sourced from `automation_rules` and `automation_executions`
- **Section A — Rules list**: cards grid, each card with name, colored trigger badge, condition summary string, [WA]/[Email] action badges, recipient label, active toggle (instant), "Ran N times", "Last run X ago", edit (pencil) and delete (trash + confirm) icon buttons
- **Section B — Execution log**: unified table replacing current Queue + Activity. Columns: timestamp, rule name, lead (link), channel badge, recipient, message preview, status, retry/view actions. Filter bar: status / channel / rule / date range. 50 per page.

Empty state for rules: shows "Browse templates" with the 5 example inspiration cards from the spec.

## 3. Rule Editor (slide-over from right)

New component `src/components/automations/RuleEditor.tsx` using shadcn `Sheet`. Sections:

1. **Basics** — name, description, active toggle
2. **Trigger** — event dropdown; conditional inputs for `trigger_days_before` (travel approaching/passed) or `trigger_inactivity_days`
3. **Conditions** — three multi-select dropdowns (status, disposition, platform) using shadcn checkbox-list popover; delay dropdown; two time pickers for send window with helper text
4. **WhatsApp action** — enable toggle; segmented Customer/Agent/Both; AiSensy template name; message textarea with clickable variable chips that insert at cursor; live preview box with dummy data substitution
5. **Email action** — enable toggle; segmented recipient; subject + body inputs with same variable chips; HTML/Plain toggle; "Preview" modal
6. **Test** — "Send test message" button → modal asking for mobile / email → fires immediately with dummy data

Save uses upsert into `automation_rules`.

## 4. Execution Engine

New file `src/services/automationEngine.ts` exporting:

- `evaluateRulesForLead(leadId, triggerEvent, context)` — fetches active rules matching the event, checks condition arrays (null/empty = match-any), creates `automation_executions` rows with `scheduled_for = now() + delay_hours`. If delay = 0 and inside time window → execute immediately.
- `processAutomationQueue()` — replaces existing queueProcessor. Picks pending executions due now, also scans leads matching travel-date / inactivity rules, enforces send window (queues to next slot otherwise), resolves variables, dispatches WA via existing `sendWhatsAppMessage`, dispatches email via configured provider, updates execution row + increments `run_count`/`last_run_at` on the rule.
- `resolveVariables(template, lead, itinerary, agent, settings)` — replaces `{{name}} {{destination}} {{travel_date}} {{agent_name}} {{price}} {{traveller_code}} {{itinerary_name}} {{mobile}} {{email}} {{company_name}} {{platform}} {{days_to_travel}}` with real values, formatting dates as "15 June 2026" and price as "₹29,999".
- `sendTestMessage(rule, mobile|email)` — bypasses queue, uses dummy lead.

**Trigger wiring:**
- `LeadManagement.tsx` / `LeadDetail.tsx` — after status or disposition update, call `evaluateRulesForLead(id, "status_changed" | "disposition_changed")`. After insert (public-site enquiry + manual create), call `evaluateRulesForLead(id, "lead_created")`.
- `TripCashflowEdit.tsx` — when travel dates saved, call `evaluateRulesForLead(lead_id, "travel_dates_set")` so date-based rules can pre-schedule.

**Scheduling:**
- `App.tsx` already initializes the queue processor on app load — switch it to call new `processAutomationQueue` and add `setInterval(..., 15*60*1000)`.
- Old `src/services/queueProcessor.ts` and `src/services/automationTriggers.ts` are deleted (their behavior is now data-driven via the seeded rules).

## 5. Settings → Automations tab

Update `src/pages/Settings.tsx` Automations tab:
- Remove "Template Status" section
- Add "Quick links" → View All Rules / View Execution Log
- Add default send-time window pickers (saved to `automation_settings`)
- Keep AiSensy API key + test connection
- Add email service dropdown (None / Brevo / Mailchimp / Resend / SMTP) with conditional config fields, From email, From name

## 6. Files

**Created**
- `supabase/migrations/<ts>_rebuild_automations.sql`
- `src/services/automationEngine.ts`
- `src/components/automations/RuleEditor.tsx`
- `src/components/automations/RuleCard.tsx`
- `src/components/automations/ExecutionLog.tsx`
- `src/components/automations/VariableChips.tsx`

**Edited**
- `src/pages/Automations.tsx` (full rewrite)
- `src/pages/Settings.tsx` (Automations tab)
- `src/App.tsx` (interval scheduler swap)
- `src/pages/LeadManagement.tsx`, `src/pages/LeadDetail.tsx`, `src/pages/TripCashflowEdit.tsx`, `src/public-site/components/EnquiryForm.tsx` (trigger hooks)
- `src/integrations/supabase/types.ts` (auto-regenerated)

**Deleted**
- `src/services/queueProcessor.ts`
- `src/services/automationTriggers.ts`

## Notes / decisions

- Email sending: use Lovable's built-in transactional email infra (will set up domain + scaffold on first email-enabled rule save). For this build I'll stub the email send call behind `sendEmail()` and wire SMTP/Resend later — confirms WA-only behavior works first.
- Time window enforcement uses Asia/Kolkata (IST) as the canonical timezone (matches existing pre-trip logic).
- "Browse templates" inspiration cards are static JSON in the editor — clicking one prefills the form.
- Old `automations_log` rows are preserved but no longer written to; new history lives in `automation_executions`.

After approval I'll execute in this order: migration → engine → page/editor → settings → trigger wiring → smoke test the 10-point checklist.
