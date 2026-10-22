-- Phase extra — Trip-Kanban auto-advance
--
-- Problem: the Post-Sale Kanban (/admin/trips-kanban) was fully manual. Cards
-- never moved. Audit snapshot: all 214 active trips sat at 'trip_sold' even
-- when travel had already started or ended. The user's rule is that briefing
-- calls must happen AT LEAST 7 DAYS BEFORE travel — surfacing them in the
-- right column later than that is useless.
--
-- Fix: a daily pg_cron job calls public.advance_trip_stages(), which
-- deterministically computes each trip's target stage from (travel_start,
-- travel_end, today-IST) and promotes forward (never backward). Each move
-- is logged to lead_timeline with { auto: true } so the Kanban's
-- "Updated X ago" indicator and the lead's audit trail stay honest.
--
-- Stage ladder (ordinal):
--   trip_sold                0
--   booking_reconfirmation   1   starts at T-14
--   briefing_call            2   starts at T-10 (3-day buffer before T-7 deadline)
--   on_tour_support          3   travel in progress
--   feedback_call            4   travel ended, awaiting review
--   trip_completed           5   NEVER auto-set — requires manual close
--
-- Target-stage rule for a given trip (today = Asia/Kolkata date):
--   travel_start IS NULL                                   → trip_sold
--   travel_end IS NOT NULL AND travel_end < today          → feedback_call
--   travel_end IS NOT NULL AND
--     travel_start <= today AND travel_end >= today        → on_tour_support
--   (travel_start - today) BETWEEN 1 AND 10                → briefing_call
--   (travel_start - today) BETWEEN 11 AND 14               → booking_reconfirmation
--   else                                                   → trip_sold
--
-- Note: on_tour_support REQUIRES travel_end_date to be set. Legacy historical
-- rows (prefix LTC*) have travel_end IS NULL and would otherwise be swept
-- into "on tour" forever. The job also filters status NOT IN
-- ('cancelled','completed') so already-closed historical cashflows stay put
-- even if a stray dateful row slips through.
--
-- Safety:
--   * SECURITY DEFINER, with explicit auth gate (session_user=postgres for
--     pg_cron, otherwise is_admin_or_higher()). Prevents arbitrary
--     authenticated users from mass-moving cards via RPC.
--   * Idempotent — moves only when the TARGET is strictly higher ranked
--     than the current stage. Running twice in one day is a no-op.
--   * Never auto-promotes TO or AWAY FROM 'trip_completed'.
--   * Skips status IN ('cancelled','completed') — closed cashflows are
--     left alone even if the trip_stage column is still 'trip_sold'
--     from before this automation existed.
--   * Only writes a lead_timeline row when lead_id is present.
--
-- Reverse SQL (apply as a new revert migration if ever needed):
--   DO $$ BEGIN
--     IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
--       PERFORM cron.unschedule(jobid) FROM cron.job
--         WHERE jobname = 'advance_trip_stages_daily';
--     END IF;
--   END $$;
--   DROP FUNCTION IF EXISTS public.advance_trip_stages();
--   DROP FUNCTION IF EXISTS public.preview_trip_stage_advances();
--   DROP FUNCTION IF EXISTS public._trip_stage_rank(text);
--   DROP FUNCTION IF EXISTS public._target_trip_stage(date, date, date);

