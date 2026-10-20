-- Phase 0.5 — error_logs
--
-- Captures uncaught exceptions from the React app so we can see regressions
-- in production without relying on the browser console. Every ErrorBoundary
-- POSTs here on componentDidCatch.
--
-- RLS:
--   INSERT: any authenticated user (so the client ErrorBoundary can write)
--   SELECT: super_admin only (stacks and context are sensitive)
--   UPDATE/DELETE: nobody (append-only)
--
-- Public-site (anonymous) errors do NOT write here on purpose — opening the
-- table to anon would be an abuse vector. A rate-limited edge function will
-- be added later if we need public-site visibility (Phase 2).

CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text,
  url text,
  message text NOT NULL,
  name text,
  stack text,
  component_stack text,
  scope text,
  user_agent text,
  release_sha text,
  environment text NOT NULL DEFAULT 'unknown'
    CHECK (environment IN ('production','staging','preview','development','unknown')),
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_user_id_idx    ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS error_logs_route_idx      ON public.error_logs (route);
CREATE INDEX IF NOT EXISTS error_logs_environment_idx ON public.error_logs (environment);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_insert_authenticated" ON public.error_logs;
CREATE POLICY "error_logs_insert_authenticated"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "error_logs_select_super_admin" ON public.error_logs;
CREATE POLICY "error_logs_select_super_admin"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- No UPDATE / DELETE policies: table is append-only. Retention is handled by
-- a scheduled trim job (added in a later migration) that deletes rows older
-- than 180 days.

COMMENT ON TABLE  public.error_logs IS 'Client-side exceptions captured by ErrorBoundary. Append-only; super_admin SELECT only. Phase 0.5.';
COMMENT ON COLUMN public.error_logs.scope IS 'Logical area where the error fired (e.g., "admin-shell", "route:/admin/leads/:id").';
COMMENT ON COLUMN public.error_logs.release_sha IS 'Git SHA of the deployed bundle, from VITE_RELEASE_SHA at build time.';
