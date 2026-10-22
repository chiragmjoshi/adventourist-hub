-- Phase 3.4.1 — Email automation hygiene + birthday / anniversary infra
--
-- Three things in one migration (all data-level, no new tables):
--
-- 1. Deactivate 6 duplicate rules that were created in separate sessions
--    and fire alongside their Title-Case counterparts. Last 60 days of
--    sends shows Pre-trip and Safe-journey each got TWO identical emails
--    on the same day. We soft-deactivate (is_active=false) rather than
--    DELETE so the rule editor can re-enable them if ops ever decides
--    they want the dual-send after all.
--
-- 2. Add a daily sweep function `enqueue_birthday_anniversary_executions`
--    that scans active rules with trigger_event IN
--    ('customer_birthday', 'customer_anniversary') and inserts pending
--    rows into automation_executions for every lead whose customer DOB
--    or anniversary MONTH-DAY matches today (Asia/Kolkata). The existing
--    dispatcher (via the atomic claim RPC) picks them up and sends.
--    Idempotent — won't duplicate for the same rule+lead within 30 days.
--
-- 3. Seed 4 new rules:
--      Birthday Wishes            customer_birthday
--      Wedding Anniversary Wishes customer_anniversary
--      2 Year Trip Anniversary    travel_date_passed + 730d (uses the
--                                 existing engine sweep, no code change)
--      3 Year Trip Anniversary    travel_date_passed + 1095d
--
-- Reality check: 0 of 5,963 leads currently have a linked customer with
-- a DOB or anniversary filled, so birthday / wedding rules will fire for
-- 0 customers today. The LeadDetail UI editor commit (3.4.3) lets admins
-- start collecting; emails fire as data lands. The trip-anniversary
-- rules can fire today — ~5-10 trips had their START anniversary this
-- week based on the trip_cashflow date distribution.
--
-- Reverse SQL:
--   -- 1) Re-enable duplicates
--   UPDATE public.automation_rules SET is_active = true
--     WHERE id IN (
--       'f0fcc7b6-d7e8-46a2-b48c-0b4685299e79', '7aca9b94-7604-4925-80c5-67d8f3b10988',
--       'dd46b013-151d-4c55-931f-fc84a4090eef', '4a744b41-04e7-41f9-bf8f-784cd3bce1a8',
--       '6b5872c0-cd3e-4b8f-9a0e-ca8fd1e34824', '3de1f757-bae5-412e-b399-7c200b1a88bf');
--   -- 2) Drop the sweep
--   DO $$ BEGIN
--     IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
--       PERFORM cron.unschedule(jobid) FROM cron.job
--         WHERE jobname='enqueue_birthday_anniversary_daily';
--     END IF;
--   END $$;
--   DROP FUNCTION IF EXISTS public.enqueue_birthday_anniversary_executions();
--   -- 3) Remove the seeded rules
--   DELETE FROM public.automation_rules
--    WHERE name IN ('Birthday Wishes','Wedding Anniversary Wishes',
--                   '2 Year Trip Anniversary','3 Year Trip Anniversary');

-- ────────────────────────────────────────────────────────────────────────
-- 1. Deactivate 6 duplicate rules
-- ────────────────────────────────────────────────────────────────────────

UPDATE public.automation_rules
   SET is_active = false
 WHERE id IN (
   'f0fcc7b6-d7e8-46a2-b48c-0b4685299e79',  -- Pre-trip reminder — 3 days before (dup of Pre-Trip — 3 Days Before, Title Case)
   '7aca9b94-7604-4925-80c5-67d8f3b10988',  -- Safe journey — day of travel (dup of Safe Journey — Day of Travel)
   'dd46b013-151d-4c55-931f-fc84a4090eef',  -- Review request — day after return (we keep Day 3 as the single review ask)
   '4a744b41-04e7-41f9-bf8f-784cd3bce1a8',  -- Trip confirmed — customer WA + Email (raw <h2> HTML breaks the branded shell; keep Trip Confirmed — Customer)
   '6b5872c0-cd3e-4b8f-9a0e-ca8fd1e34824',  -- Ghosted — Gentle Nudge (dup of Ghosted — follow-up WA)
   '3de1f757-bae5-412e-b399-7c200b1a88bf'   -- Lead lost — re-engagement WA (7 days) (dup of Lost Lead — Re-engagement at 72h; keep the shorter cadence)
 );

-- ────────────────────────────────────────────────────────────────────────
-- 2. Daily sweep: enqueue birthday + wedding-anniversary executions
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enqueue_birthday_anniversary_executions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_today_md text;
  v_inserted int;
