## Goal
1. Fix the broken Rajasthan image in the Home hero carousel.
2. Replace every "250+ / Happy Clients / Families Trust Us" reference across the site with copy based on the founding year (2018 → "Since 2018" / "8 Years of Crafting Trips").

## 1. Fix broken Rajasthan image
In `src/site/sections/HeroSection.tsx`, swap the Rajasthan Unsplash URL (currently `photo-1477587458883-47145ed31dfe` which is returning broken) for a reliable Rajasthan/Jaisalmer-Jaipur photo, e.g.:
`https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80` (Hawa Mahal, Jaipur).

## 2. Replace "250+" copy site-wide
New unified messaging:
- **Stat number** → `Since 2018` (or `8 Yrs`)
- **Stat label** → `Crafting Journeys` / `Of Bespoke Travel`

File-by-file changes:

| File | Current | New |
|---|---|---|
| `src/site/sections/HeroSection.tsx` (eyebrow pill) | `250+ Families Trust Us` | `Crafting Journeys Since 2018` |
| `src/site/sections/HeroTrustStrip.tsx` | `250+ / Families Travelled` | `Since 2018 / Crafting Journeys` |
| `src/site/sections/WhatsAppCTABanner.tsx` | `250+ families planned their trip` | `Crafting bespoke trips since 2018` |
| `src/site/sections/TestimonialsSection.tsx` | `250+ / Happy Travellers` | `Since 2018 / Designing Trips` |
| `src/site/pages/About.tsx` (3 spots: stat, intro paragraph, meta description, CTA line) | `250+ families` references | Rephrase to "since 2018" / "8 years of designing bespoke travel" |
| `src/site/pages/Contact.tsx` (stats list) | `250+ / Happy Clients` | `Since 2018 / Crafting Journeys` |
| `src/pages/Login.tsx` | `250+` badge | `Since 2018` |
| `public/llms.txt` | `250+ trips` in tagline | `crafting journeys since 2018` |

Other site copy (hero headline, CTAs, "Why Families Choose Us", testimonials text) stays untouched.

## Out of scope
- No layout, color, or component structure changes.
- No DB / backend edits.
