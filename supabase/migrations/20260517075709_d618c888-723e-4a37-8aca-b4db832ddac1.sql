
-- 1. Tighten automation_settings: drop broad authenticated SELECT
DROP POLICY IF EXISTS "All authenticated read automation_settings" ON public.automation_settings;

CREATE POLICY "Admin read automation_settings"
ON public.automation_settings
FOR SELECT
TO authenticated
USING (current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 2. Storage: remove broad authenticated policies on vendor-docs and cashflow-docs
DROP POLICY IF EXISTS "Authenticated users can view vendor docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view cashflow docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vendor docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cashflow docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vendor docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete cashflow docs" ON storage.objects;

-- 3. Add role-restricted DELETE for private docs (SELECT and INSERT already exist)
CREATE POLICY "Operations delete private documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = ANY (ARRAY['vendor-docs'::text, 'cashflow-docs'::text])
  AND current_user_role() = ANY (ARRAY['super_admin'::text, 'admin'::text, 'finance'::text, 'operations'::text])
);
