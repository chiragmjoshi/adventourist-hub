

## Plan: Execute Day-wise Itinerary Updates

### What this does
Runs 3 uploaded SQL batch files against the database to update `itinerary_days` (JSONB) for all remaining itineraries with rich day-by-day content.

### How it works

1. **Copy the 3 SQL files** to the sandbox filesystem
2. **Execute each batch** via the existing `bulk-sql` edge function (already deployed) — each file is a single UPDATE statement joining on slug
3. **Verify** by querying the database for itineraries where `itinerary_days` is still empty

### Why this will work
- The `generate_traveller_code` trigger is already disabled (from previous migration)
- The `bulk-sql` edge function is already deployed and tested
- Each file is a self-contained UPDATE...FROM (VALUES ...) statement matching by slug

### Technical details
- 3 batch files, ~20 itineraries each
- Each uses `UPDATE itineraries SET itinerary_days = v.days_data::jsonb FROM (VALUES (...)) AS v(slug, days_data) WHERE itineraries.slug = v.slug`
- No schema changes needed

