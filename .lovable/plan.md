## What this list actually shows

Grouping the 150 URLs by cause:

| Group | Count | Cause | Fixable in app? |
|---|---|---|---|
| `/travel-blog/*` post, category, page, `/feed`, `/1000`, `?utm_source=rss` | ~130 | Old WordPress blog paths. App-side rules for these shipped in Aug 2026; every crawl date here is **Jan–May 2026**, i.e. before the fix | Mostly already fixed — but 6 real gaps remain (below) |
| `/itinerary/Bhutan-Itinerary-for-8-Days`, `Spiti-Valley-Itinerary-6-Days`, `kashmir-trip-itinerary`, `Srilanka-Maldives-Itinerary-7-Nights` | 4 | Already in the itinerary map; crawled Mar–Apr 2026, before the fix | Already fixed |
| `uat.`, `cms.`, `blog.` subdomains | 4 | Separate hosts | No — DNS/Cloudflare |
| `/_next/static/media/*.woff2`, `/cdn-cgi/l/email-protection` | 2 | Artifacts of the old Next.js build and Cloudflare's email obfuscation | No — harmless, ignore |

So the bulk is stale. But verification against the live `travel_stories` table found **real mapping bugs that still 404 today**.

## Confirmed bugs (verified against the database)

1. `STORY_MAP` sends `/story/camping-tips` → `/travel-stories/27-camping-tips`. The database slug is `camping-tips` — `27-camping-tips` does not exist. This redirect currently lands on a 404.
2. Six legacy blog slugs have no matching story row, so `/travel-blog/:slug` forwards them to a dead story page:
   - `interesting-facts-about-leh-ladakh`
   - `things-to-do-in-jodhpur-rajasthan`
   - `6-reasons-to-visit-himachal-pradesh`
   - `27-camping-tips`
   - `vacations-in-the-valleys-of-bhutan`
   - `things-to-do-in-udaipur`
3. URLs with a double slash before the suffix (`/travel-blog/leh-ladakh-road-trip//1000`, `/things-to-do-in-maldives//1000`) — roughly 15 URLs in this list — do not match the current React Router patterns, because the empty path segment breaks the `:slug` match.
4. Any unmapped legacy blog slug forwards blindly to `/travel-stories/<slug>`, producing a fresh soft-404 instead of a useful landing.

## Plan

**1. Fix the broken slug maps** (`src/routes/LegacyRedirects.tsx`)
- Correct `camping-tips` → `camping-tips` (drop the `27-` prefix).
- Add a `BLOG_SLUG_MAP` for the six orphans, pointing each at the closest live story:
  `interesting-facts-about-leh-ladakh` → `interesting-facts-about-ladakh`;
  `things-to-do-in-jodhpur-rajasthan` → `places-to-visit-in-jodhpur`;
  `6-reasons-to-visit-himachal-pradesh` → `must-visit-places-in-himachal-pradesh`;
  `27-camping-tips` → `camping-tips`;
  `vacations-in-the-valleys-of-bhutan` → `visit-thimphu-in-bhutan`;
  `things-to-do-in-udaipur` → `best-things-to-do-in-udaipur`.

**2. Handle the malformed URL shapes**
- Add a path pre-normaliser (extend the existing `UrlNormaliser`) that collapses repeated slashes and strips trailing `/1000`, `/feed`, `/amp` **before** the router matches, so `//1000` variants resolve like their clean counterparts.

**3. Stop generating new soft-404s**
- Change the legacy blog redirect from "forward blindly" to "verify first": look the slug up against the live story list; on a miss, send the visitor to `/travel-stories` rather than a dead story URL.

**4. Regenerate the Cloudflare 301 list**
- Rebuild `adventourist-redirects.csv` to include every URL in this report — both `adventourist.in` and `www.` variants, all `/travel-blog/*` shapes, the `?utm_source=rss` versions and the `/1000` and `//1000` tails — mapped to their final destinations. Client-side redirects return HTTP 200 and Google treats them as soft redirects; only the Cloudflare rules give real 301s that clear these from Search Console.

**5. Verify**
- Drive the browser over a sample of ~20 URLs from this exact report (including the double-slash and `/story/camping-tips` cases) and confirm each ends on a live page with `index, follow`, not on a `noindex` 404.

## Still requires your action outside the app

- Remove `uat.adventourist.in`, `cms.adventourist.in` and `blog.adventourist.in` from public DNS, or 301 them to `www`.
- Upload the regenerated redirect CSV to Cloudflare Bulk Redirects.
- The `/_next/*` font and `/cdn-cgi/l/email-protection` entries need no action — Google drops them once the old host stops serving links.
