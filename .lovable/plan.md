# Add Resend email integration

Give the app a second email channel (Resend) alongside the existing SMTP setup, usable as the primary sender or as an automatic backup when SMTP fails.

## What the user gets

**Settings → Integrations**: a new "Email (Resend)" card next to the SMTP card showing Connected / Not Connected, emails sent today / this month, and a Configure link.

**Settings → Automations → Email section**: a new "Email provider" control with three options:
- SMTP only (current behaviour)
- Resend only
- SMTP with Resend fallback (recommended) — if SMTP errors, the same email is retried through Resend automatically

Plus a "From name" / "From address" reused for both, and a "Send Test Email" button that reports which provider actually delivered the message.

## Setup / credentials

Resend is available as a built-in connector, so no manual key pasting: connecting it links the Resend credentials to the project and the backend uses them. If you'd rather use your own Resend API key directly, that also works — say so and I'll request it as a secret instead.

The From address must be on a domain verified in your Resend account (e.g. `notify@adventourist.in`) for delivery to real customers.

## Technical changes

1. **`supabase/functions/send-email/index.ts`** — refactor into two senders:
   - `sendViaSmtp()` (existing nodemailer path, unchanged)
   - `sendViaResend()` (POST to the Resend gateway `/emails` with from/to/subject/html/text)
   - dispatcher reads `email_provider` from `automation_settings` and applies the chosen order, with fallback on failure; response returns `{ success, provider, messageId, attempts }`.
2. **`automation_settings`** — new keys via existing settings rows (no schema change): `email_provider`, `resend_from_address`. No migration required since the table is key/value; only the client-side `validKeys` allowlist in `Settings.tsx` is extended.
3. **`src/pages/Settings.tsx`** — add the provider selector in the Automations tab, extend `validKeys`, add the Resend integration card, and surface the returned provider in the test-email toast.
4. **`supabase/functions/send-test-email/index.ts`** — pass through / display provider used.
5. `process-automations` and `automationEngine` need no changes — they already call `send-email`, which now handles provider selection and fallback internally.
6. Deploy the updated edge functions.

## Not included

No bulk/marketing sending, no template changes — the existing Adventourist branded shell keeps wrapping every automation email regardless of provider.
