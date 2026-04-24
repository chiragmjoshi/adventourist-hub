-- 1) Update FKs to ON DELETE SET NULL so deleting a user does not break referential integrity

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.lead_comments DROP CONSTRAINT IF EXISTS lead_comments_user_id_fkey;
ALTER TABLE public.lead_comments
  ADD CONSTRAINT lead_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.lead_comments ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.lead_timeline DROP CONSTRAINT IF EXISTS lead_timeline_actor_id_fkey;
ALTER TABLE public.lead_timeline
  ADD CONSTRAINT lead_timeline_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.trip_cashflow DROP CONSTRAINT IF EXISTS trip_cashflow_assigned_to_fkey;
ALTER TABLE public.trip_cashflow
  ADD CONSTRAINT trip_cashflow_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.trip_cashflow DROP CONSTRAINT IF EXISTS trip_cashflow_created_by_fkey;
ALTER TABLE public.trip_cashflow
  ADD CONSTRAINT trip_cashflow_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2) Tighten RLS on public.users
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Allow self-update only on profile fields (role/is_active/email cannot be changed by self)
CREATE POLICY "Users can update own profile fields"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  AND is_active = (SELECT is_active FROM public.users WHERE id = auth.uid())
  AND email = (SELECT email FROM public.users WHERE id = auth.uid())
);
-- INSERT and DELETE: no policy => only service_role (edge function) can perform them.