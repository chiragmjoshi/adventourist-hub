## Image regeneration — final batch

Continue the photoreal editorial overhaul. Same National Geographic look (golden hour, wide framing, no text, no watermarks, 16:9, ~1536×864).

### 1. Remaining 11 travel stories
Generate one image per slug → `public/site-images/stories/{slug}.jpg`:
- 13-driving-tips → Indian mountain highway, monsoon light
- about-chadar-trek → Frozen Zanskar river, trekkers in down jackets
- history-culture-and-festivals-of-leh → Hemis monastery festival, masked dancers
- interesting-facts-about-ladakh → Pangong Lake from above, prayer flags
- maldives-package → Overwater villa, turquoise lagoon, aerial
- places-to-visit-in-chittorgarh-in-2023 → Chittorgarh Fort ramparts at dusk
- places-to-visit-in-kashmir-2 → Dal Lake shikara, Zabarwan range
- places-to-visit-in-paro → Tiger's Nest monastery on cliff
- shanti-stupa-leh-ladakh → Shanti Stupa at sunset, Leh below
- things-to-do-in-jaisalmer → Jaisalmer Fort golden walls, camels in dunes
- things-to-do-in-kasol → Parvati river, pine forest, Himalayan village

Then SQL: `UPDATE travel_stories SET thumbnail_url = '/site-images/stories/' || slug || '.jpg'` for these 11.

### 2. All 72 itinerary heroes
Generate one image per slug → `public/site-images/itineraries/{slug}.jpg`. Prompt template per row uses headline + destination so each image is destination-specific (e.g. Bali → rice terraces / Uluwatu cliffs; Maldives → overwater villas; Ladakh → high-altitude desert; Rajasthan → forts/dunes; Kerala → backwaters; Bhutan → dzongs; Maharashtra → Sahyadris; Tadoba → tiger in sal forest; Andaman → Radhanagar beach; Kailash → Mt Kailash; Vaishno Devi → Trikuta hills temple; Scandinavia → aurora; Finland → snow cabin; Russia → St Basil's; Egypt → pyramids; Kenya → Maasai Mara; Australia → Sydney Opera House / Great Ocean Road; Georgia → Caucasus; Azerbaijan → Baku flame towers; Laos → Luang Prabang; Philippines → Palawan / Manila bay; Oman → Wadi Shab; Greece → Santorini; etc).

Then SQL: `UPDATE itineraries SET hero_image = '/site-images/itineraries/' || slug || '.jpg'` for all 72.

### Execution

Use the `ai-gateway` skill via `/tmp/lovable_ai.py --image --model google/gemini-3-flash-preview-image` in batched parallel runs (≈8 per batch) to keep wall-time reasonable. Each prompt prepended with: *"Cinematic editorial travel photograph, National Geographic style, golden hour, wide-angle, photoreal, no text, no watermarks, no logos, no people facing camera. Subject: …"*

Existing files in `public/site-images/itineraries/` are PNG stock placeholders — overwrite with new `.jpg` files (DB update switches extension in the same UPDATE).

### Verification
- `ls public/site-images/stories | wc -l` → 59
- `ls public/site-images/itineraries | wc -l` → ≥72
- Spot-check 5 random itineraries on the public site to confirm hero renders.

### Estimated cost / time
~83 image gens × Gemini Flash Image ≈ 10–15 min in parallel batches. No layout, route, or component changes — only image files + two SQL UPDATEs.
