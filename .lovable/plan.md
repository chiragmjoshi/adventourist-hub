## Goal

Generate a cinematic hero image for every destination, itinerary, and landing page that currently has none, upload each to Lovable Cloud storage, and write the public URL back to the record's `hero_image` column.

## Scope

| Table | Count | Image prompt source |
|---|---|---|
| destinations | 37 | `name` (e.g. "Bali", "Kashmir") |
| itineraries | 72 | destination name + theme inferred from `headline`/slug |
| landing_pages | 11 | `name`/headline |
| **Total** | **120** hero images @ 1600×900 (16:9) |

Galleries stay empty for manual upload later.

## Approach

1. Build a single Python batch script at `/tmp/genimg/run.py` that:
   - Reads each record's id, name and (for itineraries/landing pages) the destination name for additional context.
   - Calls the Lovable AI image gateway (`google/gemini-3.1-flash-image-preview`, fast tier) with a cinematic photography prompt template.
   - Uploads each PNG to the existing public `legacy-media` bucket under `hero/{table}/{slug-or-id}.png` using Supabase Storage REST + service role key.
   - Updates the record's `hero_image` column with the resulting public URL via a service-role REST call (UPDATE permission not available on pooler).
   - Logs progress to `/mnt/documents/image_generation_report.md` and skips records whose `hero_image` is already set (idempotent re-runs).

2. Prompt template (cinematic photography style):
   ```
   Cinematic travel photograph of {SUBJECT}, golden hour light, 
   National Geographic style, ultra-detailed, shallow depth of field, 
   wide-angle 16:9, no text, no watermark, no people in foreground.
   ```
   - Destinations: SUBJECT = iconic landscape/landmark of `{name}` (e.g. "the rice terraces of Bali, Indonesia").
   - Itineraries: SUBJECT = top scenic moment from `{destination.name}` matching theme keywords in headline (honeymoon → sunset beach; adventure → mountain trek; wildlife → safari; pilgrimage → temple).
   - Landing pages: same as itinerary if linked, else from headline.

3. Throttle: 1 image/2s to stay under gateway rate limits. Full run ≈ 4–5 min.

4. After all uploads, run a verification SQL count: rows with non-null `hero_image` must equal total rows for each table.

## Technical notes

- Storage: `legacy-media` bucket already exists and is public — reuse it (path prefix `hero/`).
- Auth: service-role key from env (`SUPABASE_SERVICE_ROLE_KEY`) for both Storage upload and PATCH-by-id REST update — pooler `sandbox_exec` lacks UPDATE.
- Failure handling: per-record try/except, continue on failure, list failures at the end of the report so we can re-run only the failed slugs.
- Output: no source files in the project repo; this is a one-shot data backfill executed via `code--exec`.

## Deliverables

- `/mnt/documents/image_generation_report.md` summary (counts + any failures).
- 120 public URLs persisted in `destinations.hero_image`, `itineraries.hero_image`, `landing_pages.hero_image`.
- Brief chat confirmation with verification counts.

## Out of scope (will not do)

- Gallery images for any table.
- Re-generating records that already have `hero_image` set.
- UI changes to display fallback when hero is missing (already handled in prior sprints).
