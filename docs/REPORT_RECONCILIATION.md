# Report reconciliation guide

**Status:** Phase QA · updated at the end of Phase E (2026-10-31).

This document is the single-source map of **which report shows what number, and where it comes from**. If you ever see two reports disagree on the same metric for the same filter window, this doc tells you which one is wrong.

The rule everyone else follows: **every metric below has one canonical formula in `src/lib/reporting.ts`.** Reports that invent their own aggregation are the bug.

---

## Canonical helpers · `src/lib/reporting.ts`

| Helper | What it does | Why it exists |
|---|---|---|
| `calcTrip(cf, vendorCostPerPax)` | Returns `{sellingExGst, totalVendorCost, grossMargin, marginAmount, gstAmount}` for one trip | Every report that quotes revenue/vendor cost uses this exact shape |
| `effectiveDate(cf)` | Resolves `booking_date ?? travel_start_date ?? created_at` → `Date` | Legacy imports have only `travel_start_date`; new rows have `booking_date` — this picks the right one |
| `inRange(date, from, to)` | `date >= from && date <= endOfSelectedDay(to)` | Inclusive on both ends |
| `endOfSelectedDay(date)` | Pushes `date` to `23:59:59.999` | Makes `to` boundaries end-of-day; critical for same-day filters |
| `vendorCostMap(lines)` | Sums `cost_per_pax_incl_gst` per `cashflow_id` | Report needs cost per cashflow, not per vendor row |
| `isClosed(lead)` | `sales_status in ('File Closed')` | What "converted" means in this CRM |
| `displayPlatform(value)` | Null → "Direct", else as-is | So "no platform" and "unknown" don't render as empty cells |
| `fetchCashflows(cols?)` / `fetchCashflowVendors(ids, cols?)` | Chunked pagination over `trip_cashflow` + `trip_cashflow_vendors` | PostgREST hard-caps a response at 1000 rows — these auto-page |

**If you add a new report, import these.** Don't re-implement.

---

## Reports × metrics matrix

Legend:
- `✅` canonical path (uses the shared helper)
- `✖` doesn't surface this metric
- `⚠` surfaces a derived variant — see per-report notes below

| Metric | Dashboard | Sales | Revenue | Conversion | Destination | Platform ROI | Platform Perf (M6) | Ad Feedback (A3) | Expenses (E5) | P&L (E6) | Team | Vendor | Trip Ops |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Leads (count) | ✅ | ✅ | ✖ | ✅ | ✖ | ✅ | ✅ | ✅ | ✖ | ✖ | ✅ | ✖ | ✖ |
| Closed Files | ✅ | ✅ | ✖ | ✅ | ✖ | ✅ | ✅ | ✅ | ✖ | ✖ | ✅ | ✖ | ✖ |
| Revenue (ex-GST) | ✅ | ✖ | ✅ | ✖ | ✅ | ✅ | ✅ | ✅ | ✖ | ✅ | ✅ | ✅ | ⚠ (per trip) |
| Vendor Cost | ✅ | ✖ | ⚠ (via margin) | ✖ | ⚠ (via margin) | ✖ | ✅ | ✖ | ✖ | ✅ | ✖ | ✅ | ✖ |
| Gross Margin | ✅ | ✖ | ✅ | ✖ | ✅ | ✖ | ✅ | ✅ | ✖ | ✅ | ✖ | ✖ | ✖ |
| GST Collected | ✖ | ✖ | ✅ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Marketing Spend | ✅ (M5) | ✖ | ✖ | ✖ | ✖ | ✅ (M3) | ✅ (M6) | ✅ (A3) | ✖ | ✅ (E6) | ✖ | ✖ | ✖ |
| CPL / CAC / ROAS | ✖ | ✖ | ✖ | ✖ | ✖ | ✅ | ✅ | ✅ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Operating Expenses | ✅ (E4) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✅ (E5) | ✅ (E6) | ✖ | ✖ | ✖ |
| Net Margin (GM − OpEx) | ✅ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ⚠ (see below) | ✖ | ✖ | ✖ |
| Net Profit (GM − MKT − OpEx) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✅ | ✖ | ✖ | ✖ |
| Upcoming trips | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✅ |

**All ✅ entries pull from `src/lib/reporting.ts`.** Audit on 2026-10-31 confirms 11 of 11 report pages import from there.

### What ⚠ means on this page

- **Revenue Report / Destination Report "Vendor Cost (via margin)"** — these don't aggregate `trip_cashflow_vendors` directly. They derive vendor cost indirectly from `calcTrip().totalVendorCost`, which is itself `vendorCostPerPax × pax_count`. Numbers still reconcile with Dashboard/Platform Perf/P&L because the shared helper is the source.
- **Trip Ops "Revenue per trip"** — shows selling price per upcoming trip row, not aggregated. Reconciles trivially because it IS the per-trip number.
- **P&L Net Margin %** — the P&L report computes `Net Profit / Revenue` where Net Profit is after marketing + operating. The Dashboard's "Net Margin %" tile is `(Revenue − Vendor − OperatingExpenses) / Revenue` — same formula minus marketing spend. **Two different metrics using one label**, deliberately: the Dashboard tile is a familiar KPI, the P&L report is the full picture. If you want to see them side-by-side, the P&L report is authoritative. Dashboard tile is kept for backward comparability.

