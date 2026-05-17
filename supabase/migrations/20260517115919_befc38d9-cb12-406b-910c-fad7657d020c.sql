-- ============================================================
-- SEC-2: column-level masking at the DB level
-- ============================================================

-- A) Vendor bank details masking
CREATE OR REPLACE FUNCTION public.get_vendor_safe(p_vendor_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();

  IF v_role IN ('admin','super_admin','finance','operations') THEN
    SELECT row_to_json(v.*) INTO v_result
    FROM public.vendors v
    WHERE v.id = p_vendor_id;
  ELSE
    SELECT row_to_json(v.*) INTO v_result
    FROM (
      SELECT
        id, vendor_code, name, nick_name, services, serve_destinations,
        office_address_1, office_address_2, gst, pan,
        contact_points, notes, is_active, created_at, updated_at,
        '••••••••••••'::text AS bank_account,
        '••••••••'::text     AS bank_ifsc,
        '••••••••••••'::text AS bank_name,
        '••••••••'::text     AS bank_micr,
        '••••••••'::text     AS bank_swift
      FROM public.vendors
      WHERE id = p_vendor_id
    ) v;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_safe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_safe(uuid) TO authenticated;

-- B) Trip cashflow margin protection — view without margin_percent
CREATE OR REPLACE VIEW public.trip_cashflow_sales_view
WITH (security_invoker = true) AS
SELECT
  id, cashflow_code, lead_id, itinerary_id, destination_id,
  traveller_name, traveller_code, trip_stage, status,
  travel_start_date, travel_end_date, booking_date,
  pax_count, gst_billing, is_customized,
  custom_itinerary_url, pan_card_url, zoho_invoice_ref,
  notes, assigned_to, created_by, created_at, updated_at
FROM public.trip_cashflow;

GRANT SELECT ON public.trip_cashflow_sales_view TO authenticated;

-- ============================================================
-- SEC-5: DB-level format validation (NOT VALID — applies to new/updated rows only)
-- ============================================================

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS chk_gst_format;
ALTER TABLE public.vendors
  ADD CONSTRAINT chk_gst_format
  CHECK (gst IS NULL OR gst = '' OR gst ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
  NOT VALID;

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS chk_pan_format;
ALTER TABLE public.vendors
  ADD CONSTRAINT chk_pan_format
  CHECK (pan IS NULL OR pan = '' OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$')
  NOT VALID;

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS chk_ifsc_format;
ALTER TABLE public.vendors
  ADD CONSTRAINT chk_ifsc_format
  CHECK (bank_ifsc IS NULL OR bank_ifsc = '' OR bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
  NOT VALID;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS chk_mobile_format;
ALTER TABLE public.leads
  ADD CONSTRAINT chk_mobile_format
  CHECK (mobile IS NULL OR mobile = '' OR mobile ~ '^[0-9+\-\s]{7,20}$')
  NOT VALID;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS chk_email_format;
ALTER TABLE public.leads
  ADD CONSTRAINT chk_email_format
  CHECK (email IS NULL OR email = '' OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  NOT VALID;

ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS chk_price_positive;
ALTER TABLE public.itineraries
  ADD CONSTRAINT chk_price_positive
  CHECK (price_per_person IS NULL OR price_per_person >= 0)
  NOT VALID;

ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS chk_nights_positive;
ALTER TABLE public.itineraries
  ADD CONSTRAINT chk_nights_positive
  CHECK (nights IS NULL OR nights >= 0)
  NOT VALID;

ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS chk_days_positive;
ALTER TABLE public.itineraries
  ADD CONSTRAINT chk_days_positive
  CHECK (days IS NULL OR days >= 0)
  NOT VALID;