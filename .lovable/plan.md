## Goal

Seed 7 dedicated landing pages — one per high-volume channel — so each has its own short URL (`/lp/<slug>`). When a lead submits from that page, the page's `platform` and `channel` are inherited automatically (this already works via `landing_page_id` → `platform`/`channel` on the `leads` table).

## What gets created

A single SQL insert into `landing_pages` with these 7 rows. Only the channel-tracking fields (`name`, `slug`, `platform`, `channel`, `template`, `is_active`) are filled. Everything else (destination, hero content, gallery, testimonials, SEO) is left blank for you to edit in the CMS.

| Slug | Name | Platform | Channel |
|---|---|---|---|
| `google-search` | Google Search Ads | Paid | Google Search |
| `instagram-bio` | Instagram Bio | Content | Instagram Organic |
| `instagram-paid` | Instagram Ads | Paid | Instagram Ads |
| `facebook-page` | Facebook Page | Content | Facebook Organic |
| `whatsapp-referral` | Client Referral | Referral | Client Referral |
| `google-maps` | Google My Business | Organic | Google My Business |
| `youtube-desc` | YouTube Descriptions | Content | YouTube Organic |

All rows use `template='default'`, `is_active=true`, `form_title='Enquire for Free'` (the column default).

These platform/channel values match exactly what the `CHANNEL_BY_PLATFORM` mapping in `LeadManagement.tsx` and `LandingPageEdit.tsx` expects, so the filtered dropdowns will render correctly when you open each page in the editor.

## Next steps for you

1. After insert, open Landing Pages in the CMS — all 7 will appear as drafts.
2. For each, set destination, itinerary, hero image, headline/subtext, and SEO fields.
3. Share short URLs:
   - Google Ads final URL → `https://adventourist.in/lp/google-search`
   - Instagram bio link → `/lp/instagram-bio`
   - Meta Ads landing URL → `/lp/instagram-paid`
   - Facebook page website → `/lp/facebook-page`
   - Send to existing clients → `/lp/whatsapp-referral`
   - GMB website button → `/lp/google-maps`
   - All YouTube descriptions → `/lp/youtube-desc`

## Notes

- No code changes required — `submit-lead` already inherits `platform`/`channel` from the landing page when `landing_page_id` is provided.
- If a slug already exists, the insert will fail on the unique constraint and I'll surface the conflict so you can rename.
