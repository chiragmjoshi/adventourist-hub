## Goal
Every automation runs on email only. WhatsApp is switched off across rules, code paths and UI, and WA-only rules are converted into email rules.

## Current state (verified)
- `automation_rules` has 24 rules. 14 are WhatsApp-only (`wa_enabled = true`, `email_enabled = false`, empty `email_subject`/`email_body`) — they would send nothing if simply activated.
- 8 rules are inactive today; some are duplicates of newer rules (e.g. "Pre-trip reminder — 3 days before" vs "Pre-Trip — 3 Days Before", "Review request — day after return" vs "Review Request — Day 3", "New lead — agent alert" vs "New Lead — Agent Alert").
- Server runner (`process-automations`) already skips WhatsApp; the client engine (`automationEngine.ts`) still dispatches via AiSensy.
- Email dispatch already wraps content in the Adventourist branded shell.

## Plan

### 1. Data migration: WA → Email
For every rule:
- Set `email_enabled = true`, `wa_enabled = false`.
- Where `email_body` is empty, populate it from `wa_message_body` (converted to paragraph text, variables like `{{name}}` preserved). Where no WA body exists either, write a short on-brand body matching the rule's purpose.
- Where `email_subject` is empty, write a brand-appropriate subject per rule.
- Carry `wa_recipient` into `email_recipient` for WA-only rules (customer / agent / both), so agent alerts stay agent alerts.
- Clear `wa_template_name` so AiSensy templates aren't referenced.

### 2. Deduplicate before activating
Retain the newer, richer rule of each duplicate pair and leave the legacy twin inactive, so activation does not double-send. Rules with no duplicate (e.g. "Quote Sent — Follow-up", "Inactive — 7 Day Check-in") get email content and are activated.

### 3. Activate
Set `is_active = true` on the retained rule set (all except the deduplicated legacy twins).

### 4. Code changes
- `src/services/automationEngine.ts`: remove the WhatsApp branch and the AiSensy import; queue/dispatch email only; `sendTestMessage` becomes email-only.
- `supabase/functions/process-automations/index.ts`: drop the WhatsApp channel entry entirely instead of skipping it (no more "WhatsApp dispatch handled by client" rows in the log).
- Leave `src/services/aisensy.ts` in place but unused, so WA can be re-enabled later.

### 5. UI changes
- `RuleEditor.tsx`: remove the WhatsApp action section and WA test channel; email becomes the only channel.
- `Automations.tsx`: drop the "WA →" badge and the WhatsApp option in the channel filter.
- Default email CTA label changes from "Message us on WhatsApp →" to a neutral "Plan your trip →".

### 6. Deploy & verify
Deploy `process-automations`, then confirm each active rule has a non-empty subject and body and that a test send renders correctly in the branded shell.

## Note
Existing queued `automation_executions` rows with `channel = 'whatsapp'` will be marked skipped so they don't sit pending forever.
