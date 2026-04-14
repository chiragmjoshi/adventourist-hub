

## Plan: Complete MySQL-to-Supabase Data Migration (Zero Compromise)

### What's Already Done (Supabase Current State)
- **10,929 leads** imported from CSV (superset of MySQL's 5,908)
- **40 destinations**, **72 itineraries**, **101 master values**, **1 landing page**
- **0 timeline entries**, **0 comments**, **0 notes** — this is the gap

### What's Missing

| Data | MySQL Count | Supabase Count | Gap |
|------|------------|----------------|-----|
| Lead timeline entries | 6,212 | 0 | All missing |
| Lead remarks/notes (JSON in leads.remarks) | ~4,790 leads with remarks | 0 (notes column is NULL for all) | All missing |
| is_hot flags | 2 hot leads | Already have column, but CSV may not have set correctly | Needs verification |
| Customer tags (Repeat Customer, Nagging, etc.) | 6 tags, 2 assignments | customer_tag column exists but empty | Needs import |
| Feedbacks | 17 | No table | Skip (test data) |
| DOB / Anniversary | All NULL in MySQL | — | Nothing to import |

### Migration Steps

#### Step 1: Build the mapping chain (Python script)
MySQL `lead_timelines.lead_id` → MySQL `leads.customer_id` → MySQL `customers.traveller_code` → Supabase `leads.traveller_code` → Supabase `leads.id`

Parse the SQL dump to build:
- `customers` lookup: MySQL customer_id → traveller_code
- `leads` lookup: MySQL lead_id → customer_id
- `masters` lookup: MySQL master_id → value text (for disposition/sales_status resolution)

#### Step 2: Import 6,212 lead_timeline entries
For each MySQL `lead_timelines` row:
- Map `lead_id` → `traveller_code` → Supabase `leads.id` (UUID)
- Map MySQL `type` → Supabase `event_type` (e.g., `lead_entry`, `disposition_updated`, `called_client`, etc.)
- Map `headline` → `note` field
- Parse `description` (JSON array of remarks) → extract into `metadata` field
- Insert via the bulk-import edge function in batches

~5,159 of 5,165 unique lead_ids can be traced to traveller_codes. The remaining 6 will be skipped (orphaned).

#### Step 3: Extract and update lead notes from MySQL remarks
MySQL `leads.remarks` contains JSON arrays like:
```json
[{"datetime":"2023-01-04","remark":"Called, interested in Ladakh"},{"datetime":"2022-04-26","remark":"Self-drive, needs hotel options"}]
```
For each lead:
- Map MySQL `lead.customer_id` → `traveller_code` → Supabase `leads.id`
- Flatten the JSON remarks array into a readable text block (newest first)
- Update Supabase `leads.notes` with the concatenated remarks

#### Step 4: Sync is_hot flags from MySQL
Only 2 leads are hot in MySQL. Verify/update them in Supabase by traveller_code.

#### Step 5: Import customer tags
Update the 2 tagged customers' `customer_tag` field in Supabase leads (tag "Hello" for customer 2234, "Information Seeker Only" for customer 5132).

#### Step 6: Cleanup
Delete the bulk-import edge function after all imports are complete.

### Technical Details
- All imports use the existing `bulk-import` edge function (already deployed)
- Python script parses the MySQL dump file directly — no MySQL connection needed
- Batched inserts (50-100 rows per batch) to avoid timeouts
- Supabase `lead_timeline` columns used: `lead_id` (UUID), `event_type`, `note`, `metadata` (JSON), `created_at`
- No schema migrations needed — all target columns already exist
- 6 orphan timeline entries (MySQL lead_ids with no matching customer) will be logged and skipped

### Data Integrity Checks (Post-Import)
- Verify `lead_timeline` count matches expected (~6,200)
- Verify `leads.notes` are populated for ~4,790 leads
- Verify 2 hot leads are correctly flagged
- Verify 2 customer tags are set

