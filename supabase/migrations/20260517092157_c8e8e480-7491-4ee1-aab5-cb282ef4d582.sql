
-- ============ leads: additive ============
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sales_status text,
  ADD COLUMN IF NOT EXISTS platform     text;

-- ============ helpers ============
-- Drop the role-check function temporarily; it references public.users
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;

-- ============ users ============
ALTER TABLE public.users RENAME TO legacy_users;

CREATE TABLE public.users (
  id          uuid PRIMARY KEY,
  email       text UNIQUE NOT NULL,
  name        text NOT NULL DEFAULT '',
  role        text NOT NULL DEFAULT 'sales',
  is_active   boolean NOT NULL DEFAULT true,
  avatar_url  text,
  mobile      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read users"   ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage users" ON public.users FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Re-create the role-check function now that public.users exists
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ============ destinations ============
ALTER TABLE public.destinations RENAME TO legacy_destinations;

CREATE TABLE public.destinations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE,
  about         text,
  best_months   text[] NOT NULL DEFAULT '{}',
  themes        text[] NOT NULL DEFAULT '{}',
  suitable_for  text[] NOT NULL DEFAULT '{}',
  hero_image    text,
  gallery       text[] NOT NULL DEFAULT '{}',
  testimonials  jsonb  NOT NULL DEFAULT '[]'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access destinations"
  ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read destinations"
  ON public.destinations FOR SELECT TO anon USING (is_active = true);

-- ============ itineraries ============
ALTER TABLE public.itineraries RENAME TO legacy_itineraries;

CREATE TABLE public.itineraries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline             text NOT NULL,
  slug                 text UNIQUE NOT NULL,
  about                text,
  destination_id       uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  days                 integer,
  nights               integer,
  price_per_person     integer,
  best_months          text[] NOT NULL DEFAULT '{}',
  themes               text[] NOT NULL DEFAULT '{}',
  suitable_for         text[] NOT NULL DEFAULT '{}',
  destination_type     text,
  status               text NOT NULL DEFAULT 'draft',
  flights_included     boolean NOT NULL DEFAULT false,
  stay_included        boolean NOT NULL DEFAULT false,
  transfers_included   boolean NOT NULL DEFAULT false,
  meals_included       boolean NOT NULL DEFAULT false,
  breakfast_included   boolean NOT NULL DEFAULT false,
  sightseeing_included boolean NOT NULL DEFAULT false,
  support_247          boolean NOT NULL DEFAULT false,
  hero_image           text,
  gallery              text[] NOT NULL DEFAULT '{}',
  highlights           text[] NOT NULL DEFAULT '{}',
  inclusions           text,
  exclusions           text,
  itinerary_days       jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title            text,
  seo_description      text,
  seo_keywords         text,
  published_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access itineraries"
  ON public.itineraries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read published itineraries"
  ON public.itineraries FOR SELECT TO anon USING (status = 'published');

-- ============ landing_pages ============
ALTER TABLE public.landing_pages RENAME TO legacy_landing_pages;

CREATE TABLE public.landing_pages (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                       text UNIQUE NOT NULL,
  name                       text,
  hero_headline              text,
  hero_subtext               text,
  hero_image                 text,
  time_to_visit              text[] NOT NULL DEFAULT '{}',
  best_time_to_visit         text[] NOT NULL DEFAULT '{}',
  budget                     numeric,
  suitable_for               text[] NOT NULL DEFAULT '{}',
  destination_type           text[] NOT NULL DEFAULT '{}',
  destination_id             uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  itinerary_id               uuid REFERENCES public.itineraries(id)  ON DELETE SET NULL,
  is_active                  boolean NOT NULL DEFAULT true,
  stay_days                  text,
  channel                    text,
  platform                   text,
  campaign_type              text,
  ad_group                   text,
  gallery                    text[] NOT NULL DEFAULT '{}',
  custom_inclusions          text,
  custom_exclusions          text,
  form_title                 text,
  form_subtitle              text,
  form_terms_label           text,
  form_submit_text           text,
  form_after_submit_message  text,
  seo_title                  text,
  seo_description            text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access landing_pages"
  ON public.landing_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read active landing_pages"
  ON public.landing_pages FOR SELECT TO anon USING (is_active = true);

-- ============ updated_at triggers ============
CREATE TRIGGER trg_users_upd          BEFORE UPDATE ON public.users          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_destinations_upd   BEFORE UPDATE ON public.destinations   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_itineraries_upd    BEFORE UPDATE ON public.itineraries    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_landing_pages_upd  BEFORE UPDATE ON public.landing_pages  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
