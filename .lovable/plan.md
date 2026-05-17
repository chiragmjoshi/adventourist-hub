## Goal

When a visitor submits the "Plan This Trip Your Way" form on a trip / itinerary page:
1. Lead is created in **Lead Management** (CRM) with Platform = `Organic`, Channel = `Website`.
2. Lead is linked to the correct **destination** and **itinerary** row (so you can filter "all leads for Bali", "all leads for Bali 5N6D itinerary").
3. WhatsApp opens to the main number with a prefilled message tagged with the trip slug.

## What's already in place

- `TripLeadForm` opens WhatsApp first, then fires `submitLead(...)` (fire-and-forget).
- `useLeadCapture` calls the `submit-lead` edge function with `channel: "Website"`, `platform: "Organic"`, UTMs, landing URL, and referrer.
- `submit-lead` resolves `destination_id` by name and inserts into `leads` with the ADV traveller code.

## Gaps to close

1. **Itinerary is not linked.** `TripLeadForm` sends `trip_slug` only inside `notes`. `submit-lead` only resolves `itinerary_id` when a `landing_page_id` is provided, so the lead row's `itinerary_id` stays NULL for organic trip-detail visits.
2. **Page source granularity.** `page_source` is passed by the hook but not forwarded to the edge function, so the lead loses the "which trip page" attribution beyond the notes blob.
3. **No silent-failure visibility.** Because the CRM call is fire-and-forget, a failing submit produces no toast and no log — the user can't tell if leads are actually being saved. We should surface a non-blocking error toast and keep an edge-function log line.

## Changes

### 1. Edge function `supabase/functions/submit-lead/index.ts`
- Accept new optional fields: `itinerary_slug`, `page_source`.
- Resolution order for `itinerary_id`:
  1. From `landing_page_id` (existing).
  2. **New:** from `itinerary_slug` → `itineraries.id` where `slug = $1`.
- If itinerary is resolved and `destination_id` is still null, hydrate `destination_id` from that itinerary (already implemented — keep).
- Persist `page_source` into the `leads.source_page` column (or into notes if the column doesn't exist — verify in migration step).
- Add a structured `console.log` on every successful insert: `{ traveller_code, destination_id, itinerary_id, channel, platform }` so you can confirm in logs.

### 2. Hook `src/site/hooks/useLeadCapture.ts`
- Forward `trip_slug` as `itinerary_slug` and `page_source` to the edge function body.
- On error, emit a non-blocking `toast.error("Could not save lead — please WhatsApp us directly.")` so silent failures stop happening.

### 3. `TripLeadForm.tsx`
- Already passes `trip_slug`, `destination`, `page_source: trip_detail_<slug>` — no UI change needed; it just starts arriving at the edge function now.

### 4. Verification step (after deploy)
- Submit the form from `/trips/<some-slug>`.
- Confirm in Lead Management that a new row appears with destination + itinerary populated and `Platform: Organic / Channel: Website`.
- Open the lead's timeline — note should contain the trip title and slug.
- Confirm WhatsApp tab opens with the prefilled message.

## Out of scope

- Changing how AiSensy / automation reacts to the new lead (handled separately by your automations).
- Touching the homepage modal or contact form flows beyond what's needed for shared hook/edge changes (those will inherit the toast + page_source improvements automatically).
