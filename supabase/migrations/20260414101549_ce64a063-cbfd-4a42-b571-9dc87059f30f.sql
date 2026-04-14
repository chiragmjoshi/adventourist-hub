-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'sales', 'operations', 'finance')),
  is_active boolean DEFAULT true,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Master values table
CREATE TABLE public.master_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('platform', 'channel', 'campaign_type', 'ad_group', 'sales_status', 'disposition', 'destination_type', 'destination_suitable_type', 'service_type', 'city')),
  value text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.master_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view master_values" ON public.master_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage master_values" ON public.master_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Destinations table
CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  about text,
  best_months text[] DEFAULT '{}',
  themes text[] DEFAULT '{}',
  suitable_for text[] DEFAULT '{}',
  hero_image text,
  gallery text[] DEFAULT '{}',
  testimonials jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view destinations" ON public.destinations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage destinations" ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Itineraries table
CREATE TABLE public.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES public.destinations(id),
  headline text NOT NULL,
  slug text UNIQUE NOT NULL,
  about text,
  days int,
  nights int,
  price_per_person int,
  best_months text[] DEFAULT '{}',
  suitable_for text[] DEFAULT '{}',
  themes text[] DEFAULT '{}',
  destination_type text,
  flights_included boolean DEFAULT false,
  stay_included boolean DEFAULT false,
  transfers_included boolean DEFAULT false,
  meals_included boolean DEFAULT false,
  breakfast_included boolean DEFAULT false,
  sightseeing_included boolean DEFAULT false,
  support_247 boolean DEFAULT false,
  inclusions text,
  exclusions text,
  highlights text[] DEFAULT '{}',
  itinerary_days jsonb DEFAULT '[]',
  hero_image text,
  gallery text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  seo_keywords text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view itineraries" ON public.itineraries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage itineraries" ON public.itineraries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON public.itineraries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Landing pages table
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  destination_id uuid REFERENCES public.destinations(id),
  budget int,
  time_to_visit text[] DEFAULT '{}',
  suitable_for text[] DEFAULT '{}',
  channel text,
  platform text,
  campaign_type text,
  ad_group text,
  template text DEFAULT 'default',
  hero_headline text,
  hero_subtext text,
  is_active boolean DEFAULT true,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view landing_pages" ON public.landing_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage landing_pages" ON public.landing_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_code text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  mobile text,
  destination_id uuid REFERENCES public.destinations(id),
  itinerary_id uuid REFERENCES public.itineraries(id),
  assigned_to uuid REFERENCES public.users(id),
  landing_page_id uuid REFERENCES public.landing_pages(id),
  channel text,
  platform text,
  campaign_type text,
  ad_group text,
  sales_status text DEFAULT 'new_lead',
  disposition text DEFAULT 'not_contacted',
  travel_date date,
  address text,
  customer_tag text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Lead timeline table
CREATE TABLE public.lead_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id),
  event_type text NOT NULL,
  note text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.lead_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view lead_timeline" ON public.lead_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage lead_timeline" ON public.lead_timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Vendors table
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code text UNIQUE NOT NULL,
  name text NOT NULL,
  nick_name text,
  serve_destinations text[] DEFAULT '{}',
  services text[] DEFAULT '{}',
  office_address_1 text,
  office_address_2 text,
  pan text,
  gst text,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  bank_swift text,
  bank_micr text,
  contact_points jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage vendors" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Trip cashflow table
CREATE TABLE public.trip_cashflow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id),
  itinerary_id uuid REFERENCES public.itineraries(id),
  vendor_id uuid REFERENCES public.vendors(id),
  destination_id uuid REFERENCES public.destinations(id),
  assigned_to uuid REFERENCES public.users(id),
  traveller_code text,
  traveller_name text,
  travel_start_date date,
  travel_end_date date,
  booking_date date,
  pax_count int DEFAULT 1,
  vendor_cost_per_pax int DEFAULT 0,
  selling_price_per_pax int DEFAULT 0,
  total_vendor_cost int GENERATED ALWAYS AS (pax_count * vendor_cost_per_pax) STORED,
  total_selling_price int GENERATED ALWAYS AS (pax_count * selling_price_per_pax) STORED,
  margin int GENERATED ALWAYS AS ((pax_count * selling_price_per_pax) - (pax_count * vendor_cost_per_pax)) STORED,
  payment_status text DEFAULT 'pending',
  pan_card_url text,
  zoho_invoice_ref text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.trip_cashflow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view trip_cashflow" ON public.trip_cashflow FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage trip_cashflow" ON public.trip_cashflow FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_trip_cashflow_updated_at BEFORE UPDATE ON public.trip_cashflow FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Automations log table
CREATE TABLE public.automations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id),
  trigger_event text NOT NULL,
  channel text NOT NULL,
  template_name text,
  recipient_mobile text,
  recipient_email text,
  status text DEFAULT 'pending',
  response_payload jsonb DEFAULT '{}',
  fired_at timestamptz DEFAULT now()
);
ALTER TABLE public.automations_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view automations_log" ON public.automations_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage automations_log" ON public.automations_log FOR ALL TO authenticated USING (true) WITH CHECK (true);