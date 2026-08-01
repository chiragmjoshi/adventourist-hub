## What the list actually shows

I bucketed all ~200 URLs. They are not one problem — they are four, and only two are fixable inside this app.

| Bucket | Count (approx) | Where it's fixed |
|---|---|---|
| `staging.` / `cms.` / `uat.` subdomain URLs | ~65 | DNS / hosting — not this codebase |
| `blog.adventourist.in` (mostly `/feed/`, `/tag/*/feed/`) | ~75 | DNS / Cloudflare — not this codebase |
| `www.adventourist.in` legacy WP paths (`/travel-blog/*`, `/itinerary?destination=NN`, root trip slugs, `/feed/`) | ~40 | This app + Cloudflare 301s |
| Real, current pages not indexed (`/destinations/nepal`, `/travel-stories/things-to-do-in-beautiful-spiti-valley/`, `/trips/awesome-australia-...`) | ~8 | This app — quality signals |

Important: "Crawled – currently not indexed" is not an error state. Google fetched the page and chose not to index it. For the junk hosts that is the correct outcome and we simply want them to stop being crawled at all. For the real pages it is a quality/authority signal.

## Verified findings

- All 63 published stories average ~10.7k characters of HTML — content is **not** thin. The non-indexing of real story pages is a crawl-budget and internal-linking problem, not a word-count problem.
- **All 37 active destinations have an empty `seo_description`**, and 12 of 82 published trips have none. 37 of 63 stories have no `seo_title`, 28 no `seo_description`.
- Destination IDs in the database are UUIDs. The legacy `/itinerary?destination=20..55` numeric IDs have **no mapping** to current destinations — they can only go to `/trips`.
- `src/routes/LegacyRedirects.tsx` already covers `/travel-blog/*`, `/tag/*`, `/category/*`, `/author/*`, `/feed`, root trip slugs and the `/1000` and `/feed` suffixes. Gaps remain (below).
- `index.html` ships a `WebSite` `SearchAction` pointing at `/trips?destination={search_term_string}` — the same pattern that produced the crawled `blog.adventourist.in/search/{search_term_string}/` URL. It advertises a URL template that resolves to nothing useful.

## Plan

### 1. Close the remaining redirect gaps in the app

In `src/routes/LegacyRedirects.tsx`:
- `/itinerary/:slug` currently dumps unmapped slugs on `/trips`. Add the observed legacy slugs to `ITINERARY_MAP`: `rajasthan-Itinerary` → Rajasthan trip, `kenya-safari` → `big-five-kenya-safari-7-nights-8-days`, `Andaman-Itinerary-6-Days` → `andaman-nicobar-islands-5-nights-6-days`, `Kasol-Kheerganaga-Itinerary` and `Manali-Dalhousie-Amritsar-Itinerary-` → their nearest live trips. Slug matching is already case-insensitive.
- Route `/feedback-suggestions` (crawled on three hosts) to `/contact` instead of the 404 view.
- Add `/travel-stories/:slug/feed` and `/travel-stories/:slug/1000` explicitly, so the redirect happens during routing rather than only via the post-render URL cleaner.
- Add `/search/*` → `/trips` so any inherited WP search URL resolves.

### 2. Stop advertising a search URL template

Remove the `potentialAction` / `SearchAction` block from the `WebSite` JSON-LD in `index.html`. The site has no `?q=` search endpoint, so the template only invites crawls of literal `{search_term_string}` URLs.

### 3. Make the low-value legacy patterns explicitly non-indexable

Add a small route-level guard that renders `noindex` for URL shapes that must never enter the index even if something links to them: `/itinerary` with any query string, and any path still carrying `replytocom`, `share`, `utm_source=rss` or `fbclid`. Combined with the existing `UrlNormaliser`, this covers `…/kung-fu-nuns-of-ladakh/?replytocom=40`.

### 4. Lift the quality signals on the pages that should be indexed

- Backfill `seo_description` for all 37 active destinations and the 12 trips missing one, and `seo_title` / `seo_description` for the 37 / 28 stories missing them (generated from existing title, destination and content, written to the database — reviewable and editable in the CMS afterwards).
- Add internal links so the orphaned pages are reachable in fewer clicks: related-stories links on destination pages, and a destination link on every story and trip detail page. `/destinations/nepal` being crawled-not-indexed is characteristic of a page with almost no internal inbound links.

### 5. What must happen outside this codebase (blocking, and the largest share)

These cannot be done from the app and are ~70% of the list:

1. **Take `staging.`, `uat.` and `cms.adventourist.in` off the public internet.** Either remove their public DNS records or put them behind HTTP auth. A `robots.txt` disallow is not enough — those hosts are already indexed-eligible and each one duplicates the entire trip catalogue.
2. **Retire `blog.adventourist.in`.** Cloudflare rule: `blog.adventourist.in/*` → `https://www.adventourist.in/travel-stories/$1` as a 301, with `/feed*`, `/tag/*`, `/author/*`, `/category/*`, `/comments/*`, `/search/*` collapsing to `/travel-stories`.
3. **Turn on the Cloudflare Bulk Redirects** from the `adventourist-redirects.csv` I generated earlier — the in-app redirects are client-side and Google treats them as soft signals, not 301s.
4. **`http://` and apex → `https://www.`** canonical host redirect at the edge.
5. In the legacy WordPress: disable feeds, comments and `?replytocom=`, or shut the install down entirely once the redirects are live.

Once 1–4 are live, most of this list stops being crawled and drops out of the report on its own over 4–8 weeks. The app-side work in steps 1–4 above is what makes the remaining www URLs resolve correctly when Google re-crawls them.

## Sequencing note

Do not add `Disallow: /travel-blog/` to `robots.txt` until the Cloudflare 301s are live — blocking first would prevent Google from ever seeing the redirects, and those URLs would stay stuck permanently. The current `robots.txt` already leaves that line commented out for this reason.

## Technical details

Files this touches: `src/routes/LegacyRedirects.tsx` (slug maps and new routes), `index.html` (JSON-LD `potentialAction` removal), a new `src/routes/NoIndexGuard.tsx` mounted alongside `UrlNormaliser` in `src/App.tsx`, `src/site/pages/DestinationDetail.tsx` and `src/site/pages/StoryDetail.tsx` (internal links), plus one database update for the missing SEO fields. The sitemap regenerates automatically at 194 URLs and needs no change.
