-- Phase E1 — expense_entries ledger + head catalogue + flag
--
-- Replaces the single-amount-per-month monthly_expenses table with a
-- line-item ledger so the Dashboard's Net Margin can break down into
-- per-head categories. monthly_expenses stays intact — this is strictly
-- additive. Phase E4 will migrate the Dashboard calc + backfill one
-- "Legacy lumpsum" row per historical month so the net-margin chart
-- doesn't regress.
--
-- Decisions locked:
--   E-1 (head list): 12 heads approved by the user
--   E-2 (back-dated entries): allowed — no CHECK on entry_date
--   E-3 (backfill monthly_expenses): yes, handled in E4
--   E-4 (taxes): excluded ("raw expenses for broad profitability")

-- ─────────────── master_values catalogue ───────────────
-- Widen the type CHECK to admit the new 'expense_head' domain, then
-- seed the 12 approved values. Pattern mirrors A1.

ALTER TABLE public.master_values
  DROP CONSTRAINT IF EXISTS master_values_type_check;

ALTER TABLE public.master_values
  ADD CONSTRAINT master_values_type_check CHECK (type IN (
    'platform', 'channel', 'campaign_type', 'ad_group',
    'sales_status', 'disposition',
    'destination_type', 'destination_suitable_type',
    'service_type', 'city',
    'invalid_lead_reason', 'closed_lost_reason', 'closed_won_reason',
    'expense_head'
  ));

INSERT INTO public.master_values (type, value, is_active, sort_order)
SELECT * FROM (VALUES
  ('expense_head', 'Salary',                  true, 10),
  ('expense_head', 'Rent',                    true, 20),
  ('expense_head', 'Utilities',               true, 30),
  ('expense_head', 'Software / Tools',        true, 40),
  ('expense_head', 'Office Supplies',         true, 50),
  ('expense_head', 'Travel',                  true, 60),
  ('expense_head', 'Professional Fees',       true, 70),
  ('expense_head', 'Insurance',               true, 80),
  ('expense_head', 'Repairs & Maintenance',   true, 90),
  ('expense_head', 'Communication',           true, 100),
  ('expense_head', 'Bank Charges',            true, 110),
  ('expense_head', 'Other',                   true, 120)
) AS t(type, value, is_active, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_values m
  WHERE m.type = t.type AND m.value = t.value
);

-- ─────────────── expense_entries table ───────────────
--
-- month_year is a GENERATED column from entry_date so queries that group
-- by month (Dashboard, E5 report) stay index-friendly without the UI
-- having to pass both. STORED so the index below actually lands.

CREATE TABLE IF NOT EXISTS public.expense_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date            date NOT NULL,
  month_year            text GENERATED ALWAYS AS (to_char(entry_date, 'YYYY-MM')) STORED,
  head                  text NOT NULL,
  sub_head              text,
  amount                numeric(14,2) NOT NULL CHECK (amount >= 0),
  is_recurring          boolean NOT NULL DEFAULT false,
  recurring_group_id    uuid,
  notes                 text,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Dashboard / expense report group by month; the UI page groups by head.
CREATE INDEX IF NOT EXISTS expense_entries_month_year_idx
  ON public.expense_entries (month_year);
CREATE INDEX IF NOT EXISTS expense_entries_head_idx
  ON public.expense_entries (head);
CREATE INDEX IF NOT EXISTS expense_entries_recurring_group_idx
  ON public.expense_entries (recurring_group_id)
  WHERE recurring_group_id IS NOT NULL;

-- Shared updated_at trigger (same function used by feature_flags +
-- marketing_spends).
DROP TRIGGER IF EXISTS expense_entries_set_updated_at ON public.expense_entries;
CREATE TRIGGER expense_entries_set_updated_at
  BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────── RLS ───────────────
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated. The Dashboard chart and the Expense Report
-- are route-gated separately — RLS is lenient to let any authed query
-- aggregate without blowing up.
DROP POLICY IF EXISTS "expense_entries_select_auth" ON public.expense_entries;
CREATE POLICY "expense_entries_select_auth"
  ON public.expense_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: admin + super_admin only (E2 UI will be gated the same way).
-- Finance is deliberately NOT a writer here — different scope from
-- the existing monthly_expenses finance+admin policy; expenses in this
-- ledger affect the company P&L view admins own.
DROP POLICY IF EXISTS "expense_entries_insert_admin" ON public.expense_entries;
CREATE POLICY "expense_entries_insert_admin"
  ON public.expense_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_higher());

DROP POLICY IF EXISTS "expense_entries_update_admin" ON public.expense_entries;
CREATE POLICY "expense_entries_update_admin"
  ON public.expense_entries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_higher())
  WITH CHECK (public.is_admin_or_higher());

DROP POLICY IF EXISTS "expense_entries_delete_admin" ON public.expense_entries;
CREATE POLICY "expense_entries_delete_admin"
  ON public.expense_entries
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_higher());

-- Belt-and-braces: strip the PostgREST anon grant.
REVOKE ALL ON TABLE public.expense_entries FROM anon;

-- ─────────────── Feature flag ───────────────
INSERT INTO public.feature_flags (key, description)
VALUES (
  'feature:expense_entries',
  'Line-item operating-expense ledger. Replaces monthly_expenses lumpsums in Phase E4. Phase E.'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.expense_entries IS
  'Line-item operating expenses with head/sub_head/recurring. Phase E1. Dashboard migration in E4.';
