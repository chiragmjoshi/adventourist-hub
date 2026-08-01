## Context

The audit's three biggest findings (duplicate metadata, "Loading…" titles, missing schema) all share one root cause: the site is a client-rendered SPA. The metadata and structured data already exist in the code — `TripDetail` emits `TouristTrip` + `BreadcrumbList`, `TripsList`/`TravelStories` emit `ItemList` + `BreadcrumbList`, and every page sets a self-referencing canonical via the `SEO` component. None of it is in the HTML a crawler receives before JavaScript runs.

So this pass makes the served HTML correct, rather than re-adding things that are already there.

## 1. Build-time prerendering (the main fix)

Add a post-build prerender step that runs the app in headless Chromium and writes real static HTML for each public route.

- New `scripts/prerender.ts`, run after `vite build`, serving `dist/` locally.
- Route list comes from the same source the sitemap generator already uses, so the two stay in sync automatically (currently 194 URLs: home, `/trips`, `/trips/:slug`, `/destinations`, `/destinations/:slug`, `/travel-stories`, `/travel-stories/:slug`, `/travel-agency-mumbai`, about, contact, team, FAQs, policies).
- For each route: load, wait until the page's real title has resolved (not `Loading…`), then snapshot `document.documentElement.outerHTML` to `dist/<path>/index.html`.
- A hard `MAX_PRERENDER_PAGES` cap (default 500) guards against the page count growing past publish limits; anything beyond the cap still works as a normal client-rendered route and stays in the sitemap.
- Guard rails: fail the build if any snapshot still contains `Loading…` in the title or is missing a canonical, so a regression can't ship silently.

Result: every route serves its own title, description, canonical, H1, and JSON-LD in the initial HTML — for Googlebot, social preview bots, and AI crawlers alike. Content is refreshed on each publish.

Trip pages also get a small change so the initial render isn't a "Loading…" shell: the `SEO` tag for the loading state will carry the slug-derived title instead of the literal `Loading… — Adventourist`, so even non-prerendered navigation never exposes that string.

SSR via TanStack Start remains the eventual answer for always-fresh server rendering; that's a separate follow-up, not this pass.

## 2. Soft-404 signals (app-side)

The SPA always returns HTTP 200, so a true 404 status needs edge config — out of scope per your call. App-side:

- `src/pages/NotFound.tsx` and the site-facing not-found states get an explicit `noindex, nofollow` (the `SEO` component already rewrites the static `index.html` robots tag when `noIndex` is set — I'll confirm every not-found path routes through it).
- Legacy `/travel-blog/*` paths that resolve to nothing land on a noindexed not-found rather than a 200 indexable page.
- Prerender skips not-found routes entirely, so no soft-404 HTML gets written to `dist/`.

## 3. Images

- Convert the remaining 19 JPG + 3 PNG in `public/site-images` (~27 MB) and the 14 raster files in `src/assets` to WebP, keeping originals as fallbacks where a component needs them.
- Update the components referencing them to use `<picture>`/`srcSet` with the WebP first.
- Add missing `alt` text on the one homepage image lacking it and sweep the trips/destinations grids.

## 4. Homepage meta description

Trim the `index.html` description (and the homepage `SEO` call) from ~180 to ~150–155 characters so it isn't truncated in the SERP.

## Technical notes

- Prerendering runs in the build pipeline only; dev is unchanged.
- `scripts/generate-sitemap.ts` gets a small refactor to export its route list so `prerender.ts` can import it — one source of truth, no duplicated route logic.
- Verification: build, then grep the emitted HTML for per-route titles, canonicals and JSON-LD; confirm no `Loading…` and no duplicate canonical tags.

## Not included

- Real HTTP 404/410 status codes (needs Cloudflare/edge rules).
- The TanStack Start SSR migration.
- Search Console account actions (still blocked on a connection for the account that owns `adventourist.in`).
