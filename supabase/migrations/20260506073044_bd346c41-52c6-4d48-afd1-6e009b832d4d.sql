-- Backfill leads stuck with placeholder traveller_code = 'TEMP'.
-- The trigger generate_traveller_code only fires on INSERT when the column
-- is NULL or empty, so previously inserted 'TEMP' rows were never assigned
-- a real code. We loop and assign codes one-by-one using the same logic
-- as generate_traveller_code(), but based on each lead's created_at month.
DO $$
DECLARE
  r RECORD;
  v_month_code text;
  v_year text;
  v_prefix text;
  v_seq int;
  v_month int;
BEGIN
  FOR r IN
    SELECT id, created_at FROM public.leads
    WHERE traveller_code = 'TEMP' OR traveller_code IS NULL OR traveller_code = ''
    ORDER BY created_at ASC
  LOOP
    v_year := to_char(r.created_at, 'YY');
    v_month := EXTRACT(MONTH FROM r.created_at)::int;
    v_month_code := CASE v_month
      WHEN 1  THEN 'JA' WHEN 2  THEN 'F'  WHEN 3  THEN 'MA'
      WHEN 4  THEN 'AP' WHEN 5  THEN 'M'  WHEN 6  THEN 'JU'
      WHEN 7  THEN 'JL' WHEN 8  THEN 'AU' WHEN 9  THEN 'S'
      WHEN 10 THEN 'O'  WHEN 11 THEN 'N'  WHEN 12 THEN 'D'
    END;
    v_prefix := v_month_code || v_year;

    INSERT INTO public.traveller_code_sequence (year_prefix, last_sequence)
    VALUES (v_prefix, 1)
    ON CONFLICT (year_prefix) DO UPDATE
      SET last_sequence = traveller_code_sequence.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    UPDATE public.leads
       SET traveller_code = v_prefix || lpad(v_seq::text, 5, '0')
     WHERE id = r.id;
  END LOOP;
END $$;