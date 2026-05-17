## Goal

Honor the 221 redirect rules in `Adventourist_Redirect_Plan.xlsx` so legacy WordPress / old-CMS URLs route to the new site sections.

## Important caveat (read first)

Lovable hosting does **not** process `_redirects`, `netlify.toml`, `vercel.json`, or any edge-redirect config. The spreadsheet itself is written as a Cloudflare rules plan — true `301`s should be set up as Cloudflare Bulk Redirects / Rules on `adventourist.in`. From inside the app we can only do **client-side redirects** via React Router (`<Navigate replace />`), which:

- Work for human visitors and most modern crawlers (Googlebot executes JS and follows them, but treats them as soft 301s).
- Cannot redirect across hostnames (apex `adventourist.in` → `www`, or `blog.adventourist.in/*`) — those MUST stay in Cloudflare/DNS.
- Cannot strip `?utm_*` server-side, but the route match ignores query strings so the destination URL is reached correctly.

This plan implements everything that CAN live in the app, and lists what must remain on Cloudflare.

## What gets implemented in-app

A new component `src/routes/LegacyRedirects.tsx` containing route definitions, mounted at the top of the `<Routes>` tree in `src/App.tsx` (before the existing routes so they win).

### 1. Blog post slug rename — `/travel-blog/:slug` → `/travel-stories/:slug` (covers 120 rows)

Single dynamic route:
```tsx
<Route path="/travel-blog/:slug" element={<RedirectTo to="/travel-stories/:slug/" />} />
<Route path="/travel-blog/:slug/" element={<RedirectTo to="/travel-stories/:slug/" />} />
```
This single rule replaces all 60 unique slug mappings (the apex `adventourist.in` variants are Cloudflare's job).

### 2. Malformed `/1000` suffix (20 rows)
```
/travel-blog/:slug/1000          → /travel-stories/:slug/
/travel-blog/:slug//1000         → /travel-stories/:slug/
```

### 3. WordPress `/feed/` (3 rows)
```
/travel-blog/:slug/feed          → /travel-stories/:slug/
```

### 4. RSS UTM URLs (7 rows) — already handled by rule #1 (React Router ignores query string; UTMs naturally fall away on the new URL since we don't carry them).

### 5. Blog homepage + category/tag/pagination (14 rows)
```
/travel-blog/                       → /travel-stories/
/travel-blog/about/                 → /about/
/travel-blog/home/                  → /travel-stories/
/travel-blog/page/*                 → /travel-stories/
/travel-blog/category/*             → /travel-stories/
/travel-blog/tag/camping-tips/      → /travel-stories/27-camping-tips/
/travel-blog/tag/camping/           → /travel-stories/27-camping-tips/
/travel-blog/tag/*                  → /travel-stories/   (catch-all)
```

### 6. Itinerary URL changes (10 rows, static slug map)
```
/itinerary/Bhutan-Itinerary-for-8-Days            → /trips/bhutan-itinerary-8-days
/itinerary/Spiti-Valley-Itinerary-6-Days          → /trips/spiti-valley-itinerary-6-days
/itinerary/kashmir-trip-itinerary                 → /trips/kashmir-trip-itinerary
/itinerary/Srilanka-Maldives-Itinerary-7-Nights   → /trips/srilanka-maldives-itinerary-7-nights
/itinerary/bali-5days-4nights                     → /trips/bali-5-days-4-nights
/itinerary/itinerary-darjeeling-pelling-sikkim-gangtok → /trips/darjeeling-pelling-sikkim-gangtok
/itinerary/vietnam-tour-package                   → /trips/vietnam-tour-package
/itinerary/6-Nights-and-7-Days-Leh-Ladakh-Itinerary-  → /trips/leh-ladakh-6-nights-7-days
/itineraries/explore_itinerary                    → /trips/
/explore-ladakh-via-manali-in-7-nights-8-days     → /trips/leh-ladakh-6-nights-7-days
```
A fallback `/itinerary/:slug` → `/trips/` will catch anything not in the map.

### 7. Old `/story/` paths (2 rows)
```
/story/camping-tips                                                       → /travel-stories/27-camping-tips/
/story/we-bet-you-didn-t-know-about-these-intriguing-facts-about-ladakh   → /travel-stories/interesting-facts-about-ladakh/
```

### 8. Typo + sitemap (2 rows)
```
/travelstories  → /travel-stories/
/sitemaps       → /sitemap.xml
```

### Helper component
```tsx
function RedirectTo({ to }: { to: string }) {
  const params = useParams();
  const target = to.replace(/:(\w+)/g, (_, k) => params[k] ?? "");
  return <Navigate to={target} replace />;
}
```

## What stays in Cloudflare (cannot live in-app)

| Rule | Reason |
|---|---|
| `adventourist.in` → `www.adventourist.in` (apex → www, all paths) | Hostname-level, DNS/Cloudflare only |
| `blog.adventourist.in/*` → `www.adventourist.in/travel-stories{path}` | Different subdomain |
| `staging.adventourist.in`, `dev.adventourist.in`, `uat.adventourist.in`, `cms.adventourist.in/admin` | Marked "DO NOT REDIRECT" in the sheet |
| True HTTP `301` status (for max SEO equity) | App can only issue client-side redirects |

Recommendation: paste the static rows from the spreadsheet into a Cloudflare Bulk Redirect List, and use a Cloudflare Rule for the dynamic patterns (`/travel-blog/*` → `/travel-stories/$1`). The in-app redirects then serve as a belt-and-braces fallback if Cloudflare misses anything.

## Files touched

- **Create** `src/routes/LegacyRedirects.tsx` — the route table + `RedirectTo` helper.
- **Edit** `src/App.tsx` — mount `<LegacyRedirects />` as the first child inside `<Routes>` (so legacy paths short-circuit before hitting `NotFound`).

No DB changes, no edge function changes, no CMS changes.

## Verification

1. Visit `/travel-blog/13-driving-tips/` → lands on `/travel-stories/13-driving-tips/`.
2. Visit `/travel-blog/13-driving-tips/?utm_source=rss&...` → lands on `/travel-stories/13-driving-tips/`.
3. Visit `/travel-blog/about-leh-palace-ladakh//1000` → lands on `/travel-stories/about-leh-palace-ladakh/`.
4. Visit `/travel-blog/category/things-to-do/page/2/` → lands on `/travel-stories/`.
5. Visit `/itinerary/Bhutan-Itinerary-for-8-Days` → lands on `/trips/bhutan-itinerary-8-days`.
6. Visit `/story/camping-tips` → lands on `/travel-stories/27-camping-tips/`.
7. Visit `/travelstories` → lands on `/travel-stories/`.
8. Visit `/sitemaps` → lands on `/sitemap.xml`.

## Open question

Do you want me to proceed with the in-app React Router redirects only (this plan), or do you also want a clean export (CSV) of the Cloudflare-only rules to paste into your Cloudflare dashboard?
