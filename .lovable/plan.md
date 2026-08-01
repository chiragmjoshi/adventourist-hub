# Search Console Property Cleanup

Goal: one authoritative Search Console property (`adventourist.in` domain property), with all site signals consistently pointing at `https://www.adventourist.in`.

## Current state (verified in the codebase)

All canonical signals already agree on `https://www.adventourist.in`:
- `src/components/SEO.tsx` — `SITE_URL` and OG image use `www`
- `index.html` — Organization/WebSite JSON-LD, OG and Twitter images use `www`
- `scripts/generate-sitemap.ts` — `BASE_URL` is `https://www.adventourist.in`
- `public/robots.txt` — `Sitemap:` and `Host:` both point to `https://www.adventourist.in`

So no canonical-domain code change is required. The cleanup is mostly on the Search Console side, plus two small hygiene items.

## Steps you take in Search Console (I can't do these)

1. Keep `adventourist.in` (domain property) as the primary. It covers http/https, www/non-www, and all subdomains.
2. In the domain property, submit `https://www.adventourist.in/sitemap.xml` and confirm it's the only sitemap listed. Remove any stale sitemaps (old WordPress `sitemap_index.xml`, `post-sitemap.xml`, etc.).
3. Leave the URL-prefix property `https://www.adventourist.in/` in place for ~30 days as a read-only cross-check, then remove it (Settings → Remove property). Removing it deletes nothing on the site and does not affect indexing.
4. Do not verify or add properties for `blog.`, `uat.`, `cms.`, or `staging.` — those hostnames should be removed from public DNS instead (still outstanding from the earlier 404 work).
5. If Google Analytics / Looker Studio is linked to the URL-prefix property, relink it to the domain property before removing it, or historical reporting connections break.

## Work I do in the app

1. **Sitemap sanity pass** — regenerate `public/sitemap.xml` and confirm every URL is `https://www.adventourist.in/...`, no `http`, no bare-apex, no subdomain entries, no malformed slugs.
2. **Self-referencing canonical audit** — spot-check the main route families (home, `/destinations/:slug`, `/trips/:slug`, `/travel-stories/:slug`) in the running preview and confirm each emits exactly one `<link rel="canonical">` on the `www` host, matching the sitemap URL exactly (trailing-slash form included).
3. **Verification tag safety** — confirm the existing `google-site-verification` meta tag in `index.html` (if present) is retained, so removing the URL-prefix property doesn't accidentally unverify the domain property. Domain properties verify by DNS TXT, so I'll also flag if the DNS TXT record is the only proof of ownership.
4. **Report** — a short list of any URL where the canonical, sitemap entry, and live host disagree, with the fix applied.

## Technical notes

- Domain-property verification is DNS TXT based; the meta tag only backs the URL-prefix property. Removing the prefix property is safe as long as the DNS TXT record stays.
- Data does not merge across properties. The domain property's history starts from its own verification date, so expect the graph to look shorter than the prefix property's — this is normal, not a loss of rankings.
- Any remaining apex → www consolidation must happen as a real 301 at Cloudflare; the app can only emit canonicals, not status codes.
