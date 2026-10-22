-- Phase 3.4b.1 — unschedule duplicate automation cron
--
-- 20261022200100_schedule_process_automations.sql added
-- `process_automations_every_15m`. After it merged we found the project
-- already had `process-automations-every-5-min` firing successfully at a
-- more responsive cadence, so we live-unscheduled the 15m one — but the
-- SQL file in main still says "schedule it". If anyone replays the
-- migration suite from scratch, the duplicate comes back.
--
-- This append-only migration explicitly unschedules the duplicate so the
-- end-state is deterministic no matter what order migrations re-run.
-- The preexisting `process-automations-every-5-min` job (jobid 1) is
-- untouched — it remains the single scheduler for the dispatcher.
--
-- Reverse SQL: not needed. If you ever want the 15-min cadence back,
-- re-add via a new migration with a fresh name.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'process_automations_every_15m';
  END IF;
END $$;
