CREATE TABLE IF NOT EXISTS public.api_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  external_publish_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api_settings"
  ON public.api_settings FOR SELECT
  TO authenticated
  USING (public.is_admin_or_higher());

CREATE POLICY "Admins can update api_settings"
  ON public.api_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_higher())
  WITH CHECK (public.is_admin_or_higher());

INSERT INTO public.api_settings (id, external_publish_enabled)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();