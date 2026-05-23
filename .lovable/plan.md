## Goal
Redesign the Adventourist branded email shell to a cinematic, editorial, homepage-grade layout and stop admin rule names from leaking into customer hero titles. No DB, RuleEditor, transport, or scheduler changes.

## Files touched
1. `src/lib/emailShell.ts` — full rewrite of `wrapInBrandShell` (new signature, new layout).
2. `supabase/functions/_shared/emailShell.ts` — port of the same shell, Deno-compatible (identical output, no Node APIs).
3. `src/services/automationEngine.ts` — change two heroTitle fallback lines (live send + test send) from `rule.name || "From Adventourist"` to `"A note from <em>Adventourist</em>"`.
4. `supabase/functions/process-automations/index.ts` — same one-line fallback change.

No other files. RuleEditor preview iframe auto-reflects the new shell.

## New `wrapInBrandShell` signature
```ts
wrapInBrandShell(opts: {
  heroTitle: string;            // supports <em>word</em> → Blaze italic
  heroEyebrow?: string;         // default "TRAVEL DESIGNED FOR YOU", em-dash prefixed automatically
  heroSubtitle?: string;
  heroImage?: string;           // default cinematic photo URL
  heroAccent?: "blaze"|"horizon"|"lagoon"|"ridge";  // gradient tint, default "blaze"
  bodyHtml: string;             // plain text auto-paragraphed (unchanged rule)
  primaryCtaUrl?: string;
  primaryCtaLabel?: string;
  secondaryCtaUrl?: string;     // optional outlined ghost CTA
  secondaryCtaLabel?: string;
  agentName?: string;
  agentRole?: string;           // default "Your travel expert"
  featureCardEyebrow?: string;  // optional magazine card
  featureCardTitle?: string;    // supports <em> accent too
  featureCardUrl?: string;
}): string
```
All existing call sites keep working (every new field optional; old `ctaUrl/ctaLabel` mapped — see compat note below).

### Backwards-compat for current call sites
Current callers pass `{ heroTitle, heroSubtitle, bodyHtml, agentName, ctaUrl, ctaLabel, accentColor }`. To avoid touching them:
- Accept legacy `ctaUrl`/`ctaLabel` and map to `primaryCtaUrl`/`primaryCtaLabel`.
- Accept legacy `accentColor` and map to `heroAccent`.
- Type signature exposes the new names; legacy names kept as optional aliases for one release.

## Layout (top → bottom)
- Outer wrap: Drift `#EEE5D5`, 32px 16px padding, 640px centered card.
- Container: white, radius 24px, shadow `0 8px 32px rgba(26,29,46,0.10)`, `overflow:hidden`.
- 4-color top stripe (6px): Blaze / Horizon / Lagoon / Ridge — equal cells.
- Header band (Abyss, 22px 36px): left wordmark/logo `<img>`, right `heroEyebrow` (Inter Tight 600, 11px, 0.14em, Horizon, uppercase) or default tagline.
- Cinematic hero:
  - `<td background="…" bgcolor="#1A1D2E">` with Outlook VML `<v:rect>` fallback.
  - Inline `linear-gradient(180deg, accent-tint 0%, rgba(26,29,46,0.85) 100%)` overlay.
  - Padding 64px 48px desktop, 40px 28px mobile.
  - Eyebrow row: Inter Tight 600, 11px, 0.18em, uppercase, `rgba(255,255,255,.85)`, prefixed `— `.
  - Headline: Inter Tight 800, 44px (32px mobile), tracking `-0.025em`, white. `<em>` segments replaced with `<em style="font-style:italic;color:#FF6F4C;">…</em>`. `<br>` honored.
  - Subtitle: Jost 500, 17px (15px mobile), `rgba(255,255,255,.82)`, max-width 460px.
  - Watermark row: bottom-right "ADVENTOURIST", Inter Tight 900, 14px, 0.3em, `rgba(253,196,54,0.55)`.
