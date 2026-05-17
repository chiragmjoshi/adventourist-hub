## Fix destination update error + duplicate options

Two unrelated bugs surfaced in the screenshot:

### 1. `invalid input syntax for type integer: "Apr"`

`destinations.best_months` and `itineraries.best_months` are `integer[]` columns (1–12), but the UI stores/sends month name strings (`"Apr"`, `"May"`, …). Saving fails as soon as a month chip is selected.

Fix in `src/pages/Destinations.tsx` and `src/pages/ItineraryEdit.tsx`:
- Keep `MONTHS` array as the chip labels (1-indexed maps cleanly: `Jan=1 … Dec=12`).
- On load: convert `integer[]` from DB → month-name `string[]` for form state.
- On save: convert form `string[]` → `integer[]` (`MONTHS.indexOf(m) + 1`) before writing.
- Apply same conversion to the read-only month list rendered in the Destinations table row.

LandingPages uses `time_to_visit text[]` already — no change.

### 2. Duplicate categorization options

`master_values` has 21 duplicate rows across `destination_type` (14) and `destination_suitable_type` (7) — one set was inserted by the seed migration, another by the legacy import. Data fix only, no code change:

```sql
DELETE FROM master_values mv
USING master_values dup
WHERE mv.type = dup.type
  AND mv.value = dup.value
  AND mv.type IN ('destination_type','destination_suitable_type')
  AND mv.ctid > dup.ctid;     -- keep the earliest row, drop later copies
```

### Verification

1. Reopen Destinations → Edit any row → toggle months/themes → Save → toast success, no RLS / type errors in console.
2. Categorization tab shows each chip exactly once.
3. Repeat on Itineraries edit page.

No schema changes; the only DB write is the dedupe `DELETE`.
