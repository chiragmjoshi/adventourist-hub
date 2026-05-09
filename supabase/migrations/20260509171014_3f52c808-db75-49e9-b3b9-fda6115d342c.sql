
CREATE OR REPLACE FUNCTION public.generate_adv_traveller_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_prefix text;
  v_seq int;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_prefix := 'ADV-' || v_year;

  INSERT INTO public.traveller_code_sequence (year_prefix, last_sequence)
  VALUES (v_prefix, 1)
  ON CONFLICT (year_prefix) DO UPDATE SET last_sequence = traveller_code_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  RETURN v_prefix || '-' || lpad(v_seq::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_traveller_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_month_code text;
  v_year text;
  v_prefix text;
  v_seq int;
  v_month int;
BEGIN
  IF NEW.traveller_code IS NOT NULL AND NEW.traveller_code <> '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(now(), 'YY');
  v_month := EXTRACT(MONTH FROM now())::int;

  v_month_code := CASE v_month
    WHEN 1  THEN 'JA' WHEN 2  THEN 'F'  WHEN 3  THEN 'MA' WHEN 4  THEN 'AP'
    WHEN 5  THEN 'M'  WHEN 6  THEN 'JU' WHEN 7  THEN 'JL' WHEN 8  THEN 'AU'
    WHEN 9  THEN 'S'  WHEN 10 THEN 'O'  WHEN 11 THEN 'N'  WHEN 12 THEN 'D'
  END;

  v_prefix := v_month_code || v_year;

  INSERT INTO public.traveller_code_sequence (year_prefix, last_sequence)
  VALUES (v_prefix, 1)
  ON CONFLICT (year_prefix) DO UPDATE SET last_sequence = traveller_code_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  NEW.traveller_code := v_prefix || lpad(v_seq::text, 5, '0');
  RETURN NEW;
END;
$$;
