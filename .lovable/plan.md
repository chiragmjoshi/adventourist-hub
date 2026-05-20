## SEO upgrade plan

Grouped into three phases. Phase 1 is shippable now; phases 2–3 are sized to follow once you confirm direction. I won't touch content copy beyond meta/title/H1 — your team writes the real words.

---

### Phase 1 — Quick wins (this turn, ~30 min of edits)

1. **Per-route `<head>` via `react-helmet-async`**
   Today every page ships the same `<title>`, description, canonical, and OG tags from `index.html`. Install `react-helmet-async`, wrap the app once, and add `<Helmet>` blocks to:
   - `SiteHome` — new title/description/H1-supporting copy (see #2)
   - `TripsList`, `TripDetail`, `TravelStories`, `StoryDetail`, `About`, `Contact`, `FAQs`, `Team`, all 4 policy pages
   - Remove the hard-coded `<link rel="canonical">` from `index.html` so it no longer duplicates Helmet's canonical.

2. **Homepage on-page SEO**
   - `<title>`: `Custom Travel Planner in Mumbai | Adventourist`
   - `meta description`: the audit's recommended line.
   - Hero H1: change to `Custom Trips Planned Around You` (keep existing tagline as eyebrow/subtext).
   - Add a keyword-tuned H2 band below the fold ("Custom Travel Planning from Mumbai", "Family Holidays, Honeymoons & Group Trips", etc.) using existing styling.

3. **`/itinerary` page audit**
   There is **no `/itinerary` route** in `src/App.tsx` today — the trip hub is `/trips`. The "+91 9826000000 / No predefined itinerary" page the audit screenshotted is almost certainly a published `/l/:slug` landing page (`LandingPage.tsx`) with bad seed data, OR an old admin-rendered template. I'll grep the DB / landing-page templates for the stray number and the placeholder copy, fix at source, and add a 301 from `/itinerary` → `/trips` in `LegacyRedirects.tsx` just in case.

4. **Schema.org additions in `index.html`**
   - Upgrade the existing `TravelAgency` JSON-LD to also carry `LocalBusiness` `@type` array + `geo` coords.
   - Add `WebSite` schema with `SearchAction` (sitelinks search box).
   - Add `BreadcrumbList` + `FAQPage` schema via Helmet on the FAQs page.
   - Add `Article` schema via Helmet on story detail pages.
   - Add `Product` / `Offer` schema via Helmet on trip detail pages (uses `trip.price_starting_from`, `trip.days_and_nights`).

5. **Sitemap generator**
   `public/sitemap.xml` is hand-edited and missing every trip slug, story slug, and destination. Add `scripts/generate-sitemap.ts` (predev + prebuild) that:
   - Includes all static public routes
   - Queries Supabase for `itineraries WHERE status='published'` → emits `/trips/:slug`
   - Queries `travel_stories WHERE published_at IS NOT NULL` → emits `/travel-stories/:slug`
   - Will include `/destinations/:slug` once those pages exist (phase 2)
   Add `Sitemap: https://www.adventourist.in/sitemap.xml` line to `public/robots.txt`.

6. **Image perf**
   - Audit homepage / hero / destination cards: add explicit `width`/`height` to all `<img>` to kill CLS.
   - Switch hero image preload in `index.html` from an Unsplash URL to a locally optimised WebP in `public/site-images/` (you already have the folder).
   - Add `loading="lazy"` + `decoding="async"` to below-the-fold images (TripDetail gallery, story cards, footer destinations).
   No bundler-level conversion (vite-imagetools) yet — that's phase 3 if Core Web Vitals still need help.

7. **Cross-host duplicate blog** (Cloudflare, not code)
   I can't redirect `blog.adventourist.in` → `www.adventourist.in/travel-stories/...` from React. I'll prepare a **Cloudflare Bulk Redirects CSV** mapping the known old slugs (pulled from the public sitemap if you share access, or I'll inspect what's indexable) and put it in `docs/cloudflare-blog-redirects.csv` with one-page setup instructions. You'll need to upload it in the Cloudflare dashboard.

**Phase-1 deliverable:** every public page has its own title/description/canonical, homepage targets the right keyword, sitemap is comprehensive and regenerates on build, robots advertises it, hero CLS is fixed, schema is broadened, and the stale `/itinerary` placeholder is gone.

---

### Phase 2 — Destination landing pages (separate turn, ~1–2 hrs)

New route + page template `/destinations/:slug` rendered by a new `DestinationPage.tsx`. Data already lives in the `destinations` table; I'll add the fields the page needs if missing:
- `seo_title`, `seo_description`, `hero_image`, `intro_md`, `best_time_to_visit`, `ideal_duration`, `who_it_is_for`, `sample_itinerary_md`, `price_starting_from`, `inclusions_md`, `exclusions_md`, `faqs jsonb`

Page structure follows the audit's spec (intro → best time → duration → suitable for → sample itinerary → starting price → inclusions/exclusions → FAQs → reviews from that destination → WhatsApp CTA → internal links to related trips + stories). Each page ships:
- per-route Helmet (title/meta/canonical/OG)
- `TravelAgency` + `Place` + `FAQPage` + `BreadcrumbList` JSON-LD
- Sitemap entry

Add an admin editor `/admin/db/destinations/:id/seo` so your team can fill the SEO fields without code changes.

Also build one **city-targeted page**: `/travel-agency-mumbai` with the spec from the audit.

**Confirm before I start phase 2:** Bali, Leh Ladakh, Thailand, Vietnam, Singapore, Seychelles, Rajasthan, Europe — same 8 as the audit, or different list?

---

### Phase 3 — Content + perf hardening (later, content-team-led)

- Rewrite old story slugs: drop "2023" from URLs, add a 301 rule for each renamed slug in `LegacyRedirects.tsx`.
- Merge thin Ladakh posts into pillar pages.
- Install `vite-imagetools`, convert hero + destination cards to AVIF/WebP at build, drop Unsplash hot-linking.
- Add WebP versions of every gallery image to Storage and update the schema to store `image_webp_url`.
- Real Core Web Vitals pass (browser perf profile on Home, Trips list, top 2 trip pages, top 3 stories) and fix anything red.

This phase needs your content team's input on what to merge/rewrite; I'd only ship the technical scaffolding.

---

### Out of scope (named explicitly)

- Writing the actual destination/blog copy — your team owns voice.
- Cloudflare DNS, bulk redirect upload, and the apex→www redirect rule (only Cloudflare can do these).
- Google Search Console property addition (already covered by the prior `gsc:gsc` flow — verify after next publish).
- Google Business Profile, backlink outreach, Instagram cross-linking — these are off-platform.

---

### What I need from you before starting phase 1

1. **Go-ahead on the homepage H1 change** (`Custom Trips Planned Around You`) vs your current `Travel Designed For You`. I can keep the old tagline as a smaller eyebrow above it.
2. **Confirm the bad "+91 9826000000 / No predefined itinerary" page is a published Landing Page**, not the trips hub — if you have the URL handy, paste it; otherwise I'll grep.
3. **Confirm `https://www.adventourist.in` is the canonical host** (vs `adventourist.in` or `adventourist-zenith.lovable.app`). Audit assumes www-with-https.

Once you reply with these three, I'll ship phase 1 in the next turn.
