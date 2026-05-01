## Issue

Bhargav's trip cashflow `AU2500008` exists in `trip_cashflow` with `traveller_code = AU2500008` but `lead_id = NULL`. The Trips tab query only matches `lead_id IN (...)`, so the row is filtered out.

The same issue affects the Lead Management loyalty dot — counts are only built from `traveller_code` on the cashflow row (that part already works), but the bulk query is fine.

## Fix

In `src/pages/LeadDetail.tsx`, change the `lead_trips` query so it matches a cashflow row when EITHER:

- `trip_cashflow.lead_id` is in the set of lead IDs sharing this traveller_code, OR
- `trip_cashflow.traveller_code` equals the current lead's traveller_code

Replace the current `.in("lead_id", leadIds)` with a Supabase `.or(...)` filter:

```ts
const orParts: string[] = [];
if (leadIds.length > 0) orParts.push(`lead_id.in.(${leadIds.join(",")})`);
if (l?.traveller_code) orParts.push(`traveller_code.eq.${l.traveller_code}`);

let q = supabase
  .from("trip_cashflow")
  .select("*, itineraries(headline, destinations(name))")
  .order("created_at", { ascending: false });
if (orParts.length > 0) q = q.or(orParts.join(","));
const { data, error } = await q;
```

Everything downstream (vendor cost lookup, financial calc, trip cards, summary bar) already handles the rows correctly — no other changes needed.

## Optional follow-up (not part of this fix)

The cashflow row has `lead_id = NULL` because it was created before lead-linking existed (or the link was lost). If you want, I can also backfill `trip_cashflow.lead_id` from `traveller_code` for all such rows in a separate migration. Let me know.
