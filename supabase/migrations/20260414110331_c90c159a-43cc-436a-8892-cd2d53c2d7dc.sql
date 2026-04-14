
-- 1. Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
ON public.settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage settings"
ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.settings (key, value, description) VALUES
('gst_rate', '5', 'GST rate percentage applied on selling price'),
('company_name', 'Adventourist', 'Company name'),
('company_gst', '27ABMFA3990N1ZQ', 'Company GST number'),
('company_pan', 'ABMFA3990N', 'Company PAN'),
('company_address', '1 Madhav Kunj South Pond Road, Vile Parle, Mumbai 400056', 'Company address')
ON CONFLICT (key) DO NOTHING;

-- 2. Drop existing trip_cashflow (it has no real data yet)
DROP TABLE IF EXISTS public.trip_cashflow CASCADE;

CREATE TABLE public.trip_cashflow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashflow_code text UNIQUE NOT NULL DEFAULT '',
  lead_id uuid REFERENCES public.leads(id),
  itinerary_id uuid REFERENCES public.itineraries(id),
  destination_id uuid REFERENCES public.destinations(id),
  assigned_to uuid REFERENCES public.users(id),
  traveller_name text NOT NULL,
  traveller_code text NOT NULL,
  travel_start_date date,
  travel_end_date date,
  booking_date date,
  pax_count int DEFAULT 1,
  gst_billing boolean DEFAULT true,
  margin_percent numeric(5,2) DEFAULT 0,
  status text DEFAULT 'draft',
  pan_card_url text,
  zoho_invoice_ref text,
  notes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trip_cashflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trip_cashflow"
ON public.trip_cashflow FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage trip_cashflow"
ON public.trip_cashflow FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. trip_cashflow_vendors
CREATE TABLE public.trip_cashflow_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashflow_id uuid REFERENCES public.trip_cashflow(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  service_type text NOT NULL,
  description text,
  cost_per_pax_incl_gst numeric(10,2) NOT NULL DEFAULT 0,
  invoice_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trip_cashflow_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trip_cashflow_vendors"
ON public.trip_cashflow_vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage trip_cashflow_vendors"
ON public.trip_cashflow_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Cashflow code sequence
CREATE TABLE IF NOT EXISTS public.cashflow_code_sequence (
  year_prefix text PRIMARY KEY,
  last_sequence int NOT NULL DEFAULT 0
);

ALTER TABLE public.cashflow_code_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cashflow_code_sequence"
ON public.cashflow_code_sequence FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Auto-generate cashflow_code trigger
CREATE OR REPLACE FUNCTION public.generate_cashflow_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_prefix text;
  v_seq int;
BEGIN
  IF NEW.cashflow_code IS NOT NULL AND NEW.cashflow_code != '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(now(), 'YY');
  v_prefix := 'TC' || v_year;

  INSERT INTO public.cashflow_code_sequence (year_prefix, last_sequence)
  VALUES (v_prefix, 1)
  ON CONFLICT (year_prefix) DO UPDATE SET last_sequence = cashflow_code_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  NEW.cashflow_code := v_prefix || lpad(v_seq::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_cashflow_code
BEFORE INSERT ON public.trip_cashflow
FOR EACH ROW
EXECUTE FUNCTION public.generate_cashflow_code();

-- 6. Updated_at trigger
CREATE TRIGGER update_trip_cashflow_updated_at
BEFORE UPDATE ON public.trip_cashflow
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cashflow-docs', 'cashflow-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view cashflow docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'cashflow-docs');

CREATE POLICY "Authenticated users can upload cashflow docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cashflow-docs');

CREATE POLICY "Authenticated users can delete cashflow docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cashflow-docs');
