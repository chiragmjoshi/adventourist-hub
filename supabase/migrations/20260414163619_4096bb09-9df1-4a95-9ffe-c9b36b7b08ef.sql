-- Disable trigger temporarily for bulk import
DROP TRIGGER IF EXISTS generate_traveller_code_trigger ON public.leads;

-- Add is_hot column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_hot boolean DEFAULT false;