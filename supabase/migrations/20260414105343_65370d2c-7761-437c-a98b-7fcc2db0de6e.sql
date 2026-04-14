
-- Add notes column to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS notes text;

-- Create vendor code sequence table
CREATE TABLE IF NOT EXISTS public.vendor_code_sequence (
  year_prefix text PRIMARY KEY,
  last_sequence integer NOT NULL DEFAULT 0
);

ALTER TABLE public.vendor_code_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage vendor_code_sequence"
ON public.vendor_code_sequence FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Create vendor code generation function
CREATE OR REPLACE FUNCTION public.generate_vendor_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_prefix text;
  v_seq int;
BEGIN
  IF NEW.vendor_code IS NOT NULL AND NEW.vendor_code != '' THEN
    RETURN NEW;
  END IF;

  v_year := to_char(now(), 'YY');
  v_prefix := 'V' || v_year;

  INSERT INTO public.vendor_code_sequence (year_prefix, last_sequence)
  VALUES (v_prefix, 1)
  ON CONFLICT (year_prefix) DO UPDATE SET last_sequence = vendor_code_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  NEW.vendor_code := v_prefix || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger on vendors table
CREATE TRIGGER trigger_generate_vendor_code
BEFORE INSERT ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.generate_vendor_code();

-- Create storage bucket for vendor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-docs', 'vendor-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can view vendor docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vendor-docs');

CREATE POLICY "Authenticated users can upload vendor docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vendor-docs');

CREATE POLICY "Authenticated users can delete vendor docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vendor-docs');
