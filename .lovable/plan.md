## Goal
Replace every reused stock thumbnail in `travel_stories` (59 rows) with a unique, content-aware AI-generated image, hosted in Supabase Storage.

## Approach

**1. Build prompts (one per story)**
Pull all 59 rows: `id, slug, title, focus_keyword, category, tags`. For each story, compose a prompt like:

> "Editorial travel photograph for the article '{title}'. Subject: {focus_keyword or destination extracted from title}. Style: cinematic, golden hour, ultra-detailed, 16:9, no text, no watermark, no people in foreground, magazine cover quality."

Category nudges the mood (`destination-guides` → wide landscape; `things-to-do` → activity shot; `travel-stories` → atmospheric/emotive).

**2. Generate images via Lovable AI Gateway**
Use the `ai-gateway` skill script (`/tmp/lovable_ai.py`) with `google/gemini-3.1-flash-image-preview` (Nano Banana 2 — fast, high quality, supports text-free output). Save each as `/tmp/story-thumbs/{slug}.jpg`. Run sequentially with a small delay to respect rate limits. Estimated ~10 min for 59 images.

**3. Optimise for fast load**
Pipe each generated PNG through `cwebp` (or Pillow) → `1280x720 .webp` at q=78. Average ~80–120 KB per image, which keeps the homepage strip and grid snappy.

**4. Upload to Supabase Storage**
Target bucket: `stories` (already public). Path: `thumbnails/{slug}.webp`. Use `supabase.storage.from('stories').upload(..., { upsert: true, contentType: 'image/webp', cacheControl: '31536000' })`.

**5. Update database**
For each row: `UPDATE travel_stories SET thumbnail_url = '{public_url}' WHERE id = ...` via the insert tool (batched into one statement).

**6. Simplify `travelStoryImage()`**
With every row now having a real `thumbnail_url`, remove the keyword/hash fallback logic in `src/site/lib/api.ts`. Keep one neutral fallback for the rare empty case.

## Technical notes

- All work runs in the sandbox; the script uses the existing `LOVABLE_API_KEY`.
- `seo_title` / `focus_keyword` / `title` together usually contain the destination (Ladakh, Rajasthan, Jaisalmer, etc.), giving the prompt enough signal without manual review.
- WebP is supported by all target browsers; falls back gracefully.
- Image dimensions (1280×720) match the card aspect ratio used on the homepage and listing grid.
- I'll spot-check 4–5 generated thumbnails before bulk-uploading to confirm prompt quality, then proceed with the full batch.

## Out of scope
Admin upload UI, regenerating on title edits, hero/inline article images. Only the card `thumbnail_url` is touched.

```text
59 rows  →  prompt  →  AI image  →  webp 1280x720  →  storage/stories/thumbnails/{slug}.webp  →  thumbnail_url
```
