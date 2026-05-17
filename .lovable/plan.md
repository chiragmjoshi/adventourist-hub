# Two-part fix: customer identity + close-the-loop UX

## Part 1 — Email as canonical customer identity

**Today's behaviour**

- `traveller_code` is the soft grouping key (e.g. `JA2200002`).
- Nothing prevents the same email from getting a second code — Minal Patel has `JA2200002` *and* `MA2400034` for `aaravconsultancy1@gmail.com`. That's why her cashflow didn't appear on the newer lead.

**Target rule**

> **One email = one traveller_code. Multiple leads and multiple trips are allowed under that single code.**

### Changes

1. **Lead creation lookup (front + edge function)**
   - Before assigning a new traveller_code, check `leads` for the same `email` (case-insensitive). If found, reuse that lead's `traveller_code` for the new lead.
   - Apply in:
     - `supabase/functions/submit-lead/index.ts` (public form submissions)
     - The CMS "Add Lead" insert path (Lead Management new-lead flow)
   - Only generate a fresh code via `generate_traveller_code` trigger when the email is brand new (or empty).

2. **Cashflow lookup unchanged**
   - Already widened to match by email/mobile across leads (shipped in the last fix), so it keeps working through the transition while old duplicates are being cleaned.

3. **Backfill duplicates (one-time data migration)**
   - For each `email` that appears under more than one `traveller_code`: pick the **oldest** code, rewrite the other leads (and their cashflows / timeline events) to point at the canonical code.
   - Run the script once, log every change to a small audit table so it's reversible.
   - Skip rows where email is `NULL` / empty — those stay as-is.

4. **Soft guard, not hard constraint**
   - We will **not** add a unique DB constraint on `email`, because the same person can legitimately have multiple leads (repeat traveller — that's the point). The uniqueness lives at the application layer: "if email exists, reuse its code".

---

## Part 2 — "File Closed" → quick Trip Cashflow modal

**Today's behaviour**

When sales_status flips to **File Closed**, a dialog asks "Create cashflow?". Clicking it inserts a near-empty `trip_cashflow` row and the user has to open the full edit page separately. The full edit page has vendors, margins, GST, etc. — that's an ops job, not a sales job at close time.

**Target flow**

```
Lead → Notes / disposition updated → Tagged
    → Sales marks "File Closed"
    → Quick Cashflow modal opens (sales-friendly fields only)
    → On submit: trip_cashflow row created in stage `trip_sold`
    → Ops team later opens Trip Cashflow page to add vendors / margins / docs
```

### Quick Cashflow modal — fields only the salesperson knows

Prefilled from lead where possible:

- Traveller name (prefilled, read-only)
- Traveller code (prefilled, read-only)
- Destination (prefilled, editable dropdown)
- Itinerary (prefilled, editable dropdown filtered by destination)
- **Travel start date** (prefilled from `lead.travel_date`)
- **Travel end date** (auto = start + itinerary.nights when available; editable)
- **Booking date** (defaults to today)
- **Pax count** (prefilled from `lead.pax_count`, defaults to 1)
- **Selling price (final, agreed with customer)** — single number
- **GST billing?** yes/no toggle (defaults to yes)
- Notes (optional)

**Not in the modal** (kept on the full Trip Cashflow page for ops):
- Vendor line items, cost-per-pax, margin %, payment status, invoice URLs, PAN card.

### Actions in the modal

- **Save Cashflow** — inserts `trip_cashflow` with `trip_stage = 'trip_sold'`, `status = 'draft'`, populated with the fields above, `lead_id` set, and a `lead_timeline` "cashflow_created" event.
- **Skip for now** — closes the lead without creating any cashflow row (no orphan shells).
- After save, the existing trip-start / trip-end reminders auto-creation continues to fire (unchanged).

---

## Technical details

### Files to touch

- `src/pages/LeadDetail.tsx` — replace the existing `<Dialog>` (lines 928–941) with a new `<QuickCashflowModal>`. Remove the old `handleCreateCashflow` shell-insert.
- `src/components/QuickCashflowModal.tsx` *(new)* — modal component with the field set above; uses lookups already cached by `AppLayout` prefetch.
- `src/pages/LeadManagement.tsx` (or wherever new leads are created in CMS) — add email lookup before insert.
- `supabase/functions/submit-lead/index.ts` — add email lookup before insert; reuse existing `traveller_code` if found.

### Data migration

- New SQL migration `merge_duplicate_traveller_codes`:
  - CTE finds `email → oldest traveller_code` per email.
  - Updates `leads`, `trip_cashflow`, `lead_timeline.metadata` (only where traveller_code is stored) and any other table that references the obsolete code.
  - Writes affected pairs to a new `traveller_code_merges` audit table `(email, old_code, new_code, merged_at)`.
- Run once via migration tool, then leave the script in place for future re-runs (idempotent).

### No UI/styling change beyond the modal

Existing brand tokens (Blaze / Abyss / Ridge), spacing, and dialog patterns are reused. Active design system stays untouched.

---

## What I'll need from you before implementing

1. Confirm the **field list** for the Quick Cashflow modal above. Add or remove any field? (e.g. do you want "advance received" captured here too?)
2. Confirm the **backfill** is OK to run on production data. The audit table makes it reversible, but I want explicit go-ahead before touching live rows.
3. For the email lookup on lead creation: should it be **case-insensitive and trim whitespace** (recommended), or strict match?
