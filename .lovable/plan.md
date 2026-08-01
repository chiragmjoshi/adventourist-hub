## What I verified in the database

- `leads.sales_status` values are Title Case: `File Lost` (5119), `File Closed` (305), `Quote Sent` (226), `Contacted` (150), `New Lead` (36), `Invalid Lead` (25), null (28). There is **no** `file_closed` value anywhere.
- Total leads = 5889. Google/Paid/Search Ads leads include 111 `File Closed` (Ladakh Search alone), so Google closed is definitely not zero.
- `Google` + `Search Ads` are correctly tagged `channel = Paid` — that grouping is right, no data fix needed there.
- `trip_cashflow`: 211 rows, only **7** have a `lead_id`, only 11 have `booking_date`; effective dates span 2020-10-09 → 2026-09-28. All 211 have a destination.
- `trip_cashflow` has **no foreign key** on `destination_id`, so PostgREST embeds like `trip_cashflow.select("*, destination:destinations(name)")` fail (same 400 already fixed in Revenue Report).

## Confirmed defects

1. **Case mismatch → always zero** (`Platform ROI`, `Team Performance`, `Dashboard`): compare against `file_closed`, `contacted`, `quote_sent`. This is the exact cause of "Google shows 0 closed".
2. **Silent 1000-row cap**: Sales, Conversion, Destination, Team Performance, Platform ROI fetch leads with no `.limit()`, so PostgREST returns at most 1000 of 5889 rows. Every count and conversion % on those pages is understated.
3. **Broken embed**: `DestinationReport` joins `destinations` off `trip_cashflow` — returns an error, so cashflow revenue silently drops to zero there.
4. **Two different revenue formulas**: Revenue Report uses `vendorCost x (1 + margin%)`; Platform ROI uses `vendorCost / (1 - margin%)`. Same trip reports different revenue on different pages.
5. **Attribution gap**: Platform ROI attributes cashflow revenue via `lead_id`, but only 7 of 211 trips have one — so ~97% of revenue lands in "Direct" regardless of platform.
6. **Inconsistent close definition**: some reports count `File Closed` only, others `File Closed OR disposition = Query Closed`.
7. **Inconsistent date defaults**: Platform ROI starts last year, Sales Report last 12 months, Revenue Report 2020 — so the same period shows different totals page to page.

## Plan

**A. Shared reporting layer** — new `src/lib/reporting.ts`:
- Canonical status constants (`File Closed`, `Quote Sent`, ...) plus a normalizer that accepts legacy snake_case, so no page hardcodes strings again.
- One `isClosed(lead)` = `sales_status === "File Closed" || disposition === "Query Closed"`, used everywhere.
- One `effectiveDate(cashflow)` = `booking_date -> travel_start_date -> created_at`.
- One `calcTrip(cashflow, vendorLines)` implementing the Revenue Report formula (vendor cost x pax, + margin %, + 5% GST when `gst_billing`) as the single source of truth.
- A paged fetch helper that loops in 1000-row pages so full lead/cashflow sets load.
- Shared default range: FY-to-date with an "All time" option, identical across every report.

**B. Per-report fixes**
- `PlatformROI`: use shared helpers; fix status casing; paged lead fetch; switch revenue to the canonical formula; attribute cashflow revenue by `lead_id` when present, else fall back to matching on `traveller_code`, else bucket as "Unattributed" (shown as its own row rather than silently inflating "Direct"). Add a note when unattributed revenue exists.
- `TeamPerformance`: fix casing for closed/contacted/quoted; paged fetch.
- `Dashboard`: fix `file_closed` in the funnel, KPI count and monthly rollup.
- `DestinationReport`: drop the broken embed, fetch destinations separately and map client-side; paged lead fetch.
- `SalesReport`, `ConversionReport`: paged fetch; adopt shared `isClosed`.
- `RevenueReport`, `VendorReport`, `TripOperationsReport`: swap local math for the shared `calcTrip`/`effectiveDate` so numbers reconcile.

**C. Verification**
Cross-check each page in the browser against direct database counts: total leads 5889, File Closed 305, Google closed > 0, total trips 211, and confirm Revenue Report and Platform ROI report the same total revenue for the same period.

## Not changing
The Google/Search-under-Paid mapping — the database is already correct there.

## Technical notes
No schema migration required. All changes are client-side in `src/lib/reporting.ts`, `src/pages/Dashboard.tsx` and the seven files under `src/pages/reports/`.
