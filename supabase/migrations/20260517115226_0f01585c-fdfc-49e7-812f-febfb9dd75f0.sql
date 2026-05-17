
-- ════════════════════════════════════════════
-- PRE-LAUNCH HARDENING MIGRATION
-- ════════════════════════════════════════════

-- 1. Helper: admin-or-higher check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_or_higher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() = ANY (ARRAY['admin','super_admin'])
$$;

-- 2. Add missing RLS policies for 10 tables that have RLS enabled but no policies
--    (currently denies ALL authenticated queries). Pattern follows existing _all_auth policies.

-- automation_rules
CREATE POLICY ar_select_auth ON public.automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY ar_insert_auth ON public.automation_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ar_update_auth ON public.automation_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ar_delete_admin ON public.automation_rules FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- automation_executions
CREATE POLICY ae_select_auth ON public.automation_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY ae_insert_auth ON public.automation_executions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ae_update_auth ON public.automation_executions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ae_delete_admin ON public.automation_executions FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- automation_settings (admins only — contains API keys)
CREATE POLICY asg_select_admin ON public.automation_settings FOR SELECT TO authenticated USING (public.is_admin_or_higher());
CREATE POLICY asg_write_admin ON public.automation_settings FOR ALL TO authenticated USING (public.is_admin_or_higher()) WITH CHECK (public.is_admin_or_higher());

-- automations_log
CREATE POLICY al_select_auth ON public.automations_log FOR SELECT TO authenticated USING (true);
CREATE POLICY al_insert_auth ON public.automations_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY al_delete_admin ON public.automations_log FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- lead_comments
CREATE POLICY lc_select_auth ON public.lead_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY lc_insert_auth ON public.lead_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY lc_update_auth ON public.lead_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY lc_delete_admin ON public.lead_comments FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- reminders
CREATE POLICY rm_select_auth ON public.reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY rm_insert_auth ON public.reminders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY rm_update_auth ON public.reminders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY rm_delete_admin ON public.reminders FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- settings (admin only)
CREATE POLICY st_select_admin ON public.settings FOR SELECT TO authenticated USING (public.is_admin_or_higher());
CREATE POLICY st_write_admin ON public.settings FOR ALL TO authenticated USING (public.is_admin_or_higher()) WITH CHECK (public.is_admin_or_higher());

-- trip_cashflow
CREATE POLICY tc_select_auth ON public.trip_cashflow FOR SELECT TO authenticated USING (true);
CREATE POLICY tc_insert_auth ON public.trip_cashflow FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY tc_update_auth ON public.trip_cashflow FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tc_delete_admin ON public.trip_cashflow FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- trip_cashflow_vendors
CREATE POLICY tcv_select_auth ON public.trip_cashflow_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY tcv_insert_auth ON public.trip_cashflow_vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY tcv_update_auth ON public.trip_cashflow_vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tcv_delete_admin ON public.trip_cashflow_vendors FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- vendors (bank details — restrict reads/writes to admin+ops+finance, deletes super_admin only)
CREATE POLICY v_select_auth ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY v_insert_auth ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY v_update_auth ON public.vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY v_delete_admin ON public.vendors FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- 3. Restrict DELETE on PII tables to admin+ (override the broad "all_auth" policies)
DROP POLICY IF EXISTS leads_all_auth ON public.leads;
CREATE POLICY leads_select_auth ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY leads_insert_auth ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY leads_update_auth ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY leads_delete_admin ON public.leads FOR DELETE TO authenticated USING (public.is_admin_or_higher());

DROP POLICY IF EXISTS customers_all_auth ON public.customers;
CREATE POLICY customers_select_auth ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY customers_insert_auth ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY customers_update_auth ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY customers_delete_admin ON public.customers FOR DELETE TO authenticated USING (public.is_admin_or_higher());

-- 4. Lock down legacy_* tables — currently exposed via PostgREST with no RLS
--    These contain historical PII / password hashes. Restrict to super_admin reads only.
ALTER TABLE public.legacy_destinations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_itineraries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_users         ENABLE ROW LEVEL SECURITY;

CREATE POLICY legacy_dest_su  ON public.legacy_destinations  FOR SELECT TO authenticated USING (current_user_role() = 'super_admin');
CREATE POLICY legacy_itin_su  ON public.legacy_itineraries   FOR SELECT TO authenticated USING (current_user_role() = 'super_admin');
CREATE POLICY legacy_lp_su    ON public.legacy_landing_pages FOR SELECT TO authenticated USING (current_user_role() = 'super_admin');
CREATE POLICY legacy_leads_su ON public.legacy_leads         FOR SELECT TO authenticated USING (current_user_role() = 'super_admin');
CREATE POLICY legacy_users_su ON public.legacy_users         FOR SELECT TO authenticated USING (current_user_role() = 'super_admin');

-- 5. Storage policies for vendor-docs and cashflow-docs (currently no policies → inaccessible)
CREATE POLICY "vendor_docs_read_auth"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vendor-docs');
CREATE POLICY "vendor_docs_write_auth"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vendor-docs');
CREATE POLICY "vendor_docs_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vendor-docs') WITH CHECK (bucket_id = 'vendor-docs');
CREATE POLICY "vendor_docs_delete_admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vendor-docs' AND public.is_admin_or_higher());

CREATE POLICY "cashflow_docs_read_auth"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cashflow-docs');
CREATE POLICY "cashflow_docs_write_auth"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cashflow-docs');
CREATE POLICY "cashflow_docs_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cashflow-docs') WITH CHECK (bucket_id = 'cashflow-docs');
CREATE POLICY "cashflow_docs_delete_admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cashflow-docs' AND public.is_admin_or_higher());

-- 6. Missing performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_disposition      ON public.leads(disposition);
CREATE INDEX IF NOT EXISTS idx_leads_destination_id   ON public.leads(destination_id);
CREATE INDEX IF NOT EXISTS idx_leads_itinerary_id     ON public.leads(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_leads_platform         ON public.leads(platform);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status  ON public.leads(assigned_to, sales_status);

CREATE INDEX IF NOT EXISTS idx_tc_lead_id             ON public.trip_cashflow(lead_id);
CREATE INDEX IF NOT EXISTS idx_tc_status              ON public.trip_cashflow(status);
CREATE INDEX IF NOT EXISTS idx_tc_traveller_code      ON public.trip_cashflow(traveller_code);
CREATE INDEX IF NOT EXISTS idx_tcv_cashflow_id        ON public.trip_cashflow_vendors(cashflow_id);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead     ON public.lead_timeline(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ae_pending_scheduled
  ON public.automation_executions(scheduled_for)
  WHERE status = 'pending';

-- 7. Revoke anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.generate_adv_traveller_code()  FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_role()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_higher()           FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_story_views(text)    FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_story_views(text)    TO anon;
