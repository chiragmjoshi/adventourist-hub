## Resume hero image generation

Status: destinations 37/37 ✅, itineraries 3/72, landing_pages 0/11 — 80 remaining.

### Approach

Re-run the existing idempotent script `/tmp/genimg/run.py` (skips records that already have `hero_image`). Each run generates ~30–40 images before the sandbox 10-minute cap, so this will take ~2–3 turns:

1. Turn 1: resume → finish remaining itineraries (likely ~35 of 69).
2. Turn 2: finish itineraries + all 11 landing pages.
3. Verify final counts (72/72 + 11/11), summarize in `/mnt/documents/image_generation_report.md`.

Nothing else changes — same cinematic prompt, `google/gemini-3.1-flash-image-preview` (fast), upload to `legacy-media/hero/{table}/{slug}.png`, PATCH `hero_image` via service-role REST.

If you'd prefer I batch the remaining work asynchronously with `nohup` again instead of foreground runs, say so — otherwise I'll start the foreground resume.
