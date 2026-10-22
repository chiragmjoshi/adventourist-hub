-- Phase 3.4.2 — Schedule process-automations server-side every 15 minutes
--
-- Context: automation delivery today depends entirely on an admin tab
-- being open — src/App.tsx:134-141 kicks off setInterval(processAuto-
-- mationQueue, 15 min). If no admin opens the app overnight, scheduled
-- morning sends (safe-journey 07:00, pre-trip 09:00, birthday 09-11,
-- anniversary 09-10) miss their window. User's ask: "make sure emails
-- go on time".
--
-- Solution: pg_cron fires every 15 minutes and uses pg_net to POST to
-- the process-automations edge function. The function already has
-- verify_jwt=false (see supabase/config.toml), so no secret is needed —
-- the public URL is enough. The function's own atomic claim RPC
-- (phase 3.1) guarantees it stays safe to run concurrently with the
-- still-active client setInterval; both callers claim different rows.
--
-- Separation of concerns:
--   * This commit ADDS the server cron.
--   * The client setInterval STAYS until we've seen two full cron ticks
--     succeed in production. A follow-up PR removes it.
--
-- Project URL is hardcoded from supabase/config.toml (project_id =
-- ufjhiqdpshrubephgxrs). If the project is ever cloned to a new ref the
-- schedule needs to be re-pointed; a vault-backed indirection is a
-- separate PR when it matters.
--
-- Reverse SQL:
--   DO $$ BEGIN
--     IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
--       PERFORM cron.unschedule(jobid) FROM cron.job
--         WHERE jobname='process_automations_every_15m';
--     END IF;
--   END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; skipping schedule';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net not installed; skipping schedule';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname = 'process_automations_every_15m';

  -- Every 15 min from the top of the hour (:00, :15, :30, :45 UTC).
  -- Lead time between schedule and firing is small (<60s), so an email
  -- scheduled for 09:05 IST will be sent by 09:15 IST at the latest.
  PERFORM cron.schedule(
    'process_automations_every_15m',
    '*/15 * * * *',
    $job$
      SELECT net.http_post(
        url     := 'https://ufjhiqdpshrubephgxrs.supabase.co/functions/v1/process-automations',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := jsonb_build_object('source', 'pg_cron'),
        timeout_milliseconds := 20000
      ) AS request_id;
    $job$
  );
END $$;
