DROP POLICY IF EXISTS "All authenticated read settings" ON public.settings;
DROP POLICY IF EXISTS "Super admin manage settings" ON public.settings;

CREATE POLICY "Super admin read settings" ON public.settings
FOR SELECT TO authenticated
USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Super admin manage settings" ON public.settings
FOR ALL TO authenticated
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Finance and above view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Admin manage vendors" ON public.vendors;

CREATE POLICY "Operations view vendors" ON public.vendors
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance','operations'));

CREATE POLICY "Finance manage vendor payments" ON public.vendors
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin','finance'));

DROP POLICY IF EXISTS "Authenticated users can view trip_cashflow_vendors" ON public.trip_cashflow_vendors;
DROP POLICY IF EXISTS "Authenticated users can manage trip_cashflow_vendors" ON public.trip_cashflow_vendors;
ALTER TABLE public.trip_cashflow_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance view cashflow vendors" ON public.trip_cashflow_vendors
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance','operations'));

CREATE POLICY "Finance manage cashflow vendors" ON public.trip_cashflow_vendors
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin','finance'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin','finance'));

DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own non-role fields" ON public.users;

CREATE POLICY "Users update own non-role fields" ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can view automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Authenticated users can manage automation_rules" ON public.automation_rules;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view automation_rules" ON public.automation_rules
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Admin manage automation_rules" ON public.automation_rules
FOR ALL TO authenticated
USING (public.current_user_role() IN ('super_admin','admin'))
WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_adv_traveller_code()
RETURNS text LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year text; v_prefix text; v_seq int;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_prefix := 'ADV-' || v_year;
  INSERT INTO public.traveller_code_sequence (year_prefix, last_sequence)
  VALUES (v_prefix, 1)
  ON CONFLICT (year_prefix)
  DO UPDATE SET last_sequence = traveller_code_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  RETURN v_prefix || '-' || lpad(v_seq::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql
SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;