BEGIN
  -- Gate: pg_cron (postgres) or admin+ RPC callers.
  IF NOT (
    session_user IN ('postgres', 'supabase_admin')
    OR (auth.uid() IS NOT NULL AND public.is_admin_or_higher())
  ) THEN
    RAISE EXCEPTION 'requires scheduled or admin context' USING ERRCODE = '42501';
  END IF;

  -- Compare month-day in IST so a birthday on Jan 1 fires in IST morning,
  -- not UTC pre-dawn.
  v_today_md := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'MM-DD');

  WITH active_rules AS (
    SELECT id, trigger_event
      FROM public.automation_rules
     WHERE is_active = true
       AND email_enabled = true
       AND trigger_event IN ('customer_birthday', 'customer_anniversary')
  ),
  matched AS (
    SELECT r.id AS rule_id,
           l.id AS lead_id,
           l.email AS recipient_contact,
           r.trigger_event
      FROM active_rules r
      JOIN public.leads     l ON (l.email IS NOT NULL AND l.email <> '')
      JOIN public.customers c ON c.id = l.customer_id
     WHERE (r.trigger_event = 'customer_birthday'
            AND c.dob IS NOT NULL
            AND to_char(c.dob, 'MM-DD') = v_today_md)
        OR (r.trigger_event = 'customer_anniversary'
            AND c.anniversary IS NOT NULL
            AND to_char(c.anniversary, 'MM-DD') = v_today_md)
  ),
  new_execs AS (
    INSERT INTO public.automation_executions (
      rule_id, lead_id, trigger_event, channel,
      recipient_type, recipient_contact,
      status, scheduled_for
    )
    SELECT m.rule_id, m.lead_id, m.trigger_event, 'email',
           'customer', m.recipient_contact,
           'pending', now()
      FROM matched m
     -- Idempotency: never enqueue twice for the same (rule, lead) in a
     -- 30-day window. Catches re-runs on the same day + protects
     -- against stale data edits.
     WHERE NOT EXISTS (
       SELECT 1
         FROM public.automation_executions ae
        WHERE ae.rule_id = m.rule_id
          AND ae.lead_id = m.lead_id
          AND ae.created_at > now() - interval '30 days'
     )
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM new_execs;
  RETURN v_inserted;
END $$;

GRANT EXECUTE ON FUNCTION public.enqueue_birthday_anniversary_executions()
  TO authenticated;

COMMENT ON FUNCTION public.enqueue_birthday_anniversary_executions()
  IS 'Daily sweep — inserts pending automation_executions for every lead whose linked customer''s DOB / anniversary month-day matches today (IST). Idempotent per 30-day window. Phase 3.4.1.';

-- Daily schedule: 02:30 IST = 21:00 UTC. Enqueues happen before most agents
-- open the admin app, so the next process-automations tick (whether server
-- cron or client tab) finds them ready.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'enqueue_birthday_anniversary_daily';

    PERFORM cron.schedule(
      'enqueue_birthday_anniversary_daily',
      '0 21 * * *',  -- 21:00 UTC = 02:30 IST next day
      $job$ SELECT public.enqueue_birthday_anniversary_executions(); $job$
    );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- 3. Seed 4 new automation rules
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO public.automation_rules (
  name, trigger_event, trigger_days_before,
  is_active, email_enabled, email_recipient,
  send_time_window_start, send_time_window_end, delay_hours,
  email_subject, email_hero_title, email_hero_subtitle, email_body,
  email_cta_label, email_cta_url
)
VALUES
  (
    'Birthday Wishes',
    'customer_birthday', NULL,
    true, true, 'customer',
    '09:00', '11:00', 0,
    'Happy birthday, {{name}}! 🎂',
    'Happy birthday, {{name}}!',
    'From everyone at Adventourist',
    E'Hi {{name}},\n\nWishing you a day as wonderful as the places on your bucket list. 🎂\n\nIf a getaway is in your plans this year, we''d be delighted to help you plan it — just reply to this email.\n\nHave a lovely day!\n\nWith warmth,\nTeam Adventourist\n+91 99304 00694',
    'Plan a trip for your special day',
    'https://adventourist.in/contact'
  ),
  (
    'Wedding Anniversary Wishes',
    'customer_anniversary', NULL,
    true, true, 'customer',
    '09:00', '11:00', 0,
    'Happy anniversary, {{name}}! 💐',
    'Happy anniversary, {{name}}!',
    'Celebrating your special day',
    E'Hi {{name}},\n\nWishing you and your partner a very happy anniversary — may this year bring even more adventures together.\n\nIf you''re thinking of marking the day with a trip, we''d love to help you plan it.\n\nWarm wishes,\nTeam Adventourist\n+91 99304 00694',
    'Plan an anniversary trip',
    'https://adventourist.in/contact'
  ),
  (
    '2 Year Trip Anniversary',
    'travel_date_passed', 730,
    true, true, 'customer',
    '09:00', '10:00', 0,
    'Two years since {{destination}}, {{name}} 🌟',
    'Two years ago in {{destination}}',
    'A memory worth revisiting',
    E'Hi {{name}},\n\nTwo years ago today, you were in {{destination}} with us. We hope it still brings a smile.\n\nAnother corner of the world is always waiting whenever you''re ready — just reply if you''d like us to help you plan the next one.\n\nWith warmth,\nTeam Adventourist\n+91 99304 00694',
    'Plan another adventure',
    'https://adventourist.in/trips'
  ),
  (
    '3 Year Trip Anniversary',
    'travel_date_passed', 1095,
    true, true, 'customer',
    '09:00', '10:00', 0,
    'Three years since {{destination}}, {{name}} ✨',
    'Three years ago in {{destination}}',
    'Where to next?',
    E'Hi {{name}},\n\nThree years ago today, we were planning your {{destination}} adventure. Time flies.\n\nIf the travel itch is back, we''re here. Reply any time and we''ll pick up right where we left off.\n\nWith warmth,\nTeam Adventourist\n+91 99304 00694',
    'Browse new destinations',
    'https://adventourist.in/trips'
  )
ON CONFLICT DO NOTHING;