-- ────────────────────────────────────────────────────────────────────────
-- Helpers
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._target_trip_stage(
  p_travel_start date,
  p_travel_end   date,
  p_today        date
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_travel_start IS NULL THEN 'trip_sold'
    -- Trip has definitively ended.
    WHEN p_travel_end IS NOT NULL AND p_travel_end < p_today THEN 'feedback_call'
    -- Trip is currently happening (both end-points known and today is between them).
    WHEN p_travel_end IS NOT NULL
         AND p_travel_start <= p_today
         AND p_travel_end >= p_today THEN 'on_tour_support'
    -- Pre-trip windows.
    WHEN p_travel_start > p_today
         AND (p_travel_start - p_today) <= 10 THEN 'briefing_call'
    WHEN p_travel_start > p_today
         AND (p_travel_start - p_today) <= 14 THEN 'booking_reconfirmation'
    -- Trip start reached but no travel_end set: insufficient data to
    -- advance safely (we can't tell if it's day 1 of a 10-day trip or an
    -- old row that should be in feedback_call). Leave it where it is.
    ELSE 'trip_sold'
  END;
$$;

CREATE OR REPLACE FUNCTION public._trip_stage_rank(p_stage text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_stage
    WHEN 'trip_sold'              THEN 0
    WHEN 'booking_reconfirmation' THEN 1
    WHEN 'briefing_call'          THEN 2
    WHEN 'on_tour_support'        THEN 3
    WHEN 'feedback_call'          THEN 4
    WHEN 'trip_completed'         THEN 5
    ELSE 0
  END;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- Preview (read-only — anyone authenticated can inspect)
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.preview_trip_stage_advances()
RETURNS TABLE (
  trip_id            uuid,
  cashflow_code      text,
  current_stage      text,
  target_stage       text,
  travel_start_date  date,
  travel_end_date    date,
  days_to_travel     int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH today AS (SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS d)
  SELECT
    t.id,
    t.cashflow_code,
    coalesce(t.trip_stage, 'trip_sold') AS current_stage,
    public._target_trip_stage(t.travel_start_date, t.travel_end_date, today.d) AS target_stage,
    t.travel_start_date,
    t.travel_end_date,
    CASE WHEN t.travel_start_date IS NULL THEN NULL
         ELSE (t.travel_start_date - today.d)::int
    END AS days_to_travel
  FROM public.trip_cashflow t, today
  WHERE t.status NOT IN ('cancelled','completed')
    AND coalesce(t.trip_stage, 'trip_sold') != 'trip_completed'
    AND public._trip_stage_rank(
          public._target_trip_stage(t.travel_start_date, t.travel_end_date, today.d)
        )
      > public._trip_stage_rank(coalesce(t.trip_stage, 'trip_sold'));
$$;

-- ────────────────────────────────────────────────────────────────────────
-- Mutator (gated to cron + admin only)
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.advance_trip_stages()
RETURNS TABLE (
  trip_id       uuid,
  cashflow_code text,
  from_stage    text,
  to_stage      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth gate: pg_cron (runs as postgres) OR admin+ when called via RPC.
  IF NOT (
    session_user IN ('postgres', 'supabase_admin')
    OR (auth.uid() IS NOT NULL AND public.is_admin_or_higher())
  ) THEN
    RAISE EXCEPTION 'advance_trip_stages requires scheduled or admin context'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  RETURN QUERY
  WITH today AS (SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS d),
       moves AS (
    SELECT
      t.id,
      t.cashflow_code,
      coalesce(t.trip_stage, 'trip_sold') AS from_stage,
      public._target_trip_stage(t.travel_start_date, t.travel_end_date, today.d) AS to_stage,
      t.lead_id
    FROM public.trip_cashflow t, today
    WHERE t.status NOT IN ('cancelled','completed')
      AND coalesce(t.trip_stage, 'trip_sold') != 'trip_completed'
      AND public._trip_stage_rank(
            public._target_trip_stage(t.travel_start_date, t.travel_end_date, today.d)
          )
        > public._trip_stage_rank(coalesce(t.trip_stage, 'trip_sold'))
  ),
  updated AS (
    UPDATE public.trip_cashflow t
       SET trip_stage = m.to_stage,
           updated_at = now()
      FROM moves m
     WHERE t.id = m.id
    RETURNING t.id, m.cashflow_code, m.from_stage, m.to_stage, m.lead_id
  ),
  logged AS (
    INSERT INTO public.lead_timeline (lead_id, event_type, note, metadata)
    SELECT u.lead_id,
           'trip_stage_changed',
           format('Stage auto-advanced: %s → %s', u.from_stage, u.to_stage),
           jsonb_build_object(
             'trip_id',       u.id,
             'cashflow_code', u.cashflow_code,
             'from',          u.from_stage,
             'to',            u.to_stage,
             'auto',          true
           )
      FROM updated u
     WHERE u.lead_id IS NOT NULL
    RETURNING 1
  )
  SELECT u.id, u.cashflow_code, u.from_stage, u.to_stage
    FROM updated u
   ORDER BY u.cashflow_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_trip_stage_advances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_trip_stages()         TO authenticated;

COMMENT ON FUNCTION public._target_trip_stage(date, date, date)
  IS 'Deterministic target trip_stage for a cashflow given its travel dates and today (IST).';
COMMENT ON FUNCTION public._trip_stage_rank(text)
  IS 'Ordinal ranking of trip_stage values. Used to prevent regressions.';
COMMENT ON FUNCTION public.preview_trip_stage_advances()
  IS 'Dry-run — rows that advance_trip_stages() WOULD move today. SELECT only.';
COMMENT ON FUNCTION public.advance_trip_stages()
  IS 'Promote trip_cashflow.trip_stage forward based on travel dates. Idempotent. Gated to pg_cron and admin+.';

-- ────────────────────────────────────────────────────────────────────────
-- Schedule: daily at 00:30 IST (= 19:00 UTC). Idempotent.
-- ────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'advance_trip_stages_daily';

    PERFORM cron.schedule(
      'advance_trip_stages_daily',
      '0 19 * * *',  -- 19:00 UTC = 00:30 IST next day
      $job$ SELECT public.advance_trip_stages(); $job$
    );
  END IF;
END $$;
