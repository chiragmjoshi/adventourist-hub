ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS email_hero_title text,
  ADD COLUMN IF NOT EXISTS email_hero_subtitle text,
  ADD COLUMN IF NOT EXISTS email_cta_url text,
  ADD COLUMN IF NOT EXISTS email_cta_label text;