-- Phase M1 — marketing_spends ledger
--
-- Why a new table (not master_values, not a column on landing_pages):
--   master_values is a static dropdown dictionary; ad spend is time-series
--   financial data (flight dates + amounts). A column on landing_pages
--   couldn't hold multiple campaigns across months, or lumpsum spend not
--   tied to a specific page. A dedicated ledger keeps everything else
--   untouched and lets Platform ROI compute CPL/CAC/ROAS cleanly.
--
-- Attribution rule (M-1 locked = option a):
--   A row with NO landing_page_id attributes to every lead whose
--   platform matches, in the overlap window.
--   A row with landing_page_id set attributes only to leads from that
--   page. The matching query runs in src/lib/reporting.ts; nothing here
--   enforces it.
--
-- Write access (M3 locked = admin + super_admin):
--   RLS uses the existing public.is_admin_or_higher() helper, which
--   resolves to current_user_role() IN ('admin','super_admin'). Finance
--   is NOT a writer here — this is a marketing-ops ledger, not a
--   finance ledger.

CREATE TABLE IF NOT EXISTS public.marketing_spends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  platform        text NOT NULL,
  landing_page_id uuid REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  campaign_name   text,
  ad_group        text,
  amount          numeric(14,2) NOT NULL CHECK (amount >= 0),
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_spends_date_order CHECK (end_date >= start_date)
);

-- Platform + date-range queries dominate the ROI report (sum over overlap
-- windows), so the compound index covers them. The partial index on
-- landing_page_id keeps per-page queries (M4, M6) off a scan.
CREATE INDEX IF NOT EXISTS marketing_spends_platform_dates_idx
  ON public.marketing_spends (platform, start_date, end_date);

CREATE INDEX IF NOT EXISTS marketing_spends_landing_page_idx
  ON public.marketing_spends (landing_page_id)
  WHERE landing_page_id IS NOT NULL;

-- Reuse the shared trigger function introduced for feature_flags/error_logs.
DROP TRIGGER IF EXISTS marketing_spends_set_updated_at ON public.marketing_spends;
CREATE TRIGGER marketing_spends_set_updated_at
  BEFORE UPDATE ON public.marketing_spends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────── RLS ───────────────
ALTER TABLE public.marketing_spends ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated. RMs need to see spend in the ROI report, even
-- though they can't edit it.
DROP POLICY IF EXISTS "marketing_spends_select_auth" ON public.marketing_spends;
CREATE POLICY "marketing_spends_select_auth"
  ON public.marketing_spends
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: admin + super_admin only.
DROP POLICY IF EXISTS "marketing_spends_insert_admin" ON public.marketing_spends;
CREATE POLICY "marketing_spends_insert_admin"
  ON public.marketing_spends
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_higher());

DROP POLICY IF EXISTS "marketing_spends_update_admin" ON public.marketing_spends;
CREATE POLICY "marketing_spends_update_admin"
  ON public.marketing_spends
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_higher())
  WITH CHECK (public.is_admin_or_higher());

DROP POLICY IF EXISTS "marketing_spends_delete_admin" ON public.marketing_spends;
CREATE POLICY "marketing_spends_delete_admin"
  ON public.marketing_spends
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_higher());

-- Belt-and-braces: strip the PostgREST anon grant so a leaked anon key can
-- never read ad spend. Mirrors 20261020150300_hygiene_revoke_anon_grants.
REVOKE ALL ON TABLE public.marketing_spends FROM anon;

-- ─────────────── Feature flag ───────────────
-- Lands dark. Flip from Settings → Features when the M2 UI is ready.
INSERT INTO public.feature_flags (key, description)
VALUES (
  'feature:marketing_spend',
  'Marketing spend ledger + enriched Platform ROI (CPL/CAC/ROAS). Phase M.'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.marketing_spends IS
  'Ad spend ledger. Attribution: no landing_page_id => all leads for that platform in the overlap window; with landing_page_id => leads from that page only. Phase M1.';
