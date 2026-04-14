

## Plan: Flush & Re-import Itineraries with Destination Linking

### Current State
- **73 itineraries** in database, **72 itineraries** in CSV
- The `itineraries` table has no `destination_slug` column — the user's UPDATE query needs a temporary column

### Steps

1. **Migration: Add temporary `destination_slug` column**
   ```sql
   ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS destination_slug text;
   ```

2. **Flush existing itineraries** via bulk-import edge function (redeploy temporarily):
   ```sql
   DELETE FROM itineraries;
   ```

3. **Import 72 itineraries from CSV** — Python script parses the CSV, maps all columns including `destination_slug`, inserts in batches via the edge function. The `destination_name` column from CSV will be skipped (not in schema). Column mapping:
   - `slug, headline, about, destination_slug, price_per_person, nights, days, flights_included, transfers_included, meals_included (from all_meals_included), stay_included, breakfast_included, sightseeing_included, support_247, inclusions, exclusions, itinerary_days, seo_title, seo_description, status, created_at`
   - Note: CSV has `important_notes` — no matching column in schema, will be skipped

4. **Link destinations** via migration:
   ```sql
   UPDATE itineraries i SET destination_id = d.id FROM destinations d WHERE i.destination_slug = d.slug;
   ```

5. **Drop temporary column** via migration:
   ```sql
   ALTER TABLE public.itineraries DROP COLUMN IF EXISTS destination_slug;
   ```

6. **Cleanup** — delete the bulk-import edge function

### Technical Notes
- The CSV `all_meals_included` maps to the table's `meals_included` — but wait, the table doesn't have `meals_included` either. The table has individual boolean fields. Will map `all_meals_included` to... let me check. The table has: `flights_included, stay_included, transfers_included, meals_included(?), breakfast_included, sightseeing_included, support_247`. Actually from the schema: there is no `meals_included` column. There's `breakfast_included` but no general meals column. The CSV `all_meals_included` will need to be handled — likely skip it since there's no matching column.
- `important_notes` from CSV — no column in schema, will be skipped
- `itinerary_days` is JSON, will be inserted as-is

