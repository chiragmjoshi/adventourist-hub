## Lead Management — filter & search UX fixes

Four problems to fix on `/admin/leads`. All changes are scoped to `src/pages/LeadManagement.tsx` and `src/components/DateRangePicker.tsx`.

### 1. Date picker — add "All Time" + "Custom Range"

`DateRangePicker.tsx` presets are extended:

- **This Month**
- **Last Month**
- **Last 3 Months**
- **Last 6 Months** (current default)
- **Last 12 Months**
- **This Year**
- **All Time** — sets `from = 2020-01-01` (or min `created_at` from DB; static date is simpler), `to = today`. Trigger button shows "All time" instead of the date range.
- **Custom Range** — keeps the popover open so the user picks two dates on the calendar; only closes on second click. Today the popover auto-closes the moment a `from` is picked, which breaks custom selection. Fix: only close when `range.from && range.to` are both set AND a preset wasn't used; keep open otherwise.

Display: when `from <= 2020-01-01`, the trigger button reads "All time" instead of "Jan 1, 2020 – May 18, 2026".

### 2. Search should ignore the date filter

Today, the search box (`name / email / mobile / traveller_code`) is AND-ed with the date range. So searching "Minal" while the range is "Last 6 Months" misses older leads.

Fix: when `search.trim().length > 0`, drop the `gte/lte created_at` clauses in both `applyBaseFilters` (leads page query) and the chip-count query. Show a subtle hint chip next to the search input: "Searching across all dates" with a small × to clear the search.

This matches user mental model: typing in search = global lookup, filters = browsing.

### 3. Remove "More / Less" — show all filters inline

The bar has room for the Ad Group filter. Remove `moreFilters` state and the toggle button; always render Destination, Platform, Channel, Campaign, **Ad Group** in one row. On <1280px screens the bar wraps to two rows naturally (`flex-wrap`).

### 4. Persist filters & search across navigation

Today, opening a lead and clicking Back resets everything because state is component-local. Two practical options — recommend **(b)**:

- **(a)** URL query params (`?from=…&to=…&q=…&dest=…&disp=…`). Bookmarkable & shareable but more code.
- **(b) sessionStorage**, key `leadmgmt.filters.v1` — restored on mount, written on every change. Survives back-navigation within the session, cleared on browser close. Minimal code, no URL noise. Reset button also clears the storage entry.

Will implement **(b)**. Stored shape:

```ts
{ dateFrom, dateTo, filterDestination, filterPlatform, filterChannel,
  filterCampaign, filterAdGroup, search, activeDispositions: string[],
  activeStatuses: string[], currentPage }
```

On mount: `useState` initializers read from sessionStorage and fall back to current defaults. A single `useEffect` writes the snapshot whenever any of those values change. `resetFilters()` also calls `sessionStorage.removeItem(...)`.

### Out of scope

No UI restyling, no schema changes, no business-logic changes — purely filter/search behaviour and the date picker presets.