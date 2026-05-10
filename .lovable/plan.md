# Cinematic Hero Redesign — Tourvia-style

Reimagine the home hero as a **full-viewport, immersive image-led stage** (like tourvia.framer.website) while staying 100% on-brand with Adventourist's Blaze / Horizon / Abyss / Lagoon palette and Inter typography.

## What Tourvia does well (and we'll borrow)
- Full-bleed hero photograph filling the viewport
- Massive translucent wordmark sitting *behind* the subject (depth illusion)
- Minimal nav floating on top, no card-clutter
- One eyebrow chip + one bold headline + one pill CTA, bottom-left
- Smooth, theatrical — feels like a magazine cover, not a landing page

## Our take — "Adventourist Cinematic"

```text
┌─────────────────────────────────────────────────────┐
│  [logo]            nav nav nav nav        [Plan ▸] │  ← floating nav, transparent
│                                                     │
│                                                     │
│        A D V E N T O U R I S T                      │  ← huge translucent wordmark,
│        ░░░░░░░░░░░░░░░░░░░░░░░░░                    │     drift-cream @ 8-15% opacity
│                                                     │
│              [ hero destination photo ]             │  ← cycles Bali / Ladakh /
│              fills viewport, subtle Ken-Burns       │     Phu Quoc / Singapore
│                                                     │
│                                                     │
│  ── Welcome to Adventourist                         │  ← pill chip, glass effect
│                                                     │
│  Travel Designed                                    │  ← clamp(3rem, 7vw, 6.5rem)
│  For You.                                           │     "Designed" in Blaze italic
│                                                     │
│  [ Plan My Trip  ⤴ ]   [ ◉ Talk to Expert ]        │  ← Blaze pill + glass pill
│                                                     │
│  Bali · Indonesia          ●○○○  scroll ↓           │  ← active dest label + dots
└─────────────────────────────────────────────────────┘
```

## Key design moves

1. **Full-bleed stage** — `min-h-[92vh]`, hero image absolutely positioned, covers everything. Replaces the current split 58/42 layout.
2. **Giant translucent wordmark** — "ADVENTOURIST" in Inter Tight Black at ~18vw, color `drift` (cream) at 10-15% opacity, positioned behind the photo subject for that magazine depth effect. Hidden on mobile (replaced by smaller mark).
3. **Cinematic image carousel** — keep our 4 destinations (Ladakh, Bali, Singapore, Dubai) cycling every 6s with slow Ken-Burns zoom + crossfade. Bottom gradient `from-abyss/80 via-abyss/30 to-abyss/10` for text legibility.
4. **Content stack, bottom-left** — eyebrow pill (glass: `bg-white/10 backdrop-blur border border-white/30`), then 2-line headline, supporting line, then CTA pair.
5. **Headline** — keeps our existing copy "Travel Designed For You." White text, "Designed" rendered in Blaze (`#FF6F4C`) italic for the brand pop.
6. **CTAs** — primary Blaze pill ("Plan My Trip" with arrow), secondary glass pill ("Talk to a Travel Expert" with WhatsApp icon).
7. **Bottom strip** — left: active destination name + region (animated). Right: progress dots + a subtle "scroll" cue.
8. **Trust strip relocated** — the 250+ / 4.8★ / 50+ / ₹0 stats move *out* of the hero into a slim band immediately below it (dark `abyss` band with horizon accents) — keeps the hero clean and lets the stats still appear above the fold.
9. **Navbar** — overlay mode on home (transparent over hero, white logo), turns solid on scroll. Existing Navbar already supports this pattern; we just toggle the home variant.

## Brand guardrails (non-negotiable)
- Colors: Blaze `#FF6F4C`, Horizon `#FDC436`, Abyss `#1A1D2E`, Lagoon `#64CBB9`, Drift `#EEE5D5` only
- Typography: Inter Tight (display) + Jost (body) — already in tailwind config
- No serifs, no stock-blue gradients, no generic glassmorphism overload
- Italic Blaze accent on "Designed" stays — it's our signature

## Files to touch
- `src/site/sections/HeroSection.tsx` — full rewrite of layout
- `src/site/layout/Navbar.tsx` — minor: ensure transparent-on-home / solid-on-scroll
- New `src/site/sections/HeroTrustStrip.tsx` — extracted stats band
- `src/site/pages/Home.tsx` — insert `<HeroTrustStrip />` between Hero and BrandValues

No backend, no schema, no API changes. Pure presentation.

## Out of scope (ask if you want them)
- Replacing hero photos with new commissioned shots
- Adding a video background instead of stills
- Search bar overlay (Tourvia doesn't have one either)
