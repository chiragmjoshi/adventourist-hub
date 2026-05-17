
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  legacy_id integer UNIQUE,
  name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  mobile text,
  role text NOT NULL DEFAULT 'sales',
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_all" ON public.users;
CREATE POLICY "users_read_all" ON public.users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "users_update_self_or_admin" ON public.users;
CREATE POLICY "users_update_self_or_admin" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() IN ('super_admin','admin'))
  WITH CHECK (id = auth.uid() OR public.current_user_role() IN ('super_admin','admin'));
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('super_admin'));
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_users_prevent_escalation ON public.users;
CREATE TRIGGER trg_users_prevent_escalation BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  traveller_code text UNIQUE,
  name text, email text, mobile text,
  dob date, anniversary date, address text, profile_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cust_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_cust_mobile ON public.customers(mobile);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_all_auth" ON public.customers;
CREATE POLICY "customers_all_auth" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  type text, file_path text, meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cust_docs_all_auth" ON public.customer_documents;
CREATE POLICY "cust_docs_all_auth" ON public.customer_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE, name text NOT NULL, color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cust_tags_all_auth" ON public.customer_tags;
CREATE POLICY "cust_tags_all_auth" ON public.customer_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.customer_tag_customer (
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);
ALTER TABLE public.customer_tag_customer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cust_tag_link_all_auth" ON public.customer_tag_customer;
CREATE POLICY "cust_tag_link_all_auth" ON public.customer_tag_customer FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  name text NOT NULL, slug text UNIQUE, about text,
  hero_image text, gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  best_months integer[] NOT NULL DEFAULT '{}',
  themes text[] NOT NULL DEFAULT '{}',
  suitable_for text[] NOT NULL DEFAULT '{}',
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  seo_title text, seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "destinations_read_public" ON public.destinations;
CREATE POLICY "destinations_read_public" ON public.destinations FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS "destinations_all_auth" ON public.destinations;
CREATE POLICY "destinations_all_auth" ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_destinations_updated_at ON public.destinations;
CREATE TRIGGER trg_destinations_updated_at BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  slug text UNIQUE NOT NULL,
  headline text, about text,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  days integer, nights integer, price_per_person numeric,
  best_months integer[] NOT NULL DEFAULT '{}',
  themes text[] NOT NULL DEFAULT '{}',
  suitable_for text[] NOT NULL DEFAULT '{}',
  destination_type text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  flights_included boolean DEFAULT false,
  stay_included boolean DEFAULT false,
  transfers_included boolean DEFAULT false,
  meals_included boolean DEFAULT false,
  breakfast_included boolean DEFAULT false,
  sightseeing_included boolean DEFAULT false,
  support_247 boolean DEFAULT false,
  hero_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  inclusions text, exclusions text, important_things text,
  itinerary_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  view_count integer DEFAULT 0,
  seo_title text, seo_description text, seo_keywords text,
  no_index boolean DEFAULT false, no_follow boolean DEFAULT false,
  meta_header text, meta_footer text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_itin_dest ON public.itineraries(destination_id);
CREATE INDEX IF NOT EXISTS idx_itin_status ON public.itineraries(status);
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itineraries_read_public" ON public.itineraries;
CREATE POLICY "itineraries_read_public" ON public.itineraries FOR SELECT TO anon USING (status = 'published');
DROP POLICY IF EXISTS "itineraries_all_auth" ON public.itineraries;
CREATE POLICY "itineraries_all_auth" ON public.itineraries FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_itineraries_updated_at ON public.itineraries;
CREATE TRIGGER trg_itineraries_updated_at BEFORE UPDATE ON public.itineraries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  slug text UNIQUE NOT NULL,
  name text,
  itinerary_id uuid REFERENCES public.itineraries(id) ON DELETE SET NULL,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  hero_headline text, hero_subtext text, hero_image text,
  budget numeric, stay_days text,
  time_to_visit text[] NOT NULL DEFAULT '{}',
  suitable_for text[] NOT NULL DEFAULT '{}',
  destination_type text[] NOT NULL DEFAULT '{}',
  channel text, platform text, campaign_type text, ad_group text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_adventourist text, custom_inclusions text, custom_exclusions text,
  seo_title text, seo_description text,
  no_index boolean DEFAULT false, no_follow boolean DEFAULT false,
  meta_header text, meta_footer text,
  view_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  form_title text DEFAULT 'Enquire for Free',
  form_subtitle text, form_terms_label text,
  form_submit_text text DEFAULT 'Submit',
  form_after_submit_message text,
  testimonial_ids uuid[] NOT NULL DEFAULT '{}',
  settings jsonb DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lp_read_public" ON public.landing_pages;
CREATE POLICY "lp_read_public" ON public.landing_pages FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS "lp_all_auth" ON public.landing_pages;
CREATE POLICY "lp_all_auth" ON public.landing_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_landing_pages_updated_at ON public.landing_pages;
CREATE TRIGGER trg_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  traveller_code text NOT NULL DEFAULT '',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  name text, email text, mobile text,
  is_hot boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'crm',
  source_id integer,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  itinerary_id uuid REFERENCES public.itineraries(id) ON DELETE SET NULL,
  landing_page_id uuid REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  assigned_to uuid,
  sales_status text DEFAULT 'New Lead',
  disposition text DEFAULT 'Not Contacted',
  platform text, channel text, campaign_type text, ad_group text,
  travel_date date, pax_count integer,
  notes text, remarks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_lds_customer ON public.leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_lds_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lds_status ON public.leads(sales_status);
CREATE INDEX IF NOT EXISTS idx_lds_tc ON public.leads(traveller_code);
CREATE INDEX IF NOT EXISTS idx_lds_created ON public.leads(created_at);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_all_auth" ON public.leads;
CREATE POLICY "leads_all_auth" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_leads_traveller_code ON public.leads;
CREATE TRIGGER trg_leads_traveller_code BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.generate_traveller_code();
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.lead_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  fbclid text, gclid text, click_id text, pid text,
  ad_id text, adset_id text, campaign_id text,
  placement text, device text, device_type text,
  af_click_lookback text, af_siteid text, creative_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lt_lead ON public.lead_tracking(lead_id);
ALTER TABLE public.lead_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_tracking_all_auth" ON public.lead_tracking;
CREATE POLICY "lead_tracking_all_auth" ON public.lead_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.master_values ADD COLUMN IF NOT EXISTS legacy_id integer UNIQUE;
ALTER TABLE public.lead_timeline ADD COLUMN IF NOT EXISTS legacy_id integer UNIQUE;
DROP POLICY IF EXISTS "mv_all_auth_write" ON public.master_values;
CREATE POLICY "mv_all_auth_write" ON public.master_values FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.lead_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_timeline_all_auth" ON public.lead_timeline;
CREATE POLICY "lead_timeline_all_auth" ON public.lead_timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('legacy-media', 'legacy-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "legacy_media_public_read" ON storage.objects;
CREATE POLICY "legacy_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'legacy-media');
DROP POLICY IF EXISTS "legacy_media_auth_write" ON storage.objects;
CREATE POLICY "legacy_media_auth_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'legacy-media');
DROP POLICY IF EXISTS "legacy_media_auth_update" ON storage.objects;
CREATE POLICY "legacy_media_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'legacy-media');
DROP POLICY IF EXISTS "legacy_media_auth_delete" ON storage.objects;
CREATE POLICY "legacy_media_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'legacy-media');
