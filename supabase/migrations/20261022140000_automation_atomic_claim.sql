-- Phase 3.1 — Atomic claim for automation_executions
--
-- Problem: both the client (src/services/automationEngine.ts, called from
-- a 15-minute setInterval in every open admin tab) AND the server-side
-- edge function (supabase/functions/process-automations) read
--
--   SELECT * FROM automation_executions WHERE status='pending' LIMIT 50
--
-- with no row-locking before dispatching. Two tabs open at the same
-- minute, or a tab-plus-cron overlap, both see the same 'pending' rows
-- and send the email twice. Audit flagged this as the top live-system
-- defect — real customers have reported duplicate emails.
--
-- Fix: an RPC that atomically moves rows pending → processing using
-- FOR UPDATE SKIP LOCKED. Concurrent callers never see the same row.
-- The dispatcher then transitions processing → sent / failed / skipped
-- as it does today.
--
-- Schema change (additive):
--   automation_executions.claimed_at timestamptz NULL
--     Marks when a row entered 'processing'. Used only by
--     requeue_stale_claims to recover from crashed dispatchers.
--
-- Status lifecycle:
--   pending   → claim_pending_automation_executions() →  processing
--   processing  → dispatcher success                    →  sent
--   processing  → dispatcher failure                    →  failed
--   processing  → outside send-time window              →  pending (deferred)
--   processing  (stale > 10 min, no outcome written)    →  pending
--
-- Safety:
--   * SECURITY DEFINER, auth-gated so random authenticated users can't
--     mass-claim and starve the dispatcher.
--   * The dispatcher still writes executed_at + status on completion —
--     this migration does NOT change the dispatcher side yet.
--   * Idempotent create / grants.
--
-- Reverse SQL (for a revert migration):
--   DROP FUNCTION IF EXISTS public.claim_pending_automation_executions(int);
--   DROP FUNCTION IF EXISTS public.requeue_stale_automation_claims(int);
--   ALTER TABLE public.automation_executions DROP COLUMN IF EXISTS claimed_at;

-- ────────────────────────────────────────────────────────────────────────
-- Schema: track claim time so stale-recovery is accurate.
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.automation_executions
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS automation_executions_claimed_at_idx
  ON public.automation_executions (claimed_at)
 WHERE status = 'processing';

-- ────────────────────────────────────────────────────────────────────────
-- Recovery: push stale processing rows back to pending.
-- Called at the top of each claim run; also safe to invoke manually.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.requeue_stale_automation_claims(
  p_max_processing_minutes int DEFAULT 10
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT (
    session_user IN ('postgres', 'supabase_admin')
    OR (auth.uid() IS NOT NULL AND public.is_admin_or_higher())
  ) THEN
    RAISE EXCEPTION 'requires scheduled or admin context' USING ERRCODE = '42501';
  END IF;

  WITH freed AS (
    UPDATE public.automation_executions
       SET status      = 'pending',
           claimed_at  = NULL
     WHERE status = 'processing'
       AND claimed_at IS NOT NULL
       AND claimed_at < now() - (p_max_processing_minutes || ' minutes')::interval
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM freed;

  RETURN v_count;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- Claim: the atomic pending → processing transition.
-- Returns the full execution rows PLUS the joined rule as jsonb so the
-- caller doesn't need a second round-trip to fetch rules.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_pending_automation_executions(
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  execution_id      uuid,
  rule_id           uuid,
  lead_id           uuid,
  trigger_event     text,
  channel           text,
  recipient_type    text,
  recipient_contact text,
  scheduled_for     timestamptz,
  rule              jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT (
    session_user IN ('postgres', 'supabase_admin')
    OR (auth.uid() IS NOT NULL AND public.is_admin_or_higher())
  ) THEN
    RAISE EXCEPTION 'requires scheduled or admin context' USING ERRCODE = '42501';
  END IF;

  -- First, recover rows stuck in 'processing' > 10 min (crashed dispatcher).
  PERFORM public.requeue_stale_automation_claims(10);

  -- Atomic claim using FOR UPDATE SKIP LOCKED. Concurrent callers get
  -- different rows; nobody dispatches the same execution twice.
  RETURN QUERY
  WITH picked AS (
    SELECT id
      FROM public.automation_executions
     WHERE status = 'pending'
       AND (channel IS NULL OR channel = 'email')
       AND (scheduled_for IS NULL OR scheduled_for <= now())
     ORDER BY scheduled_for NULLS FIRST, created_at
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.automation_executions ae
       SET status     = 'processing',
           claimed_at = now()
      FROM picked
     WHERE ae.id = picked.id
    RETURNING ae.*
  )
  SELECT
    c.id,
    c.rule_id,
    c.lead_id,
    c.trigger_event,
    c.channel,
    c.recipient_type,
    c.recipient_contact,
    c.scheduled_for,
    to_jsonb(r.*) AS rule
    FROM claimed c
    LEFT JOIN public.automation_rules r ON r.id = c.rule_id;
END $$;

GRANT EXECUTE ON FUNCTION public.requeue_stale_automation_claims(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_automation_executions(int) TO authenticated;

COMMENT ON COLUMN public.automation_executions.claimed_at
  IS 'When status moved pending→processing. NULL unless currently processing. Phase 3.1.';
COMMENT ON FUNCTION public.requeue_stale_automation_claims(int)
  IS 'Moves rows stuck in processing > N minutes back to pending (crashed-dispatcher recovery). Phase 3.1.';
COMMENT ON FUNCTION public.claim_pending_automation_executions(int)
  IS 'Atomic pending→processing claim. Prevents double-dispatch under concurrent client/cron callers. Phase 3.1.';
