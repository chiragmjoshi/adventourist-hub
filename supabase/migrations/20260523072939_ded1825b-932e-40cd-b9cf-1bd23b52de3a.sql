
-- Restore column-level SELECT to authenticated; we'll rely on the role-restricted RLS policy instead.
GRANT SELECT (bank_account, bank_ifsc, bank_name, bank_micr, bank_swift) ON public.vendors TO authenticated;

-- Drop the permissive lookup policy so only privileged roles can SELECT base table directly.
DROP POLICY IF EXISTS v_select_lookup ON public.vendors;
