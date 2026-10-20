-- Phase 2.5c — scope writes on automation_rules / automation_executions /
-- automations_log to admin and super_admin
--
-- Current policies:
--   ar_*  (automation_rules):      INSERT/SELECT/UPDATE auth USING(true)/CHECK(true), DELETE admin+
--   ae_*  (automation_executions): INSERT/SELECT/UPDATE auth USING(true)/CHECK(true), DELETE admin+
--   al_*  (automations_log):       INSERT/SELECT auth USING(true)/CHECK(true), DELETE admin+
--
-- Risk today: any logged-in user could create or edit an automation rule
-- (sends email templates on triggers), fabricate an "execution" row, or
-- backfill the log. That is high-impact — rules fire real emails to real
-- customers.
--
-- UI gating already restricts /admin/automations to {'admin','super_admin'}
-- (App.tsx line 220). The automation engine itself runs under the service
-- role (process-automations edge function), which bypasses RLS entirely,
-- so cron-driven inserts/updates continue to work regardless of this
-- change.
--
-- SELECT remains broad because non-admin pages read these for status
-- display (e.g., TripCashflowDetail shows automation queue state).
--
-- Reverse SQL:
--   DROP POLICY IF EXISTS ar_insert_scoped ON public.automation_rules;
--   DROP POLICY IF EXISTS ar_update_scoped ON public.automation_rules;
--   DROP POLICY IF EXISTS ae_insert_scoped ON public.automation_executions;
--   DROP POLICY IF EXISTS ae_update_scoped ON public.automation_executions;
--   DROP POLICY IF EXISTS al_insert_scoped ON public.automations_log;
--   CREATE POLICY ar_insert_auth ON public.automation_rules
--     FOR INSERT TO authenticated WITH CHECK (true);
--   CREATE POLICY ar_update_auth ON public.automation_rules
--     FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
--   CREATE POLICY ae_insert_auth ON public.automation_executions
--     FOR INSERT TO authenticated WITH CHECK (true);
--   CREATE POLICY ae_update_auth ON public.automation_executions
--     FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
--   CREATE POLICY al_insert_auth ON public.automations_log
--     FOR INSERT TO authenticated WITH CHECK (true);

-- automation_rules
DROP POLICY IF EXISTS ar_insert_auth   ON public.automation_rules;
DROP POLICY IF EXISTS ar_update_auth   ON public.automation_rules;
DROP POLICY IF EXISTS ar_insert_scoped ON public.automation_rules;
DROP POLICY IF EXISTS ar_update_scoped ON public.automation_rules;

CREATE POLICY ar_insert_scoped ON public.automation_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_higher());

CREATE POLICY ar_update_scoped ON public.automation_rules
  FOR UPDATE TO authenticated
  USING      (public.is_admin_or_higher())
  WITH CHECK (public.is_admin_or_higher());

-- automation_executions
DROP POLICY IF EXISTS ae_insert_auth   ON public.automation_executions;
DROP POLICY IF EXISTS ae_update_auth   ON public.automation_executions;
DROP POLICY IF EXISTS ae_insert_scoped ON public.automation_executions;
DROP POLICY IF EXISTS ae_update_scoped ON public.automation_executions;

CREATE POLICY ae_insert_scoped ON public.automation_executions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_higher());

CREATE POLICY ae_update_scoped ON public.automation_executions
  FOR UPDATE TO authenticated
  USING      (public.is_admin_or_higher())
  WITH CHECK (public.is_admin_or_higher());

-- automations_log
DROP POLICY IF EXISTS al_insert_auth   ON public.automations_log;
DROP POLICY IF EXISTS al_insert_scoped ON public.automations_log;

CREATE POLICY al_insert_scoped ON public.automations_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_higher());

COMMENT ON POLICY ar_insert_scoped ON public.automation_rules
  IS 'Phase 2.5c — only admin+ can create automation rules.';
COMMENT ON POLICY ar_update_scoped ON public.automation_rules
  IS 'Phase 2.5c — only admin+ can edit automation rules.';
COMMENT ON POLICY ae_insert_scoped ON public.automation_executions
  IS 'Phase 2.5c — only admin+ can insert execution rows from the client. The cron edge function uses service_role which bypasses RLS.';
COMMENT ON POLICY ae_update_scoped ON public.automation_executions
  IS 'Phase 2.5c — only admin+ can edit execution rows from the client.';
COMMENT ON POLICY al_insert_scoped ON public.automations_log
  IS 'Phase 2.5c — only admin+ can write log entries from the client.';
