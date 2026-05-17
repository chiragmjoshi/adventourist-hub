# Fix Trip Detail 404s & Add Slug Redirects

## Important finding

`src/site/pages/TripDetail.tsx` is **already fetching from Supabase**. `@/site/lib/api`'s `getItineraryBySlug` queries `itineraries` table with `status='published'` and maps the row into the legacy `CMSItinerary` shape that the page renders. All 72 itineraries exist as `published` rows. So FIX 1 from the instructions (rewrite TripDetail to use a `@/public-site/lib/api`) is **not needed** — that module doesn't exist and would just duplicate `src/site/lib/api`. The 404s on `/trips/:slug` are purely slug-mismatch issues.

I will not create a duplicate API module. Instead I'll fix the slug resolution at the routing layer plus add an alias map inside `TripDetail`.

## Changes

### 1. `src/site/pages/TripDetail.tsx` — alias map

At the top of the component, before the API call:

```ts
const TRIPS_ALIAS_MAP: Record<string, string> = {
  "leh-ladakh-6-nights-7-days": "leh-backpacking-trip-with-turtuk-6-nights-7-days",
  "leh-ladakh-7-days":          "explore-ladakh-via-manali-in-7-nights-8-days",
  "kashmir-itinerary":          "paradise-on-earth-kashmir-trip-5-nights-6-days",
  "bali-trip":                  "bali-bliss-trip-5-nights-6-days",
};
const resolvedSlug = TRIPS_ALIAS_MAP[slug] || slug;
```

Pass `resolvedSlug` to `getItineraryBySlug` and use it in canonical/SEO URLs. No other rendering logic changes.

### 2. `src/routes/LegacyRedirects.tsx` — fix `ITINERARY_MAP`

Current map points to slugs that don't exist in Supabase. Replace with correct slugs + add lowercase-normalisation in `ItineraryRedirect`:

```ts
const ITINERARY_MAP: Record<string, string> = {
  "6-nights-and-7-days-leh-ladakh-itinerary-":   "leh-backpacking-trip-with-turtuk-6-nights-7-days",
  "bhutan-itinerary-for-8-days":                 "beautiful-bhutan-trip-6-nights-7-days",
  "spiti-valley-itinerary-6-days":               "spiti-valley-trip-8-nights-9-days",
  "kashmir-trip-itinerary":                      "paradise-on-earth-kashmir-trip-5-nights-6-days",
  "srilanka-maldives-itinerary-7-nights":        "scenic-srilanka-5-nights-6-days",
  "bali-5days-4nights":                          "bali-bliss-trip-5-nights-6-days",
  "vietnam-tour-package":                        "vibrant-vietnam-5-nights-6-days",
  "itinerary-darjeeling-pelling-sikkim-gangtok": "north-east-vacation-in-8-nights-9-days",
};

function ItineraryRedirect() {
  const { slug = "" } = useParams();
  const norm = slug.toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const mapped = ITINERARY_MAP[norm];
  return <Navigate to={mapped ? `/trips/${mapped}` : "/trips"} replace />;
}
```

Also remove the stale single-route `/explore-ladakh-via-manali-in-7-nights-8-days → /trips/leh-ladakh-6-nights-7-days` (it points to a non-existent slug; the page itself works directly).

### 3. `src/routes/LegacyRedirects.tsx` — root-slug catcher

Add a `ROOT_SLUG_MAP` (12 slugs from the instructions) and a `RootSlugRedirect` route registered at `/:slug`. Falls through to NotFound if no match. Mounted in `legacyRedirectRoutes()` so it sits before the catch-all but after all known top-level routes (React Router picks more-specific static routes first, so `/`, `/trips`, `/about-us`, etc. still win).

### 4. `src/pages/NotFound.tsx` — friendlier trip 404

Detect `/trips/` or `/itinerary/` prefix and show a "This itinerary has moved — browse all trips" message with a "Browse All Trips" button linking to `/trips`. Uses existing brand tokens (`bg-blaze`, `text-abyss`, `font-display`).

## Out of scope

- No changes to admin pages, CMS, reports, kanban, lead/cashflow flow.
- No new `public-site/lib/api` module (existing `site/lib/api` already does exactly this).

## Verification

- Visit `/trips/leh-ladakh-6-nights-7-days` → loads Leh Backpacking with Turtuk page.
- Visit `/itinerary/Bhutan-Itinerary-for-8-Days` → 301s to `/trips/beautiful-bhutan-trip-6-nights-7-days`.
- Visit `/bali-bliss-trip-5-nights-6-days` → 301s to `/trips/bali-bliss-trip-5-nights-6-days`.
- Visit `/trips/does-not-exist` → friendly trip-aware 404 page.
- Spot-check 3 random slugs from the 72 published itineraries → all render.
