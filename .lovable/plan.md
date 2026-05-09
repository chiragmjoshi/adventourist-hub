# Backfill itinerary thumbnails + SEO

One-off Node script (run from sandbox, not part of the app). Touches only `hero_image`, `seo_title`, `seo_description`, `seo_keywords` on `itineraries`. Day-wise itinerary, inclusions, exclusions, about, pricing — all untouched.

## Scope
- 74 itineraries total
- 71 missing `hero_image`
- 74 missing `seo_keywords`
- 4 missing `seo_title` / `seo_description` (others have generic templated ones — will be regenerated to be richer)

## Step 1 — Thumbnails (Unsplash)

For each unique destination (~25), query Unsplash search API with `{destination name} travel landscape`, pick top result, download, upload to Supabase `itinerary-images/destinations/{slug}.jpg`, then assign that URL to every itinerary of that destination missing a hero.

- Itineraries that already have a `hero_image` are left alone.
- Stores Unsplash photographer credit in console log (no DB column for it — can add later if needed).
- One photo per destination (reused across its trips) — keeps it fast and avoids hitting Unsplash rate limits.

**Requires**: an Unsplash Access Key (free, takes 2 min at https://unsplash.com/developers). I'll request it as a secret `UNSPLASH_ACCESS_KEY` once you approve the plan.

## Step 2 — SEO fields (Lovable AI, free)

For each itinerary, call `google/gemini-2.5-flash` via Lovable AI Gateway with headline + about + destination + days/nights, asking for JSON:
```
{ seo_title (≤60 chars), seo_description (≤155 chars), seo_keywords (8–12 comma-separated) }
```
Run with concurrency of 5, retry on failure. Overwrites existing seo fields with richer AI versions (current ones are templated "Explore X with Adventourist" stubs).

## Step 3 — Verification

After the run, print a summary table: total updated, any failures, before/after counts of nulls. You can spot-check a few in the CMS.

## Technical notes
- Script lives at `/tmp/backfill-itineraries.ts`, run with `bun` from the sandbox using `SUPABASE_SERVICE_ROLE_KEY` (already a secret) — bypasses RLS for the update.
- No app code, no migration, no edge function. Pure data backfill.
- Idempotent: re-running skips itineraries that already have a non-stub hero_image.

## What I will NOT touch
`itinerary_days`, `inclusions`, `exclusions`, `about`, `headline`, `slug`, `price_per_person`, `gallery`, `highlights`, `themes`, `suitable_for`, `best_months`, `status`.

## After approval
1. I'll ask you to add `UNSPLASH_ACCESS_KEY` as a secret.
2. Run the script.
3. Report results.
