## Trips Kanban — fix blank board & UX additions

### Current state (verified by reading `src/pages/TripsKanban.tsx`)
The file **already** uses `travel_start_date` / `travel_end_date`, already selects `pax_count`, and already renders pax. So FIX 1 and FIX 5 are largely no-ops. The real gaps are: no error surface, unsafe stage fallback, no urgency badge, no completed-toggle, and existing rows may have NULL `trip_stage`.

### Changes to `src/pages/TripsKanban.tsx`

1. **Expose query error** — destructure `isError, error: queryError` from `useQuery`.
2. **Error banner** — above the kanban scroll container, render a destructive banner when `isError` is true.
3. **Safe stage grouping** — replace `const k = t.trip_stage || "trip_sold"` with:
   ```ts
   const k = (t.trip_stage && STAGES.find(s => s.key === t.trip_stage))
     ? t.trip_stage : "trip_sold";
   ```
4. **Urgency badge** — add a red (≤7d) / amber (≤30d) `Badge` right after the `cashflow_code` line using `differenceInDays` (already imported). Keep the existing `T-{d}d` top-right badge untouched (it only covers ≤14d and lives in a different spot — both are fine, or we can drop the duplicate if you prefer; default: keep both since spec says additive).
5. **"Show completed" toggle** — add `hideCompleted` state (default `true`), render a checkbox next to the existing "Mine only" switch in the header, and filter `trips` in the `grouped` memo when active.
6. **No changes** to drag/drop (none exists here — only click-advance), card click nav, mutations, or dialogs.

### Database backfill (separate migration)
```sql
UPDATE trip_cashflow
SET trip_stage = 'trip_sold'
WHERE trip_stage IS NULL AND status <> 'cancelled';
```
Run via migration tool so existing rows surface in the "Trip Sold" column.

### Out of scope
Column rename fixes (already correct), pax display (already present), styling/layout changes, other pages.
