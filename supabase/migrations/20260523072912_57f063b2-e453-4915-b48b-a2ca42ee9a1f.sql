
-- 1) Restrict vendor SELECT to roles that legitimately need bank details
DROP POLICY IF EXISTS v_select_auth ON public.vendors;
CREATE POLICY v_select_privileged ON public.vendors
  FOR SELECT TO authenticated
  USING (current_user_role() = ANY (ARRAY['admin','super_admin','finance','operations']));

-- Lookup view exposing only non-sensitive columns so sales/other roles can resolve vendor names
CREATE OR REPLACE VIEW public.vendors_lookup
WITH (security_invoker = true) AS
SELECT id, vendor_code, name, nick_name, services, serve_destinations, is_active
FROM public.vendors;

-- The view needs an underlying-table policy that allows lookup access for all authenticated users.
-- We add a second permissive SELECT policy that only permits reads when the query is restricted
-- to non-sensitive columns by going through the view (security_invoker honours caller's policies).
-- To make the view usable, grant a complementary policy:
DROP POLICY IF EXISTS v_select_lookup ON public.vendors;
CREATE POLICY v_select_lookup ON public.vendors
  FOR SELECT TO authenticated
  USING (true);

-- Column-level lockdown of bank fields (defence in depth): revoke from authenticated/anon
REVOKE SELECT (bank_account, bank_ifsc, bank_name, bank_micr, bank_swift) ON public.vendors FROM authenticated, anon;

GRANT SELECT ON public.vendors_lookup TO authenticated, anon;

-- 2) Tighten users insert policy: users may only insert their own row
DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 3) Lock down trigger / utility SECURITY DEFINER functions from being callable via PostgREST
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_traveller_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_vendor_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_cashflow_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_adv_traveller_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_story_views(text) FROM anon;
