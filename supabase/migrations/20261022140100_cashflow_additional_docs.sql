-- Phase 3.2 — persist additional docs on trip_cashflow
--
-- Problem: src/pages/TripCashflowEdit.tsx has an `additionalDocs` state
-- that the upload handler pushes to on success, but the payload sent on
-- save (lines 205-217) never references it. Every "Other Document"
-- uploaded via the UI lands in Supabase Storage but has no DB row
-- pointing to it — permanent orphans. Audit flagged this as L9.
--
-- Fix: add a `additional_docs` text[] column to trip_cashflow holding
-- the storage paths, matching the existing pattern (pan_card_url text,
-- custom_itinerary_url text). Keeping it in-row avoids a separate
-- table for what is essentially a short list of URLs; if per-doc
-- metadata is ever needed (label, uploader, mime) we can migrate to
-- a trip_cashflow_documents table later.
--
-- The RLS policies on trip_cashflow already apply — a column add
-- doesn't need new RLS rules.
--
-- Reverse SQL:
--   ALTER TABLE public.trip_cashflow DROP COLUMN IF EXISTS additional_docs;

ALTER TABLE public.trip_cashflow
  ADD COLUMN IF NOT EXISTS additional_docs text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.trip_cashflow.additional_docs
  IS 'Supabase Storage paths (bucket: cashflow-docs) for "Other Documents" uploaded on the cashflow — passport copies, visas, etc. Phase 3.2.';
