-- Phase 2.5a — tighten RLS on public.monthly_expenses
--
-- Audit (via Supabase Security Advisor + direct pg_policies query) found
-- the only live policy on monthly_expenses was
--
--   CREATE POLICY me_all_auth ON public.monthly_expenses
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- so ANY authenticated user could read, create, edit or delete office
-- expense rows. This leaked financial data to every logged-in sales rep.
--
-- UI flows:
--   * Dashboard.tsx renders the expense editor (`ExpenseEditor.save()`,
--     line ~980) inside a card that is only shown to admin / finance roles.
--   * No other code path writes to monthly_expenses.
--
-- Replace the single all-authenticated policy with a role-scoped pair:
--   SELECT: admin, super_admin, finance
--   ALL (INSERT/UPDATE/DELETE): admin, super_admin, finance
--
-- Idempotent: DROP IF EXISTS before each CREATE. Safe to re-run.
--
-- Reverse SQL (for the follow-up revert migration if ever needed):
--   DROP POLICY IF EXISTS me_select_finance ON public.monthly_expenses;
--   DROP POLICY IF EXISTS me_write_finance  ON public.monthly_expenses;
--   CREATE POLICY me_all_auth ON public.monthly_expenses
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS me_all_auth       ON public.monthly_expenses;
DROP POLICY IF EXISTS me_select_finance ON public.monthly_expenses;
DROP POLICY IF EXISTS me_write_finance  ON public.monthly_expenses;

CREATE POLICY me_select_finance ON public.monthly_expenses
  FOR SELECT TO authenticated
  USING (public.current_user_role() = ANY (ARRAY['super_admin','admin','finance']));

CREATE POLICY me_write_finance ON public.monthly_expenses
  FOR ALL TO authenticated
  USING      (public.current_user_role() = ANY (ARRAY['super_admin','admin','finance']))
  WITH CHECK (public.current_user_role() = ANY (ARRAY['super_admin','admin','finance']));

COMMENT ON POLICY me_select_finance ON public.monthly_expenses
  IS 'Phase 2.5a — only super_admin / admin / finance can read office expenses.';
COMMENT ON POLICY me_write_finance ON public.monthly_expenses
  IS 'Phase 2.5a — only super_admin / admin / finance can create / edit / delete office expenses.';
