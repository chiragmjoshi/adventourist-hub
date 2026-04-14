

## Plan: Update All Itineraries with Production Data

### What this does
Updates all 72 existing itineraries in the database with rich content from the production MariaDB dump, including:
- **Inclusions & Exclusions** (HTML stripped to plain text)
- **Day-by-day itinerary** (parsed from `days_data` JSON into `itinerary_days` JSONB)
- **SEO fields** (`seo_title`, `seo_description`)
- **Important things / highlights** (mapped to `highlights` array)
- **Inclusion flags** corrected (`transfers_included`, `meals_included`, `stay_included`, etc.)

### How it works

**Step 1: Parse the uploaded SQL file**
Write a Python script that:
1. Reads the MariaDB SQL dump
2. Extracts all 72 itinerary records with their slugs
3. For each record, parses:
   - `important_things` HTML → plain text array for `highlights`
   - `inclusion` HTML → plain text for `inclusions`
   - `exclusion` HTML → plain text for `exclusions`
   - `days_data` JSON → `itinerary_days` JSONB (mapping `title`/`detail` to the app's day plan format with meals/activities/accommodation defaults)
   - `meta_title` → `seo_title`
   - `meta_description` → `seo_description`
   - Boolean flags: `transfers_included`, `all_meals_included` → `meals_included`, `stay_included`, `breakfast_included`, `sightseeing_included`, `support_24x7` → `support_247`
4. Generates UPDATE SQL statements matched by `slug`

**Step 2: Execute updates via the insert tool**
Run the generated UPDATE statements in batches against the database, updating each itinerary by slug.

### Data mapping

```text
Old MariaDB Column        → New Supabase Column
─────────────────────────────────────────────────
important_things (HTML)    → highlights (text[])
inclusion (HTML)           → inclusions (text)
exclusion (HTML)           → exclusions (text)
days_data (JSON)           → itinerary_days (JSONB)
meta_title                 → seo_title
meta_description           → seo_description
all_meals_included         → meals_included
support_24x7_included      → support_247
flights_included           → flights_included
transfers_included         → transfers_included
stay_included              → stay_included
breakfast_included         → breakfast_included
sightseeing_included       → sightseeing_included
```

### What won't change
- Existing `price_per_person`, `nights`, `days`, `destination_id` remain as-is (already seeded correctly)
- No schema changes needed — all target columns already exist

