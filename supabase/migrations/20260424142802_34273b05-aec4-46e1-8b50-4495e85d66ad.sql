ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_date date;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date
  ON public.leads (follow_up_date)
  WHERE follow_up_date IS NOT NULL;

ALTER TABLE public.trip_cashflow_vendors
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trip_cashflow_vendors_payment_status_check'
  ) THEN
    ALTER TABLE public.trip_cashflow_vendors
      ADD CONSTRAINT trip_cashflow_vendors_payment_status_check
      CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
  END IF;
END $$;