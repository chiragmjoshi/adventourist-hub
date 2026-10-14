# Make adventourist.in fully readable by search engines and AI assistants

The site already writes a basic static HTML page for each of about 220 public pages when it's built: title, description, canonical link, share tags, structured data, and an H1 with one short paragraph. This plan makes those static pages carry the **full** page content, with no change to how the site looks.

## Phase 1 — Full static HTML (highest priority)
- Extend the build step so each static page contains the real page content, not just the H1 and one line:
  - **Trips:** summary, day-by-day itinerary, inclusions and exclusions, price, who it suits, FAQs, related trips and a link to the destination.
  - **Destinations:** about text, best time to visit, sample trips, FAQs.
  - **Stories:** full article body, author byline, and the published and "last updated" dates.
  - **Static pages** (home, about-us, contact, FAQs, policies, Mumbai agency): their main headings, body text and links.
- This content is semantic HTML with real `<a href>` links. The live site replaces it as soon as it loads in the browser, so visitors see exactly the same design as today.
- Remove stray developer comments and leftover "meta-*" text from the output.
- Titles are trimmed to 50–60 characters and descriptions to 140–160, using each page's own data. Canonical links always point to the full www address with no `?` part. Every page gets the full set of Facebook/X share tags, including `twitter:card=summary_large_image` and `robots: index, follow, max-image-preview:large`.

## Phase 2 — Structured data
- **Every page:** one Organization + TravelAgency block (founded 2018, founder Minal Joshi, Vile Parle West address, phone, email, opening hours Mon–Sat 9:00–21:00, area served India, links to social profiles).
- **Homepage:** WebSite.
- **Trips:** TouristTrip with the day list, price in INR and the provider, plus BreadcrumbList.
- **Destinations:** TouristDestination + BreadcrumbList.
- **Stories:** Article with a named author, the published and updated dates, an image and the publisher.
- **FAQ pages:** keep the existing FAQ markup.
- **Remove the AggregateRating markup for 4.8.** Keep the visible 4.8 claim, linked to the Google Business Profile.

## Phase 3 — Content and trust
- Fix "Epic Europre Trip" to "Epic Europe Trip" in the title, address and data, with a permanent redirect from the old address.
- On trip and destination pages, add the missing parts using a standard layout: a summary line, a "How we customise this trip" paragraph, FAQs, related trips and the destination link. Trips with no FAQs get 4 FAQs written from the trip's own details.
- Destination pages get extra written content: 400+ words, budget in INR, visa notes and 5 FAQs. I'll draft this text for each destination and save it to the database, so you can edit it in the CRM.
- Show a "Last updated" date on trips and stories.
- **Reviews:** each review is shown only once on the page (no repeated copies for the scrolling carousel), and each links to where it came from.
- **About us:** founders and team with photos and bios, the founding year, the office address, a "How we plan a trip" section and links to outside profiles.
- Add bylines with a short bio to all stories. Add the full postal address and phone to the footer and the contact page.
- Make the number of destinations the same everywhere: homepage, About page and llms.txt.

## Phase 4 — Crawler files and links
- **Sitemap:** add `lastmod` dates for the homepage, index pages and about-us, taken from real content-change dates (never the build time). It's already rebuilt on every publish.
- Rewrite `/llms.txt` so it matches the live site exactly, and add a new `/llms-full.txt` with one section per destination and trip type, linking to each page's official address.
- `robots.txt` stays as it is.
- Change trip cards, destination chips and filters to real links. Fix the Careers link to point to /contact, and use the same destination addresses everywhere.
- **Images:** descriptive alt text (destination and trip type), images further down the page load only when needed, and the hero image gets a fixed width and height so the page doesn't jump while loading.

## Phase 5 — Verification
- Run `curl` on /, the Leh Hanle trip, /destinations/bali and /about-us, and show that the H1, body text, canonical link, description, share tags and structured data are all present.
- Check the structured data with an automated checker during the build.
- The Schema.org validator and Google's Rich Results Test run on the live site, so they can only be done after you publish. I'll give you the exact links to run them.

## Information needed from you (placeholders are used until you send it)
- Google Business Profile address and LinkedIn page address.
- Founder and team names, roles and short bios, and which photos to use. The site currently has photos for Mukund and Pinky only.
- Any travel-industry memberships or licences (for example IATO or TAAI).
- Story author: should all stories be bylined to Minal Joshi, or to someone else?

## Technical details
- Keep the current setup (Vite app with a build-time prerender script) rather than moving to a different framework. This keeps the risk low and the design identical.
- `scripts/lib/siteContent.ts` gets richer data: full trip, destination and story records. `scripts/prerender.ts` builds full HTML for each page body.
- Structured data blocks are created by one shared helper, used both by the prerender script and by the in-browser page metadata, so the two can't drift apart.
- A destination text field for the long write-up (one field, editable in the CRM).
- The Europe trip address change is made in the database, and the old address is added to the existing redirect list.
- Build-time checks stop the build if any page has a missing H1, a missing canonical link, a duplicate title or description, or broken structured data.

Publishing is needed for all of this to go live on adventourist.in.