- Body block: white, 44px 48px 16px (32px 28px mobile), Jost 400, 16px/26, Abyss. Auto-paragraph rule unchanged (split on `\n\s*\n`, single `\n` → `<br>`).
- Dual CTA row (only if `primaryCtaUrl` + `primaryCtaLabel`):
  - Primary (left): bg Blaze, radius 14, padding 16/28, Inter Tight 700 14px white. Auto-append ` →` if label lacks arrow.
  - Secondary (right, if set): transparent bg, 1.5px Abyss border, radius 14, Inter Tight 700 14px Abyss. Auto-prefix `💬 ` when URL contains `wa.me`/`whatsapp`.
  - Mobile: `.stack` class → block, 100% width, 10px bottom margin.
- Soft divider (1px Drift, 32px wide) — only when `agentName` set.
- Signature block (only if `agentName`): "Warmly," + name (Inter Tight 700) + role line (Jost, muted).
- Optional feature card (Abyss band, 36px 48px) when `featureCardEyebrow` AND `featureCardTitle` set; wrap with `<a>` if `featureCardUrl`. Title supports `<em>` accent. Trailing `→` glyph in Horizon.
- Footer (Abyss, 36px 48px 32px): Horizon wordmark + 32px Horizon-25% rule, address, contact row separated by ` · ` with `tel:`/`mailto:`/`https:` links, legal lines (GST, ©).
- Final 4-color stripe at the very bottom (mirrors top).

## Hero `<em>` parser
Whitelist: only allow `<em>…</em>` to be replaced with the Blaze-italic span; escape everything else. Implementation:
1. Replace `<em>(.*?)</em>` markers with a sentinel token list.
2. HTML-escape remainder.
3. Re-insert tokens as `<em style="font-style:italic;color:#FF6F4C;">escaped(content)</em>`.
4. Preserve literal `<br>` (case-insensitive).

Same parser reused for `featureCardTitle`.

## Accent tints (`heroAccent` → gradient top stop)
- blaze: `rgba(255,111,76,0)` → `rgba(26,29,46,0.85)`
- horizon: `rgba(253,196,54,0)` → `rgba(26,29,46,0.85)`
- lagoon: `rgba(100,203,185,0)` → `rgba(26,29,46,0.85)`
- ridge: `rgba(5,97,71,0)` → `rgba(26,29,46,0.85)`

## Defaults
- `heroEyebrow` → `TRAVEL DESIGNED FOR YOU`
- `heroImage` → `https://cms2.adventourist.in/storage/brand/email-hero-default.jpg`
- `heroAccent` → `blaze`
- `agentRole` → `Your travel expert`

## Responsive `<style>` (head)
```css
@media screen and (max-width:600px) {
  .container { width:100% !important; border-radius:16px !important; }
  .px-48 { padding-left:28px !important; padding-right:28px !important; }
  .hero-h1 { font-size:32px !important; line-height:1.08 !important; }
  .hero-eyebrow { font-size:10px !important; }
  .hero-pad { padding:40px 28px !important; }
  .stack { display:block !important; width:100% !important; margin-bottom:10px !important; }
  .feature-title { font-size:22px !important; }
}
```

## heroTitle fallback fix (3 spots — same change)
- `src/services/automationEngine.ts:153` (live send)
- `src/services/automationEngine.ts:354` (test send)
- `supabase/functions/process-automations/index.ts:171` (cron send)

Replace the `: (rule.name || "From Adventourist")` branch with:
```ts
: "A note from <em>Adventourist</em>"
```
No other engine logic changes. Variable resolver, transport, scheduler all untouched.

## Verification
- Read updated files; check `process-automations` Edge Function logs after redeploy.
- Confirm existing callers still compile (legacy `ctaUrl/ctaLabel/accentColor` aliases retained).
- Spot-check render via the RuleEditor preview iframe (no code change there).
- Send Test on a rule with no `email_hero_title` → hero reads "A note from *Adventourist*" with Blaze italic.
- Send Test on a rule with `email_hero_title = "Your <em>Ladakh</em> journey is days away."` → "Ladakh" Blaze italic, rest white.

## Out of scope
DB migrations, RuleEditor UI, WhatsApp path, AiSensy, scheduler, variable resolver, edge transport.
