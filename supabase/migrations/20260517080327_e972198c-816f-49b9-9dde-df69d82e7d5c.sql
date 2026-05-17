
-- ITINERARIES: keep public read of published + authenticated read; tighten writes
DROP POLICY IF EXISTS "Authenticated users can manage itineraries" ON public.itineraries;

CREATE POLICY "Editors manage itineraries"
ON public.itineraries
FOR ALL
TO authenticated
USING (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text]))
WITH CHECK (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text]));

-- LANDING_PAGES: remove anon SELECT (site uses public-api edge function with service role); tighten writes
DROP POLICY IF EXISTS "Public can view active landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Authenticated users can manage landing_pages" ON public.landing_pages;

CREATE POLICY "Editors manage landing_pages"
ON public.landing_pages
FOR ALL
TO authenticated
USING (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text]))
WITH CHECK (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text]));

-- MASTER_VALUES: keep authenticated read; restrict writes
DROP POLICY IF EXISTS "Authenticated users can manage master_values" ON public.master_values;

CREATE POLICY "Admin manage master_values"
ON public.master_values
FOR ALL
TO authenticated
USING (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- LEAD_COMMENTS: tighten to roles that work leads
DROP POLICY IF EXISTS "Authenticated users can create lead comments" ON public.lead_comments;
DROP POLICY IF EXISTS "Authenticated users can view lead comments" ON public.lead_comments;

CREATE POLICY "Sales+ view lead_comments"
ON public.lead_comments
FOR SELECT
TO authenticated
USING (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text, 'operations'::text, 'finance'::text]));

CREATE POLICY "Sales+ insert lead_comments"
ON public.lead_comments
FOR INSERT
TO authenticated
WITH CHECK (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text, 'operations'::text]));

-- REMINDERS: tighten to roles that act on leads/trips
DROP POLICY IF EXISTS "Authenticated users full access to reminders" ON public.reminders;

CREATE POLICY "Sales+ manage reminders"
ON public.reminders
FOR ALL
TO authenticated
USING (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text, 'operations'::text]))
WITH CHECK (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'sales'::text, 'operations'::text]));

-- USERS: trigger guard preventing role/is_active escalation by non super_admin
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Service role / no auth context: allow
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();

  IF caller_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only super_admin can change user role';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Only super_admin can change is_active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_prevent_role_escalation ON public.users;
CREATE TRIGGER users_prevent_role_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
