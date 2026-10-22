-- Phase 3.5.1 — transactional vendor-lines save
--
-- Problem: src/pages/TripCashflowEdit.tsx:253-262 does
--   DELETE FROM trip_cashflow_vendors WHERE cashflow_id=?
--   INSERT INTO trip_cashflow_vendors ...
-- as two separate Supabase calls. If anything fails between them —
-- browser tab closed, 500 on the insert payload, RLS deny — the delete
-- commits but the insert never happens. The cashflow is left with ZERO
-- vendor lines and the margin maths on reports goes to 0 % overnight.
-- Audit flagged this as L10.
--
-- Fix: a Postgres RPC that does both operations inside the same
-- function body (implicit transaction). All-or-nothing.
--
-- The RPC takes:
--   p_cashflow_id uuid
--   p_lines       jsonb[]   (array of {vendor_id, service_type, ...})
-- and returns the number of inserted lines (so the caller can toast).
--
-- RLS: the function runs as the caller (SECURITY INVOKER) so the
-- existing Phase 2.5b write policies on trip_cashflow_vendors (ops /
-- admin / super_admin / finance only) still apply. A privileged role
-- check is NOT added here because the row-level policies already
-- enforce it.
--
-- Reverse SQL:
--   DROP FUNCTION IF EXISTS public.upsert_cashflow_vendors(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.upsert_cashflow_vendors(
  p_cashflow_id uuid,
  p_lines       jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF p_cashflow_id IS NULL THEN
    RAISE EXCEPTION 'cashflow_id is required' USING ERRCODE = '22004';
  END IF;

  -- Both the DELETE and the INSERT below execute inside this function's
  -- implicit transaction. If the INSERT fails (RLS, type mismatch,
  -- constraint), the DELETE is rolled back — no half-saved state.

  DELETE FROM public.trip_cashflow_vendors
   WHERE cashflow_id = p_cashflow_id;

  WITH inserted AS (
    INSERT INTO public.trip_cashflow_vendors (
      cashflow_id, vendor_id, service_type, description,
      cost_per_pax_incl_gst, invoice_url, sort_order
    )
    SELECT
      p_cashflow_id,
      NULLIF(line->>'vendor_id', '')::uuid,
      line->>'service_type',
      NULLIF(line->>'description', ''),
      COALESCE((line->>'cost_per_pax_incl_gst')::numeric, 0),
      NULLIF(line->>'invoice_url', ''),
      COALESCE((line->>'sort_order')::int, 0)
    FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb)) AS line
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_cashflow_vendors(uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.upsert_cashflow_vendors(uuid, jsonb)
  IS 'Atomic replace of a cashflow''s vendor-line set. Deletes existing rows and inserts the provided jsonb array inside one transaction so a partial failure can''t wipe vendor lines. Phase 3.5.1.';
