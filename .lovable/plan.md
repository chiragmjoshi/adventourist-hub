## Fixes

### 1. Footer — remove duplicate
`src/site/layout/Footer.tsx` lists both "About Us" (`/about-us`) and "Our Team" (`/about-us#team`) — same page. Remove the "Our Team" entry from the Company column.

### 2. Privacy policy — wrong email
`src/site/pages/PolicyPage.tsx` references `privacy@adventourist.in` in two spots (lines 411 and 498). Replace both with `support@adventourist.in` (mailto link included).

Also grep the rest of `src/site/pages/` policy content for any other `privacy@`, `legal@`, `careers@`, `info@` aliases and normalise to `support@adventourist.in`.

### 3. Itinerary inclusions/exclusions — stray "&amp;" text
`htmlToList()` in `src/site/pages/TripDetail.tsx` (line 24) strips HTML tags but never decodes HTML entities, so DB content like `Hotel &amp; Breakfast` renders literally as `Hotel &amp; Breakfast`. Add an entity-decode step (textarea trick or replace `&amp; &lt; &gt; &quot; &#39; &nbsp;`) after tag-stripping. Apply the same fix in `src/landing/templates/BoldTemplate.tsx` and `StoryTemplate.tsx` if they use similar parsing for inclusions/exclusions text.

### 4. End-to-end front-end audit
After the fixes, run through the public site:

- **Functional walk-through (browser tool)** on desktop 1440 and mobile 390:
  - Home → Trips list → Trip detail (verify inclusions render with proper "&")
  - Lead capture forms submit
  - Footer links all resolve (About, Blog, Careers, Contact, FAQs, all 4 legal pages)
  - WhatsApp FAB, navbar scroll states, mobile menu
- **Content audit** — confirm `support@adventourist.in`, phone `+91 99304 00694`, hours appear consistently; no remaining `privacy@` / `legal@` aliases anywhere.
- **SEO audit** — trigger the built-in SEO scan and surface findings.
- **Speed/perf** — run `browser--performance_profile` on Home and a Trip detail page; flag LCP, CLS, long tasks.
- **Mobile UX** — viewport 390×844 screenshots of Home, Trips list, Trip detail, Policy page.

Anything the audit surfaces beyond the three fixes above will be reported back; I won't silently expand scope.

### Out of scope
No changes to the admin/CMS, automations, or backend. Pure front-end content + parsing fixes plus a read-only audit pass.
