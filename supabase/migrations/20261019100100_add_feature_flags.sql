-- Phase 0.6 — feature_flags
--
-- The master switch for anything shipping dark. New features (quotes,
-- bookings, invoicing, portals, etc.) land disabled, get flipped on for a
-- staging org, then an internal pilot org, then everyone — all without a
-- deploy.
--
-- Shape:
--   key                 "feature:quotes" style identifier
--   enabled_globally    boolean kill switch
--   enabled_user_ids    uuid[] — allowlist (overrides enabled_globally=false)
--   enabled_roles       text[] — e.g. {'super_admin','admin'}
--   rollout_percent     0..100 — stable hash by auth.uid()
--   description         human-readable context
--
-- RLS:
--   SELECT: authenticated (every client needs to read its own flag state)
--   INSERT/UPDATE/DELETE: super_admin only, via public.current_user_role()
--
-- A SECURITY DEFINER function `public.is_feature_enabled(key, user_id?)`
-- encodes the resolution rules so the client never has to replicate them.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL CHECK (key ~ '^[a-z][a-z0-9:_-]{1,63}$'),
  description text,
  enabled_globally boolean NOT NULL DEFAULT false,
  enabled_user_ids uuid[] NOT NULL DEFAULT '{}',
  enabled_roles text[] NOT NULL DEFAULT '{}',
  rollout_percent smallint NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON public.feature_flags (key);

DROP TRIGGER IF EXISTS feature_flags_set_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_set_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_select_authenticated" ON public.feature_flags;
CREATE POLICY "feature_flags_select_authenticated"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feature_flags_write_super_admin" ON public.feature_flags;
CREATE POLICY "feature_flags_write_super_admin"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'super_admin')
  WITH CHECK (public.current_user_role() = 'super_admin');

-- Deterministic 0..99 bucket from a UUID — stable across sessions, so a user
-- in the 10 % rollout group stays in it until the rollout widens.
CREATE OR REPLACE FUNCTION public.feature_flag_bucket(p_user_id uuid)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (('x' || substring(md5(p_user_id::text) FROM 1 FOR 8))::bit(32)::int & x'7FFFFFFF'::int) % 100;
$$;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_key text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.feature_flags;
  v_role text;
BEGIN
  SELECT * INTO f FROM public.feature_flags WHERE key = p_key;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Explicit per-user allowlist always wins.
  IF p_user_id IS NOT NULL AND p_user_id = ANY (f.enabled_user_ids) THEN
    RETURN true;
  END IF;

  -- Role allowlist.
  IF p_user_id IS NOT NULL AND array_length(f.enabled_roles, 1) IS NOT NULL THEN
    SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
    IF v_role IS NOT NULL AND v_role = ANY (f.enabled_roles) THEN
      RETURN true;
    END IF;
  END IF;

  -- Global kill switch.
  IF f.enabled_globally THEN
    RETURN true;
  END IF;

  -- Percentage rollout: anonymous users (p_user_id IS NULL) never qualify;
  -- hashed users compare against the bucket.
  IF f.rollout_percent > 0 AND p_user_id IS NOT NULL THEN
    IF public.feature_flag_bucket(p_user_id) < f.rollout_percent THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_feature_enabled(text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.feature_flag_bucket(uuid) TO authenticated;

COMMENT ON TABLE public.feature_flags
  IS 'Master kill-switch registry. Resolve with public.is_feature_enabled(key). Phase 0.6.';
COMMENT ON FUNCTION public.is_feature_enabled(text, uuid)
  IS 'Resolves a flag for a user. Order: per-user allowlist > role allowlist > global > % bucket.';

-- Seed the first batch of flags disabled, so Phase 5 features can land dark.
INSERT INTO public.feature_flags (key, description) VALUES
  ('feature:quotes',       'Quotation builder with versioning + public share link. Phase 5.2.'),
  ('feature:bookings',     'Post-sale booking module with segments + passengers. Phase 5.4.'),
  ('feature:invoicing',    'Invoicing + Razorpay payment gateway. Phase 5.5.'),
  ('feature:lead_kanban',  'Kanban pipeline view on /admin/leads. Phase 5.3.'),
  ('feature:multi_currency','Multi-currency + daily FX rates. Phase 5.1.'),
  ('feature:document_vault','Centralized document vault with expiry alerts. Phase 5.6.'),
  ('feature:audit_logs',   'Comprehensive audit log + GDPR/DPDP endpoints. Phase 5.7.')
ON CONFLICT (key) DO NOTHING;
