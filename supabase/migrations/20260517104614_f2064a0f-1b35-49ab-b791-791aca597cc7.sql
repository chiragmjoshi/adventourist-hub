-- Add FK from lead_timeline.actor_id to users so PostgREST embed works
ALTER TABLE public.lead_timeline
  ADD CONSTRAINT lead_timeline_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Also add FK for lead_id (was missing)
ALTER TABLE public.lead_timeline
  ADD CONSTRAINT lead_timeline_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;