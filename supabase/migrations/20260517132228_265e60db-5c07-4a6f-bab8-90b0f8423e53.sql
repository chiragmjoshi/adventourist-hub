ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS template_id text NOT NULL DEFAULT 'bold';
COMMENT ON COLUMN public.landing_pages.template_id IS 'Visual template: bold | minimal | story';