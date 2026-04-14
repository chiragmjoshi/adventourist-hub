
-- Add new columns to landing_pages table
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS itinerary_id uuid REFERENCES public.itineraries(id),
  ADD COLUMN IF NOT EXISTS hero_image text,
  ADD COLUMN IF NOT EXISTS stay_days text,
  ADD COLUMN IF NOT EXISTS destination_type text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS testimonial_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS custom_inclusions text,
  ADD COLUMN IF NOT EXISTS custom_exclusions text,
  ADD COLUMN IF NOT EXISTS gallery text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS why_adventourist text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS form_title text DEFAULT 'Enquire for Free',
  ADD COLUMN IF NOT EXISTS form_subtitle text DEFAULT 'Our travel experts will call you, ask your queries without hesitation.',
  ADD COLUMN IF NOT EXISTS form_terms_label text,
  ADD COLUMN IF NOT EXISTS form_submit_text text DEFAULT 'Submit',
  ADD COLUMN IF NOT EXISTS form_after_submit_message text DEFAULT 'Thank you! We''ll call you within 24 hours.',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add unique constraint on slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_slug_key') THEN
    ALTER TABLE public.landing_pages ADD CONSTRAINT landing_pages_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
