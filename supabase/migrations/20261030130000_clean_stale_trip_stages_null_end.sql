-- Follow-up to 20261030120000_clean_stale_trip_stages.sql
--
-- The first pass only caught rows with travel_end_date set. A diagnostic
-- after that migration showed 200 rows still bucketed into "Trip Sold"
-- with travel_end_date = NULL and travel_start_date between 2020 and
-- late 2026. These are legacy imports where only the start was captured.
--
-- For those rows we approximate the end by travel_start_date + 30 days
-- (a safe buffer for Indian trips — typical length is 5-14 nights). If
-- the inferred end is more than 30 days past we mark the row completed.
-- An extra `60 days` buffer on the start date keeps the rule
-- comfortably conservative; nothing active today is at risk.

DO $$
DECLARE
  touched int;
BEGIN
  UPDATE public.trip_cashflow
  SET trip_stage = 'trip_completed'
  WHERE (trip_stage IS NULL OR trip_stage = 'trip_sold')
    AND (status IS NULL OR status NOT IN ('cancelled'))
    AND travel_end_date IS NULL
    AND travel_start_date IS NOT NULL
    AND travel_start_date < CURRENT_DATE - INTERVAL '60 days';
  GET DIAGNOSTICS touched = ROW_COUNT;
  RAISE NOTICE 'Cleaned trip_stage on % legacy rows (end_date NULL).', touched;
END $$;
