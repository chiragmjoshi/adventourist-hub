

## Plan: Delete Trip Cashflow, Add is_hot Column, Flush & Re-import Leads, Build Hot Lead Toggle

### Step 1: Database Changes (2 migrations)

**Migration A — Disable trigger (temporary)**
```sql
DROP TRIGGER IF EXISTS generate_traveller_code_trigger ON public.leads;
```

**Migration B — Add is_hot column**
```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_hot boolean DEFAULT false;
```

### Step 2: Delete orphan trip_cashflow record

Use the insert tool (supports DELETE) to remove the single trip_cashflow record tied to traveller_code `AP2600002`.

### Step 3: Flush existing leads and related data

Using the bulk-sql edge function (temporarily re-deployed):
1. `DELETE FROM lead_timeline`
2. `DELETE FROM lead_comments`
3. `DELETE FROM automations_log WHERE lead_id IS NOT NULL`
4. `DELETE FROM leads`

### Step 4: Import 10,929 leads from CSV

Parse `leads_import_final.csv` with a Python script. Map columns including `is_hot`. Insert in batches via the bulk-sql edge function.

Column mapping:
- `traveller_code, name, email, mobile, sales_status, disposition, platform, channel, campaign_type, ad_group, travel_date, notes, is_hot, created_at`

### Step 5: Re-enable trigger & cleanup

Migration to re-create trigger with WHEN clause. Delete bulk-sql edge function.

### Step 6: Build Hot Lead Fire Toggle in CRM

**Lead Management table** (`LeadManagement.tsx`):
- Add a 🔥 fire icon next to each lead name — orange/filled when `is_hot = true`, gray/outline when false
- Clicking the fire icon toggles `is_hot` in the database (stops event propagation so it doesn't navigate to detail)

**Lead Detail page** (`LeadDetail.tsx`):
- Add a fire toggle button in the lead header area
- Clicking toggles `is_hot` with optimistic update and toast feedback

### Technical details
- Fire icon: `Flame` from lucide-react (already imported in LeadDetail)
- Toggle uses a mutation that updates `is_hot` on the leads table
- No new dependencies needed

