## Goal

Bring the Home page in line with the reference screenshots from `new.adventourist.in`, fix layout bugs (overlapping text, broken images, color drift), wire all itinerary/destination data to the CMS API, add proper SEO/schema, and ensure every lead captured from the website is tagged so it's filterable in CMS Lead Management.

---

## 1. Hero Section — match reference exactly

Issues today: rotating destination card has empty/broken image (no `width/height` on `<img>`), floating "From ₹45,000" badge clips outside the card, "Talk to a Travel Expert" pill isn't horizon-yellow with WhatsApp green icon, scroll cue uses two `hidden` classes (Tailwind conflict).

Fixes:
- Replace bare `<img>` tags missing dimensions with `w-full h-full object-cover` so images actually render.
- Move the "✈ From ₹45,000" badge to top-left of the image card (matches reference), "⚡ 2hr Response" stays bottom-right, both inside the card bounds on lg.
- Restyle the secondary CTA as a horizon-yellow outlined pill with the WhatsApp glyph (reference uses subtle yellow border).
- Headline: keep three-line stack ("Travel" / "Designed" italic blaze / "For You.") but tighten line-height to `0.92` and ensure responsive font scales down on mobile (clamp 2.75rem min).
- Trust-badge row stays under a divider — add proper `gap-x-8 gap-y-4` so 4 stats don't wrap awkwardly.
- Fix scroll cue: replace `hidden lg:flex` collision.

## 2. Featured Itineraries ("Our Picks For You") — wire to CMS, fix card

Issues today: cards show a grey gradient because the image has no dimensions; "WhatsApp" button uses an emoji instead of the icon; tags are hardcoded to destination name only.

Fixes:
- Make the trip card image a true `aspect-[4/5]` block with `<img class="w-full h-full object-cover">`.
- Card layout to mirror reference: image fills top ~70%, gradient overlay, title + duration overlaid; below, a single muted destination chip (`Rajasthan`, `Himachal Pradesh`), `FROM ₹xx,xxx /person` price block, then two equal-width buttons: black "View Trip →" and green "💬 WhatsApp" (use proper WhatsApp SVG, not emoji).
- Bind to live CMS itineraries via `getItineraries()` already in place; show top 6, sorted by `pricing_per_person` ascending or by API-returned order.
- WhatsApp deep link must include the trip slug + title + page source so the lead can be traced back: `wa.me/91...?text=Hi! I'm interested in {title} ({slug}) from the website`.
- Below the 6-card grid, add the horizontal destination filter pill row visible in reference (All Trips · Bali · Leh Ladakh · Thailand · …) sourced from `getMasterData().destinations` — clicking jumps to `/trips?destination=...`.

## 3. Destinations Grid ("Explore Destinations")

Reference shows a 3-column bento with one tall hero tile (Bali) on the left spanning 2 rows, and 5 smaller tiles on the right (Leh Ladakh, Thailand, Sri Lanka, Singapore, More).

Fixes:
- Pull destinations from CMS `getMasterData().destinations` already wired; map first 5 + "More" tile.
- Use destination's first picture from CMS, fallback to local images.
- Use real itinerary counts (group itineraries by `destination.id` from the same `getItineraries` call already fetched on Home).
- Larger overlaid label sizing on the hero tile (text-4xl), matching the reference.

## 4. How It Works — fix dashed connector

The horizontal dashed line currently sits behind step circles using a magic-number left/right offset. Replace with a clean `flex` row where the dashes are a separate full-width track between the icons, vertically centered on the circle midpoint. No content overlap.

## 5. Brand Values ("We plan trips like a trusted friend would.")

Reference uses 4 cream cards on a cream background (`#EEE5D5`) with a soft dashed border. Currently it uses cream cards on a white background — change the section background to cream so cards visually nest.

Match icon tile colors exactly (Personalised = blaze, Expert = lagoon teal, Transparent = abyss, With You = horizon yellow) and keep the soft emoji glyphs.

## 6. Testimonials — fix marquee + alignment

Issues: cards have inconsistent padding, name/destination text crops mid-line on small cards, marquee duplicate items don't seamlessly loop on smaller viewports.

Fixes:
- Fixed card width `w-[340px]` with `min-h-[280px]`.
- Quote glyph in blaze tint, 5 horizon stars, body line-clamped to 4 lines, footer = circle avatar + name + destination, never overlapping.
- Stats row underneath stays as-is.

## 7. Travel Stories

Already very close to reference — only fixes:
- Featured (left) image was rendering empty: add `w-full h-full object-cover`.
- Right column cards: 3 horizontal cards with thumbnail left, content right (matches reference exactly), category in horizon-yellow uppercase.

## 8. WhatsApp CTA Banner ("250+ families…")

