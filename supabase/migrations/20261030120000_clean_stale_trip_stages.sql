-- Fix: Trips Kanban — clean legacy rows sitting in "Trip Sold".
--
-- Why they're there:
--   advance_trip_stages() (Phase 3.5) moves rows forward based on travel
--   dates but requires the row to already carry a trip_stage value. The
--   TripsKanban UI's grouping has a fallback that puts rows with NULL
--   trip_stage into the "Trip Sold" column, which is where legacy
--   imports (2020-22) ended up.
--
-- This one-shot UPDATE marks every row that:
--   (1) has no stage or an initial-stage fallback,
--   (2) actually ended travel more than 30 days ago,
--   (3) is not cancelled,
-- as 'trip_completed' so the Kanban stops showing stale cards.
-- The hideCompleted toggle in the UI defaults ON, so these drop out of
-- view immediately. New trips continue to flow via advance_trip_stages.

DO $$
DECLARE
  touched int;
BEGIN
  UPDATE public.trip_cashflow
  SET trip_stage = 'trip_completed'
  WHERE (trip_stage IS NULL OR trip_stage = 'trip_sold')
    AND travel_end_date IS NOT NULL
    AND travel_end_date < CURRENT_DATE - INTERVAL '30 days'
    AND (status IS NULL OR status NOT IN ('cancelled'));
  GET DIAGNOSTICS touched = ROW_COUNT;
  RAISE NOTICE 'Cleaned trip_stage on % legacy rows.', touched;
END $$;
