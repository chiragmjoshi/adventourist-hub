ALTER TABLE public.trip_cashflow
  ADD COLUMN IF NOT EXISTS is_customized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_itinerary_url text;