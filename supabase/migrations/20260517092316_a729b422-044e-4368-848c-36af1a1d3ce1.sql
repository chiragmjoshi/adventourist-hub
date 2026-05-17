
ALTER TABLE public.leads RENAME TO legacy_leads;

CREATE TABLE public.leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_code  text NOT NULL DEFAULT '',
  name            text,
  email           text,
  mobile          text,
  travel_date     date,
  notes           text,
  destination_id  uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  itinerary_id    uuid REFERENCES public.itineraries(id)  ON DELETE SET NULL,
  landing_page_id uuid REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  assigned_to     uuid REFERENCES public.users(id)         ON DELETE SET NULL,
  channel         text,
  platform        text,
  campaign_type   text,
  ad_group        text,
  source          text NOT NULL DEFAULT 'crm',
  sales_status    text NOT NULL DEFAULT 'New Lead',
  disposition     text NOT NULL DEFAULT 'Not Contacted',
  is_hot          boolean NOT NULL DEFAULT false,
  landing_url     text,
  referrer_url    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_traveller_code
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.generate_traveller_code();

CREATE TRIGGER trg_leads_upd
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access leads"
  ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_new    ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_destination_id_new ON public.leads(destination_id);
CREATE INDEX IF NOT EXISTS idx_leads_sales_status_new   ON public.leads(sales_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at_new     ON public.leads(created_at DESC);

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
