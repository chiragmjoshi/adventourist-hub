## Goal

Import the full Hostinger production dump (`u227287316_advprod`) into the new Supabase schema cleanly — preserving every customer, lead, itinerary, landing page, timeline event, UTM tracking row, master value, user and role assignment — while mapping the old Laravel structure onto our normalised UUID-based design.

## Source vs Target

Source dump contains 19 relevant tables. Mapping to current Supabase:

| Source (MariaDB) | Target (Supabase) | Notes |
|---|---|---|
| `customers` (~5.9k) | `customers` (new table) | Holds traveller master record — currently missing in Supabase, must be created |
| `customer_documents`, `customer_tags`, `customer_tag_customer` | `customer_documents`, `customer_tags` (new) | Optional, low value — keep as-is |
| `destinations` (37) | `destinations` | Map name/about; generate slug |
| `destination_pictures` (~199) | `destinations.gallery` (jsonb) + hero on first | Rewrite `file_path` to public Hostinger CDN URL (or rehost later) |
| `destination_testimonials` (~111) | `destinations.testimonials` (jsonb) | Embed name/city/description |
| `destination_time_to_visits` (~185) | `destinations.best_months` (int[]) | Map enum months → 1..12; "Throughout the Year" → all |
| `destination_types` (~278, general/suitable) | `destinations.themes` / `suitable_for` (text[]) | Resolve `type` FK via `masters` |
| `masters` (124) | `master_values` | Map enum `type` → our `type` strings (`platform`, `campaign_type`, `sales_status`, `disposition`, `ad_group`, `channel`, `destination_theme`, `destination_suitable`, `city`) |
| `itineraries` (~80) | `itineraries` | Headline, about, pricing_per_person, days_data (jsonb), inclusion/exclusion, SEO meta, status `Published→published` |
| `itineraryables` (~526) | `itineraries.gallery` / `testimonials` | Resolve polymorphic FK → embed picture URLs and testimonials JSON onto itinerary |
| `landing_pages` (~50) | `landing_pages` | Map FK ids (platform/campaign/channel/template/destination/itinerary) using master + itinerary id maps |
| `landing_pageables` (~56) | `landing_pages.gallery` | Same flattening approach |
| `leads` (~5910) | `leads` | Resolve `customer_id` → new customer UUID; map `sales_status_id/disposition_id/platform_id/...` via masters; convert `remarks` JSON → text/jsonb |
| `lead_timelines` (~6.5k) | `lead_timeline` | Map `type` enum → `event_type`; copy headline/description into `note`/`metadata` |
| `lead_trackings` (~180) | `leads` (UTM columns) or new `lead_tracking` table | Currently no UTM cols on `leads` — add table `lead_tracking` to preserve verbatim |
| `users` (~5) | `users` + `auth.users` | Create Supabase auth user per email; map `role_id` → role text via `roles` table; password reset email sent (Laravel bcrypt hashes are not portable) |
| `roles`, `permissions`, `permission_role`, `role_user` | `role_permissions` | Convert to our role enum (`super_admin`/`admin`/`sales`/`operations`/`finance`) — manual mapping from old role names |

Items we intentionally skip: `failed_jobs`, `jobs`, `migrations`, `feedbacks`, `leads_backup`.

## Strategy

1. **Convert MySQL dump → PostgreSQL CSVs** locally (Python + `pymysqlparse` / regex). One CSV per source table written to `/tmp/import/`.
2. **Schema additions** via one migration:
   - `customers` (UUID, traveller_code, name, email, mobile, dob, anniversary, address, profile_image, legacy_id int)
   - `lead_tracking` (UUID, lead_id FK, all UTM + click-id columns, legacy_id int)
   - `customer_documents`, `customer_tags`, `customer_tag_customer` (only if user wants — default yes, lossless)
   - Add `legacy_id int unique` column to every target table that maps from a legacy integer PK. This is the bridge — keeps every old ID recoverable and lets the loader resolve FKs deterministically, then we can drop the column later.
   - Add missing columns on `leads` if any (e.g. `is_hot bool`, `source text`, `source_id int`, `remarks jsonb`).
3. **Import order** (FK-safe), using `supabase.storage_upload` for nothing here — pure SQL `COPY` via `psql`:
   1. `master_values` (build legacy→UUID map by legacy_id)
   2. `destinations` (+ flatten pictures/testimonials/months/types into jsonb/arrays)
   3. `customers`
   4. `users` + auth users (script via service role)
   5. `itineraries` (+ flatten itineraryables)
   6. `landing_pages` (+ flatten landing_pageables)
   7. `leads` (resolve customer_id, itinerary_id, master ids)
   8. `lead_timeline`
   9. `lead_tracking`
4. **Image assets**: legacy paths like `media/destination_pics/...` are relative to old CMS host. Step 1 of import keeps them as full URLs pointing at `https://adventourist.com/media/...` (assuming the old host still serves them) so nothing breaks. A later optional step can rehost into the `itinerary-images` Supabase bucket.
5. **Validation**: after each step, assert source vs target row counts match within tolerance; produce a `/mnt/documents/migration_report.md` with totals, skipped rows, unmapped masters, and any FK orphans.
6. **Rollback**: every loader runs in a single transaction per table and writes only rows with non-null `legacy_id`. To redo, `DELETE WHERE legacy_id IS NOT NULL` then re-run.

## Technical details

```text
/tmp/import/
  ├── parse_dump.py        # MySQL → CSV (handles JSON cols, enum quoting, NULL)
  ├── load.py              # Reads CSVs, calls Supabase via service role / psql COPY
  ├── maps/                # legacy_id → uuid lookups persisted as JSON
  └── report.md
```

Order of loader runs matters — earlier tables' UUID maps feed later FK resolution. All maps cached so partial reruns are cheap.

User accounts: we cannot port bcrypt hashes from Laravel into Supabase auth. We will create each `auth.users` row with a random password and trigger a password-reset email — please confirm this is acceptable (otherwise we keep them disabled until first login via magic link).

## Open questions / decisions

1. Confirm bcrypt → reset-email flow for the 5 users (or prefer magic-link invites?).
2. Should `customer_documents` / tags be migrated, or skipped? (~0 visible rows in dump, low risk either way.)
3. Image assets: keep absolute legacy URLs for now, rehost later — OK?
4. After verification, do you want me to drop the `legacy_*` tables (`legacy_users`, `legacy_destinations`, …) and the temporary `legacy_id` bridge columns?

Once you approve, the implementation steps are: write the schema migration → run the parse + load scripts → publish the migration_report.md artifact for you to review.
