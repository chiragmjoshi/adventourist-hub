-- Phase 2.5b — scope writes on trip_cashflow and trip_cashflow_vendors
--
-- Current policies (verified via pg_policies before this migration):
--   tc_select_auth  SELECT  authenticated  USING (true)
--   tc_insert_auth  INSERT  authenticated  WITH CHECK (true)
--   tc_update_auth  UPDATE  authenticated  USING (true) WITH CHECK (true)
--   tc_delete_admin DELETE  authenticated  USING (is_admin_or_higher())
--   (same quartet for trip_cashflow_vendors)
--
-- SELECT stays broad on purpose — several reports (SalesReport,
-- RevenueReport, ConversionReport, DestinationReport, PlatformROI,
-- TripOperationsReport) read these to aggregate numbers for roles that
-- aren't operations / finance. The sensitive bit is the write path:
-- any authenticated user could create or edit cashflows (which embed
-- margin %, agreed sell price, and vendor cost prices).
--
-- UI gating already restricts /admin/trip-cashflow* to
--   {'operations','admin','super_admin','finance'}
-- (App.tsx line 198) so the new RLS matches that set — no user-facing
-- regression for people who stayed inside the UI.
--
-- Idempotent + reverse SQL:
--   DROP POLICY IF EXISTS tc_insert_scoped  ON public.trip_cashflow;
--   DROP POLICY IF EXISTS tc_update_scoped  ON public.trip_cashflow;
--   DROP POLICY IF EXISTS tcv_insert_scoped ON public.trip_cashflow_vendors;
--   DROP POLICY IF EXISTS tcv_update_scoped ON public.trip_cashflow_vendors;
--   CREATE POLICY tc_insert_auth  ON public.trip_cashflow         FOR INSERT TO authenticated WITH CHECK (true);
--   CREATE POLICY tc_update_auth  ON public.trip_cashflow         FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
--   CREATE POLICY tcv_insert_auth ON public.trip_cashflow_vendors FOR INSERT TO authenticated WITH CHECK (true);
--   CREATE POLICY tcv_update_auth ON public.trip_cashflow_vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Writers allowed = roles that can reach the UI wizard.
-- Keep it in sync with App.tsx /admin/trip-cashflow route guard.
DROP POLICY IF EXISTS tc_insert_auth   ON public.trip_cashflow;
DROP POLICY IF EXISTS tc_update_auth   ON public.trip_cashflow;
DROP POLICY IF EXISTS tc_insert_scoped ON public.trip_cashflow;
DROP POLICY IF EXISTS tc_update_scoped ON public.trip_cashflow;

CREATE POLICY tc_insert_scoped ON public.trip_cashflow
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = ANY (ARRAY['super_admin','admin','operations','finance']));

CREATE POLICY tc_update_scoped ON public.trip_cashflow
  FOR UPDATE TO authenticated
  USING      (public.current_user_role() = ANY (ARRAY['super_admin','admin','operations','finance']))
  WITH CHECK (public.current_user_role() = ANY (ARRAY['super_admin','admin','operations','finance']));

DROP POLICY IF EXISTS tcv_insert_auth   ON public.trip_cashflow_vendors;
DROP POLICY IF EXISTS tcv_update_auth   ON public.trip_cashflow_vendors;
DROP POLICY IF EXISTS tcv_insert_scoped ON public.trip_cashflow_vendors;
DROP POLICY IF EXISTS tcv_update_scoped ON public.trip_cashflow_vendors;

CREATE POLICY tcv_insert_scoped ON public.trip_cashflow_vendors
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = ANY (ARRAY['super_admin','admin','operations','finance']));

CREATE POLICY tcv_update_scoped ON public.trip_cashflow_vendors
  FOR UPDATE TO authenticated
  USING      (public.current_user_role() = ANY (ARRAY['super_admin','admin','operations','finance']))
  WITH CHECK (public.current_user_role() = ANY (ARRAY['super_admin','admin','operations','finance']));

COMMENT ON POLICY tc_insert_scoped ON public.trip_cashflow
  IS 'Phase 2.5b — only super_admin / admin / operations / finance can create a trip cashflow.';
COMMENT ON POLICY tc_update_scoped ON public.trip_cashflow
  IS 'Phase 2.5b — only super_admin / admin / operations / finance can edit a trip cashflow.';
COMMENT ON POLICY tcv_insert_scoped ON public.trip_cashflow_vendors
  IS 'Phase 2.5b — only super_admin / admin / operations / finance can add vendor cost lines.';
COMMENT ON POLICY tcv_update_scoped ON public.trip_cashflow_vendors
  IS 'Phase 2.5b — only super_admin / admin / operations / finance can edit vendor cost lines.';
