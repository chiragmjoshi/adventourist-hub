-- Phase A1 — lead_feedback ledger + reason catalogues + flag
--
-- Captures the "why" behind a lead going cold or being marked invalid,
-- so the Ad Feedback report (A3) can hand ad platforms (ChatGPT, Meta,
-- Google) real optimisation signal. Also captures positive-close
-- reasons on converted trips.
--
-- Flow (A2):
--   - Disposition -> invalid_lead      modal captures invalid_lead_reason
--   - Closed, not converted           modal captures closed_lost_reason
--   - Closed, converted               modal captures closed_won_reason
--   All three modals are SKIPPABLE (A-2 locked), so a lead can carry
--   zero or many feedback rows.

-- ─────────────── master_values catalogues ───────────────
-- The existing CHECK constraint restricts type to a known enum. Widen
-- it to include the three new reason catalogues, then seed values.

ALTER TABLE public.master_values
  DROP CONSTRAINT IF EXISTS master_values_type_check;

ALTER TABLE public.master_values
  ADD CONSTRAINT master_values_type_check CHECK (type IN (
    'platform', 'channel', 'campaign_type', 'ad_group',
    'sales_status', 'disposition',
    'destination_type', 'destination_suitable_type',
    'service_type', 'city',
    'invalid_lead_reason', 'closed_lost_reason', 'closed_won_reason'
  ));

-- Seeds (A-3 locked). Insert each with a non-conflicting sort_order.
-- Use (type, value) as the uniqueness surrogate via ON CONFLICT DO
-- NOTHING — the base table has no explicit UNIQUE, so we check first.
INSERT INTO public.master_values (type, value, is_active, sort_order)
SELECT * FROM (VALUES
  ('invalid_lead_reason', 'Wrong number',          true, 10),
  ('invalid_lead_reason', 'Spam / bot',             true, 20),
  ('invalid_lead_reason', 'Not interested',         true, 30),
  ('invalid_lead_reason', 'Not in target market',   true, 40),
  ('invalid_lead_reason', 'Already booked',         true, 50),
  ('invalid_lead_reason', 'Window shopper',         true, 60),

  ('closed_lost_reason',  'Budget constraint',      true, 10),
  ('closed_lost_reason',  'Chose competitor',       true, 20),
  ('closed_lost_reason',  'Timing shifted',         true, 30),
  ('closed_lost_reason',  'Destination changed',    true, 40),
  ('closed_lost_reason',  'Ghosted / no response',  true, 50),
  ('closed_lost_reason',  'Price too high',         true, 60),

  ('closed_won_reason',   'Strong landing-page recall', true, 10),
  ('closed_won_reason',   'Compelling itinerary',       true, 20),
  ('closed_won_reason',   'Trusted referral',           true, 30)
) AS t(type, value, is_active, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_values m
  WHERE m.type = t.type AND m.value = t.value
);

-- ─────────────── lead_feedback table ───────────────
CREATE TABLE IF NOT EXISTS public.lead_feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  feedback_type  text NOT NULL CHECK (feedback_type IN ('invalid_lead', 'closed_lost', 'closed_won')),
  reason         text NOT NULL,
  notes          text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Lookup from LeadDetail (per-lead feedback list) + the A3 report
-- aggregations (per-reason, per-feedback_type counts over a window).
CREATE INDEX IF NOT EXISTS lead_feedback_lead_idx
  ON public.lead_feedback (lead_id);
CREATE INDEX IF NOT EXISTS lead_feedback_type_created_idx
  ON public.lead_feedback (feedback_type, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_feedback_reason_created_idx
  ON public.lead_feedback (reason, created_at DESC);

-- ─────────────── RLS ───────────────
ALTER TABLE public.lead_feedback ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated. The report aggregates across all leads an
-- RM might never see, but admins + super_admins are the only report
-- viewers (route gate). RMs reading in LeadDetail is also fine.
DROP POLICY IF EXISTS "lead_feedback_select_auth" ON public.lead_feedback;
CREATE POLICY "lead_feedback_select_auth"
  ON public.lead_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Write: all authenticated. Anyone who can edit a lead (sales, ops,
-- admin, finance per existing lead policies) can log a feedback entry.
DROP POLICY IF EXISTS "lead_feedback_insert_auth" ON public.lead_feedback;
CREATE POLICY "lead_feedback_insert_auth"
  ON public.lead_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update + delete: admin + super_admin only. Keep history immutable
-- for RMs so you can trust what RMs captured at closure time.
DROP POLICY IF EXISTS "lead_feedback_update_admin" ON public.lead_feedback;
CREATE POLICY "lead_feedback_update_admin"
  ON public.lead_feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_higher())
  WITH CHECK (public.is_admin_or_higher());

DROP POLICY IF EXISTS "lead_feedback_delete_admin" ON public.lead_feedback;
CREATE POLICY "lead_feedback_delete_admin"
  ON public.lead_feedback
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_higher());

-- Belt-and-braces: strip the PostgREST anon grant.
REVOKE ALL ON TABLE public.lead_feedback FROM anon;

-- ─────────────── Feature flag ───────────────
INSERT INTO public.feature_flags (key, description)
VALUES (
  'feature:ad_feedback',
  'Lead-level feedback capture + Ad Feedback report. Phase A.'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.lead_feedback IS
  'Per-lead feedback captured at invalid / lost / won. Feeds the Ad Feedback report (A3). Phase A1.';
