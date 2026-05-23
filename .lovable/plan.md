## Goal
Wrap every outgoing automation email in an Adventourist-branded HTML shell, without touching any existing rule content, the WhatsApp path, or the SMTP transport. Plain-text bodies get auto-converted to paragraphs so all 23 existing rules render correctly with zero edits.

## Step 1 — Branded shell helper
Create `src/lib/emailShell.ts` exporting `wrapInBrandShell({ heroTitle, heroSubtitle?, bodyHtml, agentName?, ctaUrl?, ctaLabel?, accentColor? })` → full `<html>…</html>` string.

- Auto-detect: if `bodyHtml` has no `<p`, `<br`, `<div`, `<table`, escape HTML and convert `\n\n` → paragraphs / single `\n` → `<br>`.
- Brand tokens inline (Blaze `#FF6F4C`, Horizon `#FDC436`, Abyss `#1A1D2E`, Lagoon `#64CBB9`, Ridge `#056147`, Drift `#EEE5D5`).
- `<head>`: Google Fonts `@import` for Inter Tight + Jost, plus a `<style>` with `@media (max-width:600px)` mobile rules.
- 600px table-based layout: Drift outer bg → white rounded card → Abyss header (logo left, "TRAVEL DESIGNED FOR YOU" right) → accent hero (title 36/28px, subtitle) → white body → optional CTA button → Drift divider → optional signature → Abyss footer (address, phone, email, site, GST/PAN, copyright).
- Logo: `https://cms2.adventourist.in/storage/brand/logo-horizontal-white.png`.

## Step 2 — Wrap at the SMTP boundary (both send paths)
Two real call sites both build `html` then invoke `send-email`:

1. `src/services/automationEngine.ts` — runtime sends (line ~149) and `sendTestEmail` (line ~334).
2. `supabase/functions/process-automations/index.ts` — cron-driven sends (line ~167).

Wrap at each site right before `supabase.functions.invoke("send-email", { body: { html: … } })`, using:
```
const heroTitle = rule.email_hero_title ? resolveVariables(rule.email_hero_title, ctx) : (rule.name || "From Adventourist");
const heroSubtitle = rule.email_hero_subtitle ? resolveVariables(rule.email_hero_subtitle, ctx) : undefined;
const ctaUrl   = rule.email_cta_url   || "https://wa.me/919930400694";
const ctaLabel = rule.email_cta_label || "Message us on WhatsApp →";
const brandedHtml = wrapInBrandShell({ heroTitle, heroSubtitle, bodyHtml: html, agentName: ctx.agent?.name, ctaUrl, ctaLabel, accentColor: "blaze" });
```
Pass `brandedHtml` to `send-email` instead of the raw resolved body. `send-email` itself is **not** modified — it still receives `html` and hands it to nodemailer.

Because the Edge Function `process-automations` cannot import from `src/`, port the helper to `supabase/functions/_shared/emailShell.ts` (identical TS, Deno-friendly imports — no external deps needed) and import from there inside the function. The browser code imports from `@/lib/emailShell`.

Variable resolution, recipient picking, scheduling, retries, dedupe, and logging are all untouched.

## Step 3 — Optional per-rule columns
Migration:
```sql
ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS email_hero_title text,
  ADD COLUMN IF NOT EXISTS email_hero_subtitle text,
  ADD COLUMN IF NOT EXISTS email_cta_url text,
  ADD COLUMN IF NOT EXISTS email_cta_label text;
```
No backfill, no row updates. `src/integrations/supabase/types.ts` regenerates automatically.

## Step 4 — RuleEditor UI
In `src/components/automations/RuleEditor.tsx`:

- Inside the Email action section, under Body, add a collapsed **"Branded shell options (optional)"** accordion with 4 fields (Hero title, Hero subtitle, CTA URL, CTA label). Wire to form state + save payload. Add `VariableChips` to hero title and hero subtitle (placeholders signal the defaults).
- Email preview Dialog: when `email_format` is `html` or `plain`, render the full `wrapInBrandShell(...)` output inside `<iframe srcDoc={fullHtml} width={600} height={720} style={{ border: "1px solid #e5e5e5", borderRadius: 8 }} />`. Plain-text rules visibly become branded paragraphs here.

## Acceptance
1. `/automations` still lists all 23 rules unchanged.
2. Any existing email rule sends with: Abyss header + logo + tagline, Blaze hero with rule name, original body as styled paragraphs, Adventourist footer with address + GST.
3. The plain-text "Pre-Trip — 3 Days Before" body renders inside the shell; DB row untouched.
4. Preview shows the real branded email in an iframe.
5. Filling the accordion (e.g. Hero title `3 days to {{destination}}`) and saving causes that rule's next send to use the custom hero.

## Explicitly NOT doing
No UPDATEs on `automation_rules`; no edits to `wa_message_body` / `email_body` / `email_subject`; no reseeding; no WhatsApp/AiSensy changes; no SMTP transport changes; no variable-resolver / scheduler / logger changes; no column removals or renames; no new "Send Test" button.