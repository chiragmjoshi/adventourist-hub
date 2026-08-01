## Root cause (verified in the live preview)

I reproduced it: selecting "Azerbaijan" fires the toast but no chips light up, and About stays empty. The network trace shows the itinerary editor is served this response:

`/rest/v1/destinations?select=id,name&is_active=eq.true&order=name.asc`

Only `id` and `name` — no `best_months`, `themes`, `suitable_for`, `about`. So the sync handler finds the destination (hence the toast with its name) but every attribute is `undefined`, and it sets all chip arrays to empty.

Why: `src/components/AppLayout.tsx` (line 31) prefetches destinations under the React Query key `["destinations_active"]` selecting only `id, name`. `src/pages/ItineraryEdit.tsx` (line 106) uses the **same key** with a wider `select`. AppLayout's cached slim result wins, so the editor's own query never runs. The DB itself is fine — Azerbaijan has best_months [3,4,5,6], themes [Mountain Retreat, Cultural & Heritage], suitable_for [Family Trips, Friends / Groups, Couples], and all values match the master lists exactly.

## Fix

1. In `src/pages/ItineraryEdit.tsx`, change the query key to a distinct one (e.g. `["destinations_full_attrs"]`) so the full-column fetch is cached separately from AppLayout's slim list. No other logic change needed — the existing sync handler then works.
2. Audit the other pages sharing `["destinations_active"]` (`ItineraryList`, `LandingPageList`, `LandingPageEdit`, `TripCashflowEdit`, `VendorEdit`, `LeadManagement`) and give any that select more than `id, name` its own key too, so the same collision can't silently blank data elsewhere.
3. Re-verify in the browser: pick a destination on `/admin/itineraries/new` and confirm Mar/Apr/May/Jun, the two themes, and the three suitable-for chips visibly highlight, and About fills when blank.

## Notes

Save payload, schema, and reports are untouched.
