
CREATE TABLE IF NOT EXISTS public.monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_expenses TO authenticated;
GRANT ALL ON public.monthly_expenses TO service_role;

ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "me_all_auth"
  ON public.monthly_expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER monthly_expenses_set_updated_at
BEFORE UPDATE ON public.monthly_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
