-- Create a sequence tracking table for traveller codes
CREATE TABLE IF NOT EXISTS public.traveller_code_sequence (
  year_prefix text PRIMARY KEY,
  last_sequence int NOT NULL DEFAULT 0
);

-- Function to generate traveller code
CREATE OR REPLACE FUNCTION public.generate_traveller_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq int;
BEGIN
  v_year := to_char(now(), 'YY');
  
  -- Upsert the sequence counter
  INSERT INTO public.traveller_code_sequence (year_prefix, last_sequence)
  VALUES (v_year, 1)
  ON CONFLICT (year_prefix) DO UPDATE SET last_sequence = traveller_code_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  
  NEW.traveller_code := 'AU' || v_year || lpad(v_seq::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
CREATE TRIGGER set_traveller_code
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.generate_traveller_code();

-- RLS for sequence table (internal only)
ALTER TABLE public.traveller_code_sequence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sequence" ON public.traveller_code_sequence FOR ALL TO authenticated USING (true) WITH CHECK (true);