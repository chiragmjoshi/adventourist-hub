
CREATE TABLE IF NOT EXISTS public.traveller_code_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  old_code text NOT NULL,
  new_code text NOT NULL,
  rows_affected jsonb NOT NULL DEFAULT '{}'::jsonb,
  merged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.traveller_code_merges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tcm_select_auth' AND tablename='traveller_code_merges') THEN
    CREATE POLICY "tcm_select_auth" ON public.traveller_code_merges FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tcm_insert_auth' AND tablename='traveller_code_merges') THEN
    CREATE POLICY "tcm_insert_auth" ON public.traveller_code_merges FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_traveller_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_month_code text;
  v_year text;
  v_prefix text;
  v_seq int;
  v_month int;
  v_existing_code text;
  v_norm_email text;
BEGIN
  IF NEW.traveller_code IS NOT NULL AND NEW.traveller_code <> '' AND NEW.traveller_code <> 'TEMP' THEN
    RETURN NEW;
  END IF;

  v_norm_email := lower(btrim(coalesce(NEW.email, '')));
  IF v_norm_email <> '' AND v_norm_email ~ '^[^@[:space:],/;]+@[^@[:space:],/;]+\.[^@[:space:],/;]+$' THEN
    SELECT traveller_code INTO v_existing_code
      FROM public.leads
     WHERE lower(btrim(coalesce(email, ''))) = v_norm_email
       AND traveller_code IS NOT NULL
       AND traveller_code <> ''
       AND traveller_code <> 'TEMP'
     ORDER BY created_at ASC
     LIMIT 1;
    IF v_existing_code IS NOT NULL THEN
      NEW.traveller_code := v_existing_code;
      RETURN NEW;
    END IF;
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
$function$;

DO $$
DECLARE
  r record;
  v_lead_count int;
  v_cf_count int;
BEGIN
  FOR r IN
    WITH clean AS (
      SELECT id, lower(btrim(email)) AS norm_email, traveller_code, created_at
        FROM public.leads
       WHERE email IS NOT NULL
         AND lower(btrim(email)) ~ '^[^@[:space:],/;]+@[^@[:space:],/;]+\.[^@[:space:],/;]+$'
         AND traveller_code IS NOT NULL AND traveller_code <> '' AND traveller_code <> 'TEMP'
    ),
    per_email AS (
      SELECT norm_email, traveller_code, min(created_at) AS first_seen
        FROM clean GROUP BY 1,2
    ),
    canonical AS (
      SELECT DISTINCT ON (norm_email) norm_email, traveller_code AS canonical_code
        FROM per_email ORDER BY norm_email, first_seen ASC
    )
    SELECT pe.norm_email AS email, pe.traveller_code AS old_code, c.canonical_code AS new_code
      FROM per_email pe
      JOIN canonical c ON c.norm_email = pe.norm_email
     WHERE pe.traveller_code <> c.canonical_code
  LOOP
    UPDATE public.leads
       SET traveller_code = r.new_code
     WHERE traveller_code = r.old_code
       AND lower(btrim(coalesce(email, ''))) = r.email
       AND lower(btrim(coalesce(email, ''))) ~ '^[^@[:space:],/;]+@[^@[:space:],/;]+\.[^@[:space:],/;]+$';
    GET DIAGNOSTICS v_lead_count = ROW_COUNT;

    UPDATE public.trip_cashflow
       SET traveller_code = r.new_code
     WHERE traveller_code = r.old_code
       AND lead_id IN (SELECT id FROM public.leads WHERE traveller_code = r.new_code AND lower(btrim(coalesce(email, ''))) = r.email);
    GET DIAGNOSTICS v_cf_count = ROW_COUNT;

    -- Also catch orphan cashflows (lead_id NULL) tied to old code where ALL clean-email leads for that code now point at new_code
    UPDATE public.trip_cashflow
       SET traveller_code = r.new_code
     WHERE traveller_code = r.old_code
       AND lead_id IS NULL;

    INSERT INTO public.traveller_code_merges (email, old_code, new_code, rows_affected)
    VALUES (r.email, r.old_code, r.new_code,
            jsonb_build_object('leads', v_lead_count, 'trip_cashflow', v_cf_count));
  END LOOP;
END $$;
