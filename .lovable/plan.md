## Problem

In the itinerary editor, picking a destination is supposed to pull that destination's attributes into the itinerary. Today the auto-fill only runs when the corresponding itinerary field is completely empty, so on any itinerary that already has values (or where a different destination was picked earlier) nothing visibly changes. Destination Type is never filled at all.

## What to change (src/pages/ItineraryEdit.tsx)

1. On destination selection, always copy from the destination record:
   - Best Time to Visit ← destination `best_months` (converted to month names)
   - Destination Theme ← destination `themes`
   - Suitable For ← destination `suitable_for`
   - Destination Type ← destination `themes` (the same master list the destination editor uses for its Theme field), so the itinerary's Destination Type is no longer left blank
2. Show a small toast confirming values were pulled from the destination, so the change is visible and the user knows the fields can still be edited manually afterwards.
3. Keep everything else manual — any chip the user toggles after selecting stays as they set it; values are only re-synced when the destination dropdown is changed again.
4. Also inherit the destination's `about` text into the itinerary About field only when it is still empty (non-destructive, avoids wiping written copy).

## Notes

- Only the itinerary editor's selection handler changes; save payload, schema and reports stay as they are.
- The destinations query already fetches `best_months`, `themes`, `suitable_for`, and `about`, so no extra data fetching is needed.
