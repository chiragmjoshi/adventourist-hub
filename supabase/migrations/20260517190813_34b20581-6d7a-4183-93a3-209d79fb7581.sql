CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sales_status ON leads(sales_status);
CREATE INDEX IF NOT EXISTS idx_leads_disposition ON leads(disposition);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_destination_id ON leads(destination_id);
CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel);
CREATE INDEX IF NOT EXISTS idx_leads_platform ON leads(platform);
CREATE INDEX IF NOT EXISTS idx_leads_traveller_code ON leads(traveller_code);
CREATE INDEX IF NOT EXISTS idx_leads_landing_page_id ON leads(landing_page_id);

CREATE INDEX IF NOT EXISTS idx_leads_created_status
  ON leads(created_at DESC, sales_status);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead_id ON lead_timeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_lead_id ON trip_cashflow(lead_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_traveller_code ON trip_cashflow(traveller_code);

CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON leads USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_mobile_trgm ON leads USING gin(mobile gin_trgm_ops);