## Goal

Repair the destination → itinerary → lead data chain across the editor, edge function, and lead views. No schema changes needed — `leads.destination_id`, `leads.itinerary_id`, `landing_pages.destination_id`, `landing_pages.itinerary_id` all already exist.

## What's actually broken (after audit)

| # | Spot | Status today |
|---|---|---|
| 1 | ItineraryEdit — destination dropdown | Selecting a destination does NOT auto-populate `best_months / themes / suitable_for / hero_image`. The destinations query only fetches `id, name, about`, so even the "About" info box is the only thing wired. |
| 2 | `submit-lead` edge function | When `landing_page_id` is provided, the function does NOT look up the landing page. It never sets `itinerary_id`, and `destination_id` only resolves from a typed-in name. So landing-page-form leads land with both FKs null. |
| 3 | LeadManagement "Add Lead" dialog | Destination→Itinerary cascade works one way only. If user picks an itinerary first (no destination chosen), `destination_id` stays empty. |
| 4 | Lead list (LeadManagement table) | Join + render already correct — verify only. |
| 5 | LeadDetail "Current Enquiry" tab | Selects exist but: not clickable links, no empty-state CTA, and picking an itinerary does not auto-fill `destination_id`. |

## Fixes

### 1. `src/pages/ItineraryEdit.tsx`
- Expand the destinations query to select `id, name, about, best_months, themes, suitable_for, hero_image`.
- On `destination_id` change, look up the selected destination and merge into form state **only for empty fields**:
  - `best_months` empty → `monthsToNames(dest.best_months)`
  - `themes` empty → `dest.themes`
  - `suitable_for` empty → `dest.suitable_for`
  - `hero_image` empty → keep blank but show a small preview of `dest.hero_image` labelled "Using destination image" beside the hero uploader.
- Existing About info box already binds to `selectedDest.about` — confirm it re-renders on change (it does, since `selectedDest` is derived from `form.destination_id`).
- Skip auto-merge when loading an existing itinerary (only run on user-initiated change).

### 2. `supabase/functions/submit-lead/index.ts`
- If `body.landing_page_id` is present, fetch `landing_pages` row (`destination_id, itinerary_id`) with the service-role client and use those values as the primary source.
- Fallback chain for `destination_id`: landing page → name lookup.
- Add `itinerary_id` to the insert payload (currently absent entirely).
- No body-schema changes needed for clients — landing page already passes `landing_page_id`.

### 3. `src/pages/LeadManagement.tsx` (Add Lead dialog)
- When user picks an itinerary, if `form.destination_id` is empty, set it from `itineraries.find(...).destination_id`. Keep current destination→itinerary filter cascade.
- Insert already includes both FKs — no change there.

### 4. Lead list — verify only
- Query already does `*, destinations(name), itineraries(headline), users!leads_assigned_to_fkey(name)` and the cells already render `destinations.name` and truncated `itineraries.headline` with em-dash fallback. No code change unless the manual test fails.

### 5. `src/pages/LeadDetail.tsx` (Current Enquiry tab)
- Wrap the displayed destination name and itinerary headline as `<Link>`s to `/destinations/:id` and `/itineraries/:id/edit` respectively.
- When the itinerary `<Select>` changes, also patch `destination_id` from `itineraries.find(i => i.id === v).destination_id` if currently empty.
- If both `destination_id` and `itinerary_id` are null, render an empty-state row: "No destination or itinerary linked" + an inline searchable itinerary picker that, on select, updates both FKs in one save.

## Out of scope
- No DB migrations (columns already exist).
- No changes to landing page editor save (it already persists both FKs — verified line 154 of `LandingPageEdit.tsx`).
- No changes to public-site itinerary enquiry path (it routes through the same `submit-lead` function with `landing_page_id`; once #2 is fixed it inherits the FKs).

## Manual verification checklist
After implementation, walk through the 6 end-to-end steps from the brief and report pass/fail per step.
