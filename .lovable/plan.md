## Plan: Public API + Design System for new.adventourist.in

Turn this admin into the backend-of-record for the public marketing site. The admin will expose a versioned REST API via edge functions, and ship a reusable design system + client SDK that the public React+Vite app drops in.

### Architecture

```text
┌──────────────────────────┐         ┌─────────────────────────────┐
│ new.adventourist.in      │  HTTPS  │ Adventourist Admin          │
│ (React + Vite, GitHub)   │ ──────► │ Lovable Cloud (Supabase)    │
│                          │         │                             │
│  @adventourist/sdk       │         │ Edge Function: public-api   │
│  @adventourist/ui        │         │   /v1/destinations          │
│                          │         │   /v1/destinations/:slug    │
│                          │         │   /v1/itineraries           │
│                          │         │   /v1/itineraries/:slug     │
│                          │         │   /v1/landing-pages/:slug   │
│                          │         │   /v1/leads (POST)          │
│                          │         │   /v1/testimonials          │
│                          │         │   /v1/master-values/:type   │
└──────────────────────────┘         └─────────────────────────────┘
```

### Step 1 — Build the public REST API (edge function `public-api`)

Single edge function with internal routing, deployed at:
`https://ufjhiqdpshrubephgxrs.supabase.co/functions/v1/public-api/v1/...`

`verify_jwt = false`, permissive CORS, Zod validation, in-memory rate limiting on POST /leads (5/min/IP).

Endpoints:

| Method | Path | Purpose | Source |
|---|---|---|---|
| GET | `/v1/destinations` | List active destinations (filters: theme, suitable_for, month) | `destinations` where `is_active=true` |
| GET | `/v1/destinations/:slug` | Single destination + linked itineraries | `destinations` + `itineraries` |
| GET | `/v1/itineraries` | List published itineraries (filters: destination, theme, days, price range) | `itineraries` where `status='published'` |
| GET | `/v1/itineraries/:slug` | Full itinerary with days, inclusions, gallery | `itineraries` |
| GET | `/v1/landing-pages/:slug` | Landing page payload + linked itinerary + destination testimonials | `landing_pages` + joins |
| GET | `/v1/testimonials` | Aggregated testimonials across destinations | `destinations.testimonials` |
| GET | `/v1/master-values/:type` | Filter chips (themes, suitable_for, months, etc.) | `master_values` |
| POST | `/v1/leads` | Submit enquiry — validates, inserts, writes timeline event | `leads` + `lead_timeline` |

Response shape: `{ data, meta: { count, page } }` for lists; `{ data }` for singles; `{ error: { code, message } }` for failures.

### Step 2 — Build the public-site design system in this admin

Create reusable, route-mountable components inside admin under `src/public-site/`:

- `components/PublicNav.tsx`, `PublicFooter.tsx`
- `components/DestinationCard.tsx`, `ItineraryCard.tsx`, `TestimonialCard.tsx`
- `components/HeroSection.tsx`, `EnquiryForm.tsx`, `ItineraryAccordion.tsx`, `Gallery.tsx`
- `pages/PublicHome.tsx`, `PublicDestinations.tsx`, `PublicDestinationDetail.tsx`, `PublicItineraries.tsx`, `PublicItineraryDetail.tsx`, `PublicAbout.tsx`, `PublicContact.tsx`

Mount under preview routes (`/preview/home`, `/preview/destinations`, etc.) so you can iterate on the design here before exporting. Brand tokens from `mem://design/brand` already live in `index.css` — components consume them via Tailwind utilities, no new tokens needed.

The existing `src/pages/LandingPage.tsx` becomes the template `PublicLandingPage` lives next to.

### Step 3 — Ship the client SDK + UI kit for the public repo

Generate a downloadable bundle at `/mnt/documents/adventourist-frontend-kit/` containing:

```text
adventourist-frontend-kit/
├── README.md                       (setup + env vars)
├── lib/
│   ├── api.ts                      typed fetch client for /v1/*
│   ├── types.ts                    Destination, Itinerary, Lead, etc.
│   └── queries.ts                  React Query hooks (useDestinations, useItinerary, etc.)
├── components/                     copy of PublicNav, cards, EnquiryForm, etc.
├── pages/                          copy of PublicHome, detail pages, etc.
├── styles/
│   ├── tokens.css                  brand HSL variables
│   └── tailwind.config.js          matching admin's config
└── .env.example                    VITE_API_BASE_URL=https://...supabase.co/functions/v1/public-api
```

User copies this into `new.adventourist.in` repo, runs `npm i @tanstack/react-query react-router-dom`, points `VITE_API_BASE_URL` at the deployed function, done.

### Step 4 — Lock down RLS for production safety

Even with REST API in front, tighten anon RLS as defence-in-depth:
- `destinations`: keep public SELECT where `is_active=true` ✓ (already correct)
- `itineraries`: keep public SELECT where `status='published'` ✓
- `landing_pages`: keep public SELECT where `is_active=true` ✓
- `leads`: keep `Public can submit leads` INSERT, but add a CHECK trigger that strips `assigned_to`, `sales_status`, `is_hot` from anon inserts (so the public can't self-assign or mark hot)

### Technical details

- **Edge function file**: `supabase/functions/public-api/index.ts` — single Deno file, internal router via `URL.pathname.split('/')`.
- **Validation**: Zod schemas inline at top of file.
- **Rate limit**: `Map<ip, {count, resetAt}>` in module scope (resets on cold start — acceptable for v1; can swap for a `rate_limits` table later).
- **CORS**: `Access-Control-Allow-Origin: *` for GETs; for POST /leads, allow `*` but validate `Origin` against a whitelist (`new.adventourist.in`, `adventourist.in`, `www.adventourist.in`, `localhost:*`).
- **Caching headers**: `Cache-Control: public, max-age=300, stale-while-revalidate=3600` on all GETs.
- **Client SDK**: plain `fetch` + typed responses, optional React Query hooks layer.
- **No schema migrations** required for steps 1–3; step 4 adds one trigger.

### What you get when this plan runs

1. A live REST API at `…/functions/v1/public-api/v1/*` with 8 endpoints.
2. A `/preview/*` set of routes inside this admin where you can see and iterate on every public-site page in real time.
3. A `adventourist-frontend-kit.zip` artifact you drop into your `new.adventourist.in` GitHub repo.
4. Hardened anon insert policy on `leads`.

### Out of scope (next iteration)

- Search (algolia/typesense) — for now uses Postgres `ilike`.
- Sitemap.xml + RSS — easy add as `/v1/sitemap` later.
- Webhook from CRM → public-site cache invalidation — only needed if you add a CDN.
- Per-user OAuth on the public site — not needed; public site is unauthenticated.