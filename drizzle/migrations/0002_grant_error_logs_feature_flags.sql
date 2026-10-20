GRANT INSERT, SELECT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;