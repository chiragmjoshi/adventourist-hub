-- Phase E4 — backfill monthly_expenses into expense_entries
--
-- One-off migration that copies every historical monthly_expenses row
-- into expense_entries as a single "Other / Legacy lumpsum" entry per
-- month. Keeps the Dashboard's net-margin chart intact when Phase E4's
-- code switch flips the Dashboard to read from expense_entries.
--
-- monthly_expenses stays in place as a read-only historical record.
-- No DROP, no column changes.
--
-- Idempotency: the NOT EXISTS guard means re-running this migration
-- (or running it on a DB where some rows were already backfilled)
-- is a no-op for already-copied months.
--
-- is_recurring = false is critical here — otherwise the
-- materialise_recurring_expense trigger (E3) would create 11 future
-- rows per legacy month, which would be wrong.

DO $$
DECLARE
  touched int;
BEGIN
  INSERT INTO public.expense_entries (
    entry_date, head, sub_head, amount, is_recurring, notes, created_by, created_at
  )
  SELECT
    (me.month_year || '-01')::date AS entry_date,
    'Other' AS head,
    'Legacy lumpsum' AS sub_head,
    me.amount,
    false AS is_recurring,
    COALESCE(me.notes, 'Backfilled from monthly_expenses on ' || to_char(now(), 'YYYY-MM-DD')),
    me.created_by,
    me.created_at
  FROM public.monthly_expenses me
  WHERE me.month_year IS NOT NULL
    AND me.amount IS NOT NULL
    AND me.amount > 0
    AND NOT EXISTS (
      SELECT 1
        FROM public.expense_entries ee
       WHERE ee.month_year = me.month_year
         AND ee.head = 'Other'
         AND ee.sub_head = 'Legacy lumpsum'
    );

  GET DIAGNOSTICS touched = ROW_COUNT;
  RAISE NOTICE 'Backfilled % monthly_expenses rows into expense_entries.', touched;
END $$;
