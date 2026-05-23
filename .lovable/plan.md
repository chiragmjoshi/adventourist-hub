## Goal

All 203 imported legacy trip cashflows (`cashflow_code LIKE 'LTC%'`) currently have `destination_id = NULL`, so they show as "—" in the Trip Cashflow list. Each legacy row already has 1–4 vendors linked via `trip_cashflow_vendors`, and each vendor has a `serve_destinations` array of destination UUIDs. We'll infer the trip's destination from those vendors on a best-effort basis.

## Coverage check (already verified)

- 203 / 203 legacy trips have at least one vendor that serves at least one destination → 100% resolvable.
- 104 are unambiguous (only one candidate destination across all linked vendors).
- 99 have multiple candidates and will need a tie-breaker.

## Inference rule

For each legacy trip cashflow:

1. Gather every destination across all its linked vendors' `serve_destinations`.
2. Count "votes" — a destination served by more of the trip's vendors wins.
3. Tie-breaker: prefer the destination served by the **primary vendor** (lowest `trip_cashflow_vendors.sort_order`, i.e. vendor 1 from the import).
4. Final tie-breaker: stable order by destination id.

Only updates rows where `destination_id IS NULL` and `cashflow_code LIKE 'LTC%'`. Live trips (`TC26…`) are not touched.

## Execution

Single data update (via insert tool, since this is data not schema):

```sql
WITH exploded AS (
  SELECT tc.id AS cf_id, d_id_text::uuid AS d_id, tcv.sort_order
  FROM trip_cashflow tc
  JOIN trip_cashflow_vendors tcv ON tcv.cashflow_id = tc.id
  JOIN vendors v ON v.id = tcv.vendor_id
  CROSS JOIN LATERAL unnest(coalesce(v.serve_destinations, ARRAY[]::text[])) AS d_id_text
  WHERE tc.cashflow_code LIKE 'LTC%'
    AND tc.destination_id IS NULL
    AND d_id_text ~ '^[0-9a-f-]{36}$'
),
votes AS (
  SELECT cf_id, d_id, count(*) AS votes, min(sort_order) AS best_sort
  FROM exploded GROUP BY cf_id, d_id
),
picked AS (
  SELECT DISTINCT ON (cf_id) cf_id, d_id
  FROM votes
  ORDER BY cf_id, votes DESC, best_sort ASC, d_id
)
UPDATE trip_cashflow tc
SET destination_id = p.d_id, updated_at = now()
FROM picked p
WHERE tc.id = p.cf_id;
```

## Verification

After the update, confirm:
- `SELECT count(*) FROM trip_cashflow WHERE cashflow_code LIKE 'LTC%' AND destination_id IS NULL` → 0
- Spot-check 5 random legacy trips against their vendors.

## Scope notes

- No schema change, no code change — this is a one-shot data backfill.
- Itinerary stays NULL (no reliable signal from vendors for that).
- If you later correct any wrongly-tagged trip in the UI, the change sticks — we won't re-run this automatically.
