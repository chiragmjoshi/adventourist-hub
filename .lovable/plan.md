## Goal

Clean up the Google Search Console account for adventourist.in. All three actions are account-level changes made through the Search Console connector — no code changes to the app.

## Actions

### 1. Remove 3 stale WordPress sitemaps

Delete these entries from the `adventourist.in` domain property (all currently "Couldn't fetch"):

```text
https://blog.adventourist.in/sitemap_index.xml            (21 Mar 2026)
https://www.adventourist.in/travel-blog/post-sitemap.xml  (31 Mar 2022)
https://adventourist.in/travel-blog/sitemap_index.xml     (27 Oct 2020)
```

The live sitemap `https://www.adventourist.in/sitemap.xml` (194 URLs, status Success) stays untouched and remains the only submitted sitemap. No resubmission needed.

### 2. Re-associate GA4

Remove the existing Google Analytics association (stream "www.adventourist.in - GA4", currently labelled with the stale `https://adventourist.in/travel-blog/` URL) and create a fresh association pointing at the canonical property.

Important: re-association sends an authorization request that **you must accept from the Google Analytics side**. Until you accept, Search Console data will not flow into GA4. I'll tell you exactly when to go accept it.

No Looker Studio action — Looker connects through its own OAuth flow, so there is nothing linked here to repair.

### 3. Delete the URL-prefix property

Permanently delete `https://www.adventourist.in/` (URL-prefix). The `adventourist.in` domain property remains and already covers every protocol, subdomain, and path.

Consequences to be aware of:
- Historical performance data held only in the prefix property is lost permanently.
- Any Looker Studio report or third-party tool pointing at the prefix property will break and must be repointed at the domain property.
- The `google-site-verification` meta tag in `index.html` backed only the prefix property, so it becomes inert. The `_google` DNS TXT record at Cloudflare backs the domain property and **must not be removed**.

## Order of operations

1. Remove the 3 stale sitemaps.
2. Re-associate GA4, then hand off the authorization step to you.
3. Delete the URL-prefix property last, so nothing else depends on it mid-flight.
4. Re-read the domain property afterwards and report the final state: submitted sitemaps, associations, verification method.

## Technical notes

Every step runs through the Search Console connector against the verified `sc-domain:adventourist.in` property, resolved from a live property listing at execution time rather than a hardcoded identifier. Sitemap removal uses `DELETE /webmasters/v3/sites/{site}/sitemaps/{sitemapUrl}`; property deletion uses `DELETE /webmasters/v3/sites/{site}`. If the connector's granted scopes are read-only, the write calls will return 403 — in that case I'll stop and ask you to reconnect with write scope rather than retrying.

## Out of scope

- No app code, sitemap generator, robots.txt, or canonical changes — the app side was already verified clean.
- DNS changes for `uat.`, `cms.`, and `blog.` subdomains and the Cloudflare bulk-redirect CSV upload remain your manual tasks.
