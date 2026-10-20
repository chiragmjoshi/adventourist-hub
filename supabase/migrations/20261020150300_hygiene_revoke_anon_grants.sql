-- Phase 2.5d — hygiene: revoke the Supabase default anon grants on the
-- two tables PR #1 added. Both are gated by RLS so this is defence in
-- depth rather than a hole-closing fix: if someone later disables RLS
-- during a migration or accidentally adds a FOR ... TO anon policy, the
-- anon role would still have no table-level grant to lean on.
--
-- Explicit minimal grants after the revoke:
--   error_logs   authenticated: SELECT (RLS further restricts to super_admin)
--                authenticated: INSERT (RLS lets any authenticated INSERT)
--                service_role:  ALL    (edge functions + Supabase internals)
--   feature_flags authenticated: SELECT (RLS allows SELECT to authenticated)
--                 authenticated: INSERT, UPDATE, DELETE (RLS restricts to super_admin)
--                 service_role:  ALL
--
-- No grants are added to anon on either table.
--
-- Reverse SQL (to re-apply Supabase defaults):
--   GRANT ALL ON public.error_logs    TO anon;
--   GRANT ALL ON public.feature_flags TO anon;

REVOKE ALL ON public.error_logs    FROM anon;
REVOKE ALL ON public.feature_flags FROM anon;

GRANT SELECT, INSERT                     ON public.error_logs    TO authenticated;
GRANT ALL                                ON public.error_logs    TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE     ON public.feature_flags TO authenticated;
GRANT ALL                                ON public.feature_flags TO service_role;

COMMENT ON TABLE public.error_logs    IS 'Client-side exceptions captured by ErrorBoundary. Append-only; super_admin SELECT only. Phase 0.5 / grants cleaned up in Phase 2.5d.';
COMMENT ON TABLE public.feature_flags IS 'Master kill-switch registry. Resolve with public.is_feature_enabled(key). Phase 0.6 / grants cleaned up in Phase 2.5d.';