Matches reference closely. Just confirm:
- Background `#FF6F4C` with topographic overlay.
- Black pill button with green WhatsApp icon. Sub-copy in white/75.

## 9. Footer

Already close to reference. Add the social icons (Instagram, Facebook), confirm copy is `© 2026 Adventourist. Crafted with ❤ for explorers everywhere.` and right-side `Mumbai, Maharashtra, India`.

---

## 10. SEO / Schema / Tags

Upgrade `SiteLayout.tsx` from a 2-tag setter to a full SEO head manager (no extra deps — direct `document.head` mutation, idempotent):
- `<title>` — page-specific.
- `<meta name="description">` — page-specific, ≤160 chars.
- `<meta name="keywords">` — destination/trip names where relevant.
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`.
- Twitter: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- `<link rel="canonical">` per route.
- JSON-LD `<script type="application/ld+json">` injected per page:
  - Home: `Organization` + `WebSite` + `TravelAgency` (name, url, logo, sameAs Instagram/Facebook, contactPoint with phone & WhatsApp, address Mumbai).
  - Trip detail: `TouristTrip` (already exists; verify).
  - FAQs page: `FAQPage`.
- Update `index.html` with sane defaults for OG/Twitter so social previews work even on first load.
- Single H1 per page (Hero), all other section titles H2.
- Add descriptive `alt` text on every image (currently several are empty `alt=""`).
- Lazy-load below-fold images with `loading="lazy"` and `decoding="async"`.

Home-page meta:
- Title: `Adventourist — Travel Designed For You | Premium Trips from Mumbai` (≤60 chars target — trim if needed).
- Description: `Premium experiential travel from Mumbai. Personalised itineraries to Bali, Ladakh, Thailand, Sri Lanka & more. Zero booking fees. 4.8★ on Google.`

---

## 11. Lead tagging — every public form lands in CMS Lead Management with traceable source

The CMS `leads` table is shared. Today `useLeadCapture` already sets `channel='website'` and `platform=page_source`. Tighten so every entry point passes a distinct `page_source`, and store extra metadata in `notes` so the CMS Lead Management screen can filter/route them:

| Form / CTA                              | page_source value           |
|-----------------------------------------|-----------------------------|
| Hero "Plan My Trip"                     | `home_hero`                 |
| HomepageModal (auto-popup)              | `home_modal`                |
| PlanTripModal (footer/banner CTA)       | `plan_trip_modal`           |
| Featured trip card "WhatsApp"           | `home_trip_card_{slug}`     |
| Trip detail enquiry form                | `trip_detail_{slug}`        |
| Contact page form                       | `contact_page`              |
| WhatsApp FAB (deep link)                | `whatsapp_fab`              |

For WhatsApp deep links there is no form submission — instead, every WhatsApp link will pass `?text=...` containing a trackable token like `[src:home_hero]` so the inbound message is identifiable in chat (and the existing AISensy integration can parse it).

Also store the trip context on lead `notes` when the visitor came from a specific itinerary card so sales sees "Interested in: Bali Break (5D/4N) — ₹57,000" automatically.

---

## 12. Verification

- Visually compare each section against the 9 reference screenshots after build.
- Open `/` on desktop and mobile preview, confirm no overlapping text and all images render.
- Submit each form once and verify a row appears in `leads` with the correct `platform` value.
- View source on `/` and confirm the JSON-LD `Organization` block is present, `og:image` resolves, and there's exactly one `<h1>`.

---

## Out of scope for this pass

- Any other public page (Trips list, Trip detail, About, Contact, FAQs, Stories, Team, Policy) — they'll be polished in a follow-up.
- Backend schema changes — we're using the existing `leads` columns.
- Auto-popup modal timing tuning beyond what's already there.

---

## Files I'll touch

- `src/site/SiteLayout.tsx` — full SEO/JSON-LD manager
- `src/site/sections/HeroSection.tsx`
- `src/site/sections/BrandValues.tsx`
- `src/site/sections/DestinationsGrid.tsx`
- `src/site/sections/HowItWorks.tsx`
- `src/site/sections/FeaturedItineraries.tsx` (+ new destination filter strip)
- `src/site/sections/TestimonialsSection.tsx`
- `src/site/sections/TravelStoriesSection.tsx`
- `src/site/sections/WhatsAppCTABanner.tsx`
- `src/site/layout/Footer.tsx` (small social-icon fix)
- `src/site/hooks/useLeadCapture.ts` (richer tagging)
- `src/site/sections/HomepageModal.tsx`, `PlanTripModal.tsx`, `components/contact/ContactForm.tsx` (pass distinct `page_source`)
- `src/site/lib/utils.ts` `waLink()` — accept `source` + trip context, embed `[src:...]` token
- `src/site/pages/Home.tsx` — pass itinerary list down to DestinationsGrid for real counts
- `index.html` — default OG/Twitter meta + favicon
