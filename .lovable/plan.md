## Final fixes for the Lead → Cashflow flow

I reproduced both issues on lead `JU2500001`. Diagnosis below, then the fix.

---

### Bug 1 — Trip doesn't show in the lead's Trips tab

The cashflow row `TC2600008` is correctly in the DB with `lead_id` and `traveller_code` matching the lead. The query that powers the Trips tab (`lead_trips`) is correct.

The problem is **stale react-query cache**. The global config sets `staleTime: 5 min`. When the user:
1. opens lead detail (caches `lead_trips` = empty),
2. opens the modal, creates the draft cashflow,
3. clicks into `/admin/trip-cashflow/...`, fills vendors + margin + saves,
4. clicks back to the lead,

…the LeadDetail page re-mounts but react-query serves the cached empty list. `TripCashflowEdit`'s save mutation only invalidates `["cashflow", id]` and `["cashflow_lines", id]` — never `["lead_trips", …]`.

**Fix**
- `LeadDetail` `lead_trips` query → `staleTime: 0, refetchOnMount: "always"`.
- `TripCashflowEdit` save mutation → also invalidate `["lead_trips"]` (broad, since the lead id may not be in scope at save time).

---

### Bug 2 — Selling price entered in the modal isn't in Trip Cashflow

`trip_cashflow` has no `selling_price` column. Selling price is derived: `vendor_cost × (1 + margin%) × (1 + gst)`. The "Final selling price" field in `QuickCashflowModal` is currently appended to the `notes` text and then forgotten — `TripCashflowEdit` never reads it, so ops can't see what was agreed and can't reconcile margin against it.

**Fix**
- Migration: add `agreed_selling_price numeric` to `trip_cashflow`.
- `QuickCashflowModal` writes `agreed_selling_price` (and stops stuffing it into `notes`).
- `TripCashflowEdit`:
  - Load `agreed_selling_price` into state.
  - In the Pricing & Margin step, show a read-only banner: **"Agreed selling price (set at file close): ₹X"** with a one-click **"Match this price"** button that back-solves `margin_percent` from the current vendor total and gst toggle, so the Pricing summary matches what the customer was quoted. User can still override margin manually.
  - Persist `agreed_selling_price` on save so it stays editable later.

---

### Files

- `supabase/migrations/...` — `ALTER TABLE public.trip_cashflow ADD COLUMN agreed_selling_price numeric;`
- `src/components/QuickCashflowModal.tsx` — write `agreed_selling_price`, drop the auto-note hack.
- `src/pages/LeadDetail.tsx` — `lead_trips` query options.
- `src/pages/TripCashflowEdit.tsx` — load/save `agreed_selling_price`, show banner + "Match this price" helper, invalidate `["lead_trips"]` on save.

No other pages touched. No public-site changes.

### Verification
1. On `JU2500001`, open Trips tab → **TC2600008 now appears** (cache fix).
2. Create a fresh File-Close on any lead, enter selling price ₹85,000, Save → open the resulting cashflow → Pricing step shows **"Agreed selling price: ₹85,000"** + "Match this price" button.
3. Add vendor lines, click Match → margin% is back-solved so final price = ₹85,000. Save → reopen → value persists.
4. Back to lead → Trips tab shows the new row immediately, no refresh needed.
