# Legacy Trip Cashflow Import — 203 rows

## CSV validation results

| Check | Result |
|---|---|
| Total rows | 203 |
| Required fields (traveller_code, name, vendor_code_1, vendor_cost, selling_price) | All present |
| Vendor codes referenced | 62 unique, **all exist** in vendors table |
| Date format | All valid ISO (`YYYY-MM-DD`) where present |
| Numeric fields | All parse cleanly |
| Multi-vendor rows | 14 (2–4 vendors each, combined `vendor_cost`) |
| Empty `travel_end_date` / `booking_date` / `destination_name` | 203 / 203 / 203 → will be NULL (expected) |
| Empty `zoho_invoice_ref` | 63 → will be NULL |

## Flags to confirm (not blockers)

1. **27 duplicate `traveller_code` values** (same traveller, multiple trips — e.g. `OT2200001` appears 4×, `NV1900005` 3×). Each becomes its own cashflow row with its own `cashflow_code`. Confirm this is the intent (not data error).
2. **4 rows where `selling_price < vendor_cost`** (negative margin, contradicts the positive `margin_percent` column):
   - Row 62 `OT2200001` — cost 73,500 / sold 73,400
   - Row 122 `AU2400021` — cost 196,108 / sold 173,960
   - Row 130 `SP2400005` — cost 201,851 / sold 200,000
   - Row 166 `OT2500007` — cost 168,039 / sold 162,000.30
   I'll import as-is (we'll trust the `margin_percent` value from CSV rather than recomputing). You can fix in-app later.

## Import behavior

For each CSV row, create:

**1) `trip_cashflow` row**
- `traveller_code`, `traveller_name`, `travel_start_date`, `pax_count` from CSV
- `cashflow_code` — auto-generated from `cashflow_code_sequence` using the year of `travel_start_date`
- `agreed_selling_price` ← `selling_price`
- `margin_percent` ← CSV value (kept as-is, even if inconsistent)
- `trip_stage` = `trip_sold`, `status` = `closed` (legacy → closed)
- `gst_billing` = true (default)
- `zoho_invoice_ref`, `notes` from CSV
- `destination_id`, `itinerary_id`, `lead_id`, `assigned_to`, `created_by` = NULL
- `is_customized` = false

**2) `trip_cashflow_vendors` row(s)** — one per non-empty `vendor_code_N`
- For single-vendor rows: full `vendor_cost` goes to vendor 1
- For multi-vendor rows: **entire combined `vendor_cost` on vendor 1**, vendors 2–4 get `cost_per_pax_incl_gst = 0` and `amount_paid = 0`. Per-vendor split is preserved in the `notes` field on `trip_cashflow` (already done in CSV). This keeps trip totals exact without inventing splits.
- `service_type` = `'legacy'`
- `payment_status` = `'paid'` (legacy trips, settled)
- `amount_paid` = `cost_per_pax_incl_gst` (fully paid)
- `sort_order` = 1, 2, 3, 4

## Execution

Single SQL migration that:
1. Creates a temp table, loads the 203 rows
2. Loops: insert `trip_cashflow` (RETURNING id), insert linked `trip_cashflow_vendors`
3. Returns count + sample of inserted `cashflow_code`s for verification

After approval, I'll run the migration. No app code changes needed.

## Switch to build mode to proceed
Reply with any adjustments (especially the 4 negative-margin rows and the multi-vendor split convention), then switch to build mode and I'll run the import.