---

## Date-filter invariants

Every report that takes `from`/`to`:

1. Uses `effectiveDate(cf)` to bucket cashflows (NOT `created_at`, which is the import timestamp for legacy rows).
2. Uses `endOfSelectedDay(to)` so the right boundary is 23:59:59.999, not midnight.
3. For leads, uses `lead.created_at` directly (leads only have one date).
4. For marketing_spends, uses `overlap_days / span_days` proration — see "Marketing spend proration" below.
5. For expense_entries, filters by `month_year` (text) using `gte`/`lte` since the column is already `YYYY-MM`.

### Known timezone edge case (fixed)

`TripOperationsReport` previously used `new Date().toISOString().split('T')[0]` to compute "today" for the `travel_start_date >= today` filter. That returns UTC date, which rolls back 1 day between 00:00 and 05:30 IST — a trip departing today in IST silently disappeared from the "upcoming" slice. Fixed in Phase 3.5.4 to use IST wall-clock. **No other report has this issue** (verified during Phase QA audit).

---

## Attribution rules

### Cashflow → lead → platform

Every report that attributes revenue (or any cashflow metric) to a platform/channel/campaign/landing-page goes through this chain:

```
cashflow.lead_id
  → lead (preferred)
    → lead.platform / lead.destination_id / lead.landing_page_id
```

If `lead_id` is null (common on legacy imports — only ~7 of ~210 trips carry one), it falls back:

```
cashflow.traveller_code
  → lead by matching traveller_code
```

If both fail, the cashflow is bucketed as **"Unattributed"**. All 4 attribution-based reports (`PlatformROI`, `PlatformPerformance`, `AdFeedbackReport`, `LandingPageList`) use this same fallback chain.

### Marketing spend → lead

The attribution rule from Phase M-1 (option a):

- Spend row with **no** `landing_page_id` → prorates across every lead whose `platform` matches, in the overlap window.
- Spend row with `landing_page_id` set → prorates **only** against leads from that specific landing page (used in `LandingPageList`'s per-page CPL column).

Platform-wide spend is **never allocated per landing page** in the landing-pages list — otherwise it dilutes every page's CPL with a noise floor.

### Marketing spend proration

```
allocated = row.amount × overlap_days / span_days

overlap_days = max(0, min(filter_end, row.end_date) − max(filter_start, row.start_date) + 1)
span_days    = row.end_date − row.start_date + 1
```

Both bounds **inclusive**. A 1-Oct–31-Oct row has 31 billable days. A 7-day filter catching 3 of those days contributes `(3/31) × amount`.

**Reports that prorate the same way** (verified 2026-10-31):
- Platform ROI (M3)
- Platform Performance (M6)
- Landing Pages list (M4)
- Dashboard tile (M5) — month-level allocation
- Ad Feedback (A3)
- Combined P&L (E6)

---

## Known deliberate asymmetries

These are **not bugs**, documented so they aren't "fixed" by accident:

1. **Revenue Report's 12-month trend** ignores the date filter. Its header says so. The KPI tiles above it respect the filter; the trend is always the last 12 calendar months so the chart shape stays stable when ops narrows to a single month.

2. **Platform Performance's CPL trend** ignores the date filter for the same reason — always last 6 months, header note explicit.

3. **Dashboard "Net Margin %" tile excludes Marketing Spend.** Deliberately kept for backward comparability. Combined P&L (E6) is the correct "net" figure.

4. **Phase M4 Landing Pages list "Leads (in range)" column** respects the Last-30-days default, but the main `N leads` badge always shows the all-time count. Both numbers appear together to prevent the "0 in last 30 days" from reading as "no leads".

5. **TripOperationsReport "today" baseline** is IST wall-clock. All other reports accept whatever Date the user picks in the DateRangePicker.

---

## Changes that would break reconciliation

If any of the following happens, the matrix above needs a re-audit:

1. A new report page is added that doesn't import from `src/lib/reporting.ts`.
2. `calcTrip` adds a new return field OR changes the GST / margin formula.
3. `effectiveDate` priority order changes.
4. The spend proration formula changes.
5. A new flag path forks the data source (like E4 did with Dashboard; was handled, documented here).

---

## Audit tooling

Grep check — every report should import the shared helpers:

```bash
grep -L "lib/reporting" src/pages/reports/*.tsx
# expected output: nothing (every file imports the helpers)
```

As of this doc's writing, that command returns no files. If a future PR adds a report that fails this check, the PR template's reviewer checklist should flag it.

A Playwright golden-numbers test (planned but not shipped in Phase QA — needs a staging DB with deterministic seed data to be useful) would:

1. Log in as super_admin.
2. Visit Dashboard, Sales, Revenue, Platform ROI, P&L — same filter window on each.
3. Assert that the Revenue number is identical across all five.
4. Fail CI if any report drifts.

Out of scope for this phase but noted for a future hardening pass.
