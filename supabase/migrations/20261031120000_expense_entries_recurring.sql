-- Phase E3 — recurring materialisation for expense_entries
--
-- Two mechanisms work together:
--   1. AFTER-INSERT trigger: when a row is inserted with
--      is_recurring=true and no recurring_group_id, it stamps a new
--      group id on itself and writes 11 future monthly rows under the
--      same group id.
--   2. Monthly cron: for each active recurring_group_id, extends the
--      horizon one month forward until max(entry_date) >= today + 11
--      months. Keeps a rolling 12-month window as time passes.
--
-- The trigger's WHEN clause skips auto-created future rows (they
-- carry recurring_group_id already) so there's no infinite recursion.
--
-- Edit / delete semantics:
--   * Single-row delete  = that month only, lives in the UI today.
--   * "Stop recurring from this month" (E2 button, this PR adds it)
--     deletes the current row + every future row sharing the same
--     recurring_group_id. Past rows stay as history.

-- ─────────────── Trigger: materialise on insert ───────────────

CREATE OR REPLACE FUNCTION public.materialise_recurring_expense()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  gid uuid := gen_random_uuid();
  i   int;
BEGIN
  -- Stamp the originating row with the new group id.
  UPDATE public.expense_entries
     SET recurring_group_id = gid
   WHERE id = NEW.id;

  -- Create 11 future rows (one per month). Postgres' + interval
  -- '1 month' smart-handles end-of-month: 2026-01-31 + 1 month =
  -- 2026-02-28 (or 29 in a leap year), so we don't need extra logic.
  FOR i IN 1..11 LOOP
    INSERT INTO public.expense_entries (
      entry_date, head, sub_head, amount, is_recurring,
      recurring_group_id, notes, created_by
    ) VALUES (
      (NEW.entry_date + (i || ' months')::interval)::date,
      NEW.head, NEW.sub_head, NEW.amount, true,
      gid, NEW.notes, NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expense_entries_materialise_recurring ON public.expense_entries;
CREATE TRIGGER expense_entries_materialise_recurring
  AFTER INSERT ON public.expense_entries
  FOR EACH ROW
  WHEN (NEW.is_recurring = true AND NEW.recurring_group_id IS NULL)
  EXECUTE FUNCTION public.materialise_recurring_expense();

COMMENT ON FUNCTION public.materialise_recurring_expense() IS
  'Phase E3 — on INSERT with is_recurring=true and no group id, stamps a group id + inserts 11 future monthly rows under it. The WHEN clause on the trigger prevents re-entry on the auto-inserted rows.';

-- ─────────────── Cron: horizon extension ───────────────

CREATE OR REPLACE FUNCTION public.extend_recurring_expenses()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grp     record;
  touched int := 0;
BEGIN
  FOR grp IN
    SELECT recurring_group_id, MAX(entry_date) AS max_date
      FROM public.expense_entries
     WHERE recurring_group_id IS NOT NULL
     GROUP BY recurring_group_id
  LOOP
    -- Each pass advances one month. Loop until horizon is at least
    -- 11 months out; the UI's 12-month window is thereby covered.
    WHILE grp.max_date < CURRENT_DATE + INTERVAL '11 months' LOOP
      INSERT INTO public.expense_entries (
        entry_date, head, sub_head, amount, is_recurring,
        recurring_group_id, notes, created_by
      )
      SELECT
        (grp.max_date + INTERVAL '1 month')::date,
        head, sub_head, amount, true, recurring_group_id, notes, created_by
        FROM public.expense_entries
       WHERE recurring_group_id = grp.recurring_group_id
       ORDER BY entry_date DESC
       LIMIT 1;

      grp.max_date := (grp.max_date + INTERVAL '1 month')::date;
      touched := touched + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'extend_recurring_expenses: inserted % rows across all groups', touched;
  RETURN touched;
END;
$$;

COMMENT ON FUNCTION public.extend_recurring_expenses() IS
  'Phase E3 — monthly cron. For each recurring_group_id, extends max(entry_date) forward in 1-month steps until it reaches today + 11 months. Uses the latest row in each group as the template so edits to the amount/head propagate automatically.';

-- Schedule: 02:00 UTC on day 1 of each month (07:30 IST).
-- pg_cron idempotent-schedule pattern — unschedule first in case
-- a prior deploy left it, then re-create.
DO $$
BEGIN
  PERFORM cron.unschedule('extend_recurring_expenses_monthly')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'extend_recurring_expenses_monthly'
    );
EXCEPTION WHEN undefined_table THEN
  -- cron.job doesn't exist in environments without pg_cron;
  -- the schedule below will fail there, which is fine for local tests.
  NULL;
END $$;

SELECT cron.schedule(
  'extend_recurring_expenses_monthly',
  '0 2 1 * *',
  $cron$SELECT public.extend_recurring_expenses();$cron$
);
