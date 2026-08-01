## Goal

Add 20 new long-form SEO articles to the public travel stories section. Content-only: no changes to itineraries, landing pages, automations, trip cashflow, or any admin CRUD code.

## Pre-check result

I queried the database for all 20 target slugs — **zero collisions**. All 20 can be inserted. (Near-name existing rows like `festivals-in-rajasthan`, `hemis-festival`, and `all-about-magnetic-hill-in-leh` exist but use different slugs, so the new articles won't clash.) I'll re-check per-slug at insert time anyway and report any that appear.

## Content spec (applied to every article)

- 1,200–1,800 words of real `content_html`: `<h2>`/`<h3>`, `<p>`, `<ul>/<li>` only. No `<h1>` — the template renders the title as h1.
- Opens with a direct 2–3 sentence answer to the search intent (snippet/AI-answer bait) before any scene-setting.
- Focus keyword used naturally in the first 100 words, in one H2, and 2–3 more times in the body.
- Closes with an H2 "Frequently Asked Questions" holding 3–5 H3 question + P answer pairs.
- One contextual internal link matched to the destination cluster, using the site's existing pattern: `<a href="/trips?destination=Rajasthan">plan your Rajasthan trip</a>` (spaces encoded as `+`).
- No fabricated customer quotes, reviews, or named traveller stories.
- Kailash Mansarovar articles (#13, #14): no invented fees, dates, or medical/fitness thresholds — general guidance language plus the required closing note line.

## Row fields per article

- `author`, `category`, `focus_keyword`, `title`, `slug` exactly as specified in the list.
- `tags`: 2–3 relevant tags.
- `read_time_minutes`: word count ÷ 200, rounded up.
- `seo_title` ≤60 chars containing the focus keyword; `seo_description` ≤155 chars containing the focus keyword.
- `status`: `published`; `published_at`: `now()`; `thumbnail_url`: NULL so `travelStoryImage()` auto-assigns from the focus keyword.

## Process

Article-by-article: write the HTML, verify slug is free, insert that single row, move to the next. No batch generation of all 20 up front.

## Verification

After the last insert:
- Count published rows among the 20 new slugs and confirm it is 20.
- Spot-check a few rendered story pages in the browser for correct headings, working internal link, and an auto-assigned thumbnail.
- Regenerate the sitemap so the 20 new story URLs are included.
- Report the final published count and any skipped slugs.
