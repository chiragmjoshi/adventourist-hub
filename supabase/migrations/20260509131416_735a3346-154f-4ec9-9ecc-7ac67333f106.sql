-- Reminders / Calendar
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  reminder_type text NOT NULL DEFAULT 'task',
  due_at timestamptz NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trip_cashflow(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to reminders"
  ON public.reminders FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_reminders_due_at ON public.reminders(due_at);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON public.reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_lead_id ON public.reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_reminders_trip_id ON public.reminders(trip_id);

-- Trip Kanban stage
ALTER TABLE public.trip_cashflow
  ADD COLUMN IF NOT EXISTS trip_stage text NOT NULL DEFAULT 'trip_sold';

CREATE INDEX IF NOT EXISTS idx_trip_cashflow_trip_stage ON public.trip_cashflow(trip_stage);
