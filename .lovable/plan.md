# Automation end-to-end fix

## What I found

I traced the full automation flow (rule editor → engine → queue → dispatch). The WhatsApp path is wired up, but **emails are not actually sending** and **time-based rules don't fire reliably**. Three concrete defects:

### 1. Email channel is stubbed out
In `src/services/automationEngine.ts`:
- `dispatchExecution` (line 148-153) — for `channel === "email"` it hard-codes `success = false; errorMessage = "Email transport not configured"`. Every email rule is logged as **failed** the moment it runs.
- `sendTestMessage` (line 318) — returns the same hard-coded error, so the **"Send Test Email"** button inside the rule editor has never worked. (This matches the toast the user just saw: *"Test failed: Email transport not configured"*.)

The SMTP credentials saved in **Settings → Email** are only used by the standalone `send-test-email` edge function (the button on the Settings page). The automation engine never calls it.

### 2. No server-side queue runner
`processAutomationQueue` runs **in the browser** every 15 minutes (`src/App.tsx:126-127`). If no admin tab is open at the right time, rules with `delay_hours > 0`, `travel_date_approaching`, and `travel_date_passed` (the pre-trip reminder, "safe journey", "hope you had a great time", review request) never get picked up. This is the wrong place for a scheduler.

### 3. Test panel uses one input for both phone and email
Minor UX bug: the "Send Test" field in the rule editor accepts any string. The screen replay shows the user typed a mobile number while testing the email channel. Worth validating per channel.

## Plan

### Step 1 — Create a real `send-email` edge function
- New `supabase/functions/send-email/index.ts` modelled on `send-test-email`:
  - Loads SMTP settings from `automation_settings` via service role.
  - Accepts `{ to, subject, html, text? }`.
  - JWT-protected (`verify_jwt = true`, default) — only called from the engine or the cron runner using the user/service session.
  - Returns `{ success, messageId }` or `{ error }`.
- Reuses the same `nodemailer` + STARTTLS/SSL logic already proven by the Settings test button.

### Step 2 — Wire the engine to it
In `src/services/automationEngine.ts`:
- Replace the stub in `dispatchExecution` for `channel === "email"`:
  - Resolve `rule.email_subject` and `rule.email_body` through `resolveVariables`.
  - `supabase.functions.invoke("send-email", { body: { to: recipientContact, subject, html: body } })`.
  - Map response → `success` / `errorMessage`, keep the existing `automation_executions` update path.
- Replace `sendTestMessage` email branch the same way so the rule editor's **"Send Test Email"** button works.

### Step 3 — Server-side queue runner (cron)
- New `supabase/functions/process-automations/index.ts` that contains the logic currently in `processAutomationQueue` (pending dispatch + travel-date sweep), but uses the service-role client so it works without any user session.
- Schedule it every 5 minutes via `pg_cron` + `pg_net` (one-time SQL insert through `supabase--insert`, not a migration, since it embeds the project URL + anon key).
- Keep the client-side call in `App.tsx` for instant feedback when an admin is logged in, but it's no longer the only runner.

### Step 4 — Small fixes around the test flow
- In `RuleEditor`, validate the "Send Test" input based on the selected channel (email regex vs phone format) before invoking.
- Pre-fill it with the logged-in user's email when channel = email.

### Step 5 — End-to-end verification
After deploying, I'll:
1. Curl `send-email` directly with the agent's email → confirm SMTP delivery.
2. Use the rule editor's "Send Test Email" on the existing **Pre-trip reminder**, **Safe journey**, **Welcome back**, and **Review request** rules → all four should arrive in inbox.
3. Insert a fake `trip_cashflow` row with `travel_start_date` matching each date-trigger rule, invoke `process-automations` via curl, and verify rows land in `automation_executions` with `status = 'sent'`.
4. Check the Automations page log table — failed/sent counts should reflect the runs.

## Technical notes

- No schema changes. `automation_rules` already has `email_subject`, `email_body`, `email_recipient`, `email_enabled`.
- The four reminder-style rules the user described (pre-trip, safe journey, hope you had a great time, review request) are pure HTML emails with merge fields like `{{name}}`, `{{destination}}`, `{{travel_date}}`, `{{review_link}}` — all already supported by `resolveVariables`. No commitments/quotes/pricing involved, just messaging, so this stays squarely in transactional/reminder territory.
- Keeping the custom SMTP path the user already configured rather than switching to Lovable Emails, since the credentials and "From" identity are already in Settings.
