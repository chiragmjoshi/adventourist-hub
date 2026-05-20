DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_timeline;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_timeline REPLICA IDENTITY FULL;