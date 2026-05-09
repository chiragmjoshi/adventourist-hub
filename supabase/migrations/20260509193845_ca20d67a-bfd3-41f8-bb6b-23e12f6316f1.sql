CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Public can submit leads" ON public.leads;

CREATE POLICY "Role-based lead access" ON public.leads
FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('super_admin','admin','finance','operations')
  OR assigned_to = auth.uid()
);

CREATE POLICY "Admin manage leads" ON public.leads
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','operations'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin','operations'));

CREATE POLICY "Sales update assigned leads" ON public.leads
FOR UPDATE TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.vendors;

CREATE POLICY "Finance and above view vendors" ON public.vendors
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance','operations'));

CREATE POLICY "Admin manage vendors" ON public.vendors
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

DROP POLICY IF EXISTS "Authenticated users can view trip_cashflow" ON public.trip_cashflow;
DROP POLICY IF EXISTS "Authenticated users can manage trip_cashflow" ON public.trip_cashflow;

CREATE POLICY "Finance and above view cashflow" ON public.trip_cashflow
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance','operations'));

CREATE POLICY "Operations and above manage cashflow" ON public.trip_cashflow
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance','operations'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin','finance','operations'));

DROP POLICY IF EXISTS "Authenticated users can view automations_log" ON public.automations_log;
DROP POLICY IF EXISTS "Authenticated users can manage automations_log" ON public.automations_log;
ALTER TABLE public.automations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only automations_log" ON public.automations_log
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

DROP POLICY IF EXISTS "Authenticated users can view automation_executions" ON public.automation_executions;
DROP POLICY IF EXISTS "Authenticated users can manage automation_executions" ON public.automation_executions;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only automation_executions" ON public.automation_executions
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

CREATE POLICY "Own profile or admin sees all users" ON public.users
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Users update own profile" ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Super admin manage users" ON public.users
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;

CREATE POLICY "All authenticated read settings" ON public.settings
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin manage settings" ON public.settings
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Authenticated users can view automation_settings" ON public.automation_settings;
DROP POLICY IF EXISTS "Authenticated users can manage automation_settings" ON public.automation_settings;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated read automation_settings" ON public.automation_settings
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage automation_settings" ON public.automation_settings
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated users can manage role_permissions" ON public.role_permissions;

CREATE POLICY "All authenticated read role_permissions" ON public.role_permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin only manage roles" ON public.role_permissions
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

ALTER TABLE public.traveller_code_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_code_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_code_sequence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage sequence" ON public.traveller_code_sequence;
DROP POLICY IF EXISTS "Authenticated users can manage cashflow_code_sequence" ON public.cashflow_code_sequence;
DROP POLICY IF EXISTS "Authenticated users can manage vendor_code_sequence" ON public.vendor_code_sequence;

CREATE POLICY "Admin view traveller_sequence" ON public.traveller_code_sequence
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Admin view cashflow_sequence" ON public.cashflow_code_sequence
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Admin view vendor_sequence" ON public.vendor_code_sequence
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'));

UPDATE storage.buckets
SET public = false
WHERE id IN ('vendor-docs', 'cashflow-docs', 'documents', 'trip-documents', 'vendor-documents');

DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view documents" ON storage.objects;

CREATE POLICY "Finance view private documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id NOT IN ('itinerary-images','stories')
  AND public.current_user_role() IN ('super_admin','admin','finance','operations')
);

CREATE POLICY "Operations upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id NOT IN ('itinerary-images','stories')
  AND public.current_user_role() IN ('super_admin','admin','finance','operations')
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.increment_story_views(story_slug text)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE stories SET views = views + 1
  WHERE slug = story_slug AND is_published = true;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can view lead_timeline" ON public.lead_timeline;
DROP POLICY IF EXISTS "Authenticated users can manage lead_timeline" ON public.lead_timeline;

CREATE POLICY "Role-based lead_timeline access" ON public.lead_timeline
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('super_admin','admin','finance','operations')
  OR EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_timeline.lead_id
    AND leads.assigned_to = auth.uid()
  )
);

CREATE POLICY "Admin manage lead_timeline" ON public.lead_timeline
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','operations'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin','operations'));