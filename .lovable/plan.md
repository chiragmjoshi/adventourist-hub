# SEO Phase 1 — Execution Plan

All three open questions are now resolved. This plan ships the remaining Phase 1 work.

## Decisions locked in
1. **H1 change approved** — Homepage gets a new H1 with the old tagline kept as a smaller eyebrow above it.
2. **Canonical host = `https://www.adventourist.in`** — All canonicals, og:url, sitemap entries, and JSON-LD URLs use the `www` host. Other hosts (`adventourist.in`, `adventourist-zenith.lovable.app`, preview URLs) stay non-canonical and will point back to www via `<link rel="canonical">`.
3. **"+91 9826000000 / No predefined itinerary" — NOT in this codebase or database.** Grepped the entire repo, `landing_pages`, `itineraries`, `legacy_landing_pages`, `legacy_itineraries`, and `travel_stories.content_html` for `9826`, `9826000000`, and `No predefined itinerary` → zero matches. That URL must be either (a) an old WordPress page still cached/indexed on the legacy host (`blog.adventourist.in` or the original `adventourist.in` site before migration), or (b) a third-party listing. **Action required from you:** paste the URL Google is showing so I can confirm the host. If it's the legacy host, the fix is a Cloudflare bulk redirect (out of repo).

## What this plan ships

### 1. Homepage H1 change (`src/site/pages/Home.tsx`)
- Replace current H1 (`Travel Designed For You`) with:
  - Eyebrow (small, uppercase, muted): `Travel Designed For You`
  - H1 (hero scale): `Custom Trips Planned Around You`
- Keep existing hero subtext, CTAs, layout untouched.

### 2. Canonical host enforcement
- Audit `src/site/components/SEO.tsx` (or per-route `<Helmet>` blocks added in Phase 1) and confirm every `canonical` + `og:url` uses `https://www.adventourist.in`. Fix any that hard-code apex or `lovable.app`.
- Audit `scripts/generate-sitemap.ts` `BASE_URL` → already `https://www.adventourist.in`. Confirm.
- Audit `index.html` JSON-LD `url` fields → set to www.
- **Note:** Actual host-level 301 (`adventourist.in` → `www.adventourist.in`) is a DNS/Cloudflare redirect, not a code change. Flagged as out-of-repo follow-up.

### 3. Phone number audit
- Grep frontend for any phone string and normalize to `+91-9930400694`. Current matches to verify: `src/site/layout/Footer.tsx`, `src/site/pages/Contact.tsx`, `index.html` JSON-LD `telephone`, any `tel:` links, WhatsApp links.
- Confirm no instance of `9826000000` ships in the bundle.
- Skip DB rewrite — already verified clean.

### 4. Bad-itinerary-page follow-up (pending your URL)
- Once you paste the Google-indexed URL, I'll either:
  - **If it's a route in this app** (e.g. `/l/some-slug`) → fix the seed data in `landing_pages` or 301 the slug.
  - **If it's the legacy host** → add it to the Cloudflare bulk redirect CSV (already on the Phase 1 deliverables list).

## Files touched
- `src/site/pages/Home.tsx` — H1 + eyebrow
- `src/site/layout/Footer.tsx` — phone audit
- `src/site/pages/Contact.tsx` — phone audit
- `index.html` — JSON-LD `telephone` + `url`
- `src/site/components/SEO.tsx` (or equivalent) — canonical host audit

## Out of scope (Phase 2/3 or external)
- Cloudflare DNS apex→www redirect
- Cloudflare bulk redirects for `blog.adventourist.in`
- 8 destination landing pages (Phase 2 — still need destination list from you)
- Image AVIF/WebP conversion (Phase 3)
