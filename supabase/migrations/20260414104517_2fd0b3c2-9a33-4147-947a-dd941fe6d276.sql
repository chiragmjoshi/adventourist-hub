
CREATE TABLE public.lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lead comments"
ON public.lead_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create lead comments"
ON public.lead_comments FOR INSERT TO authenticated
WITH CHECK (true);
