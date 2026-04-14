
-- Create automation_templates table
CREATE TABLE IF NOT EXISTS public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  aisensy_template_name text NOT NULL,
  is_active boolean DEFAULT true,
  recipient_type text DEFAULT 'customer',
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation_templates"
ON public.automation_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage automation_templates"
ON public.automation_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed 5 templates
INSERT INTO public.automation_templates (name, trigger_event, aisensy_template_name, recipient_type, description) VALUES
  ('Trip Confirmed', 'file_closed', 'REPLACE_WITH_YOUR_TEMPLATE_NAME', 'customer', 'Sent when trip is marked as File Closed'),
  ('Pre-Trip Reminder', 'pre_trip_3days', 'REPLACE_WITH_YOUR_TEMPLATE_NAME', 'customer', 'Sent 3 days before travel start date'),
  ('Safe Journey', 'safe_journey', 'REPLACE_WITH_YOUR_TEMPLATE_NAME', 'customer', 'Sent on the morning of travel start date'),
  ('Review Request', 'review_request', 'REPLACE_WITH_YOUR_TEMPLATE_NAME', 'customer', 'Sent day after travel end date'),
  ('Follow Up Reminder', 'follow_up_reminder', 'REPLACE_WITH_YOUR_TEMPLATE_NAME', 'agent', 'Sent to agent when disposition = follow_up_needed');

-- Create automation_queue table
CREATE TABLE IF NOT EXISTS public.automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id),
  cashflow_id uuid REFERENCES public.trip_cashflow(id),
  template_id uuid REFERENCES public.automation_templates(id),
  trigger_event text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending',
  recipient_mobile text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]',
  aisensy_response jsonb DEFAULT '{}',
  attempts int DEFAULT 0,
  last_attempted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation_queue"
ON public.automation_queue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage automation_queue"
ON public.automation_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
