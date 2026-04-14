
-- Add mobile column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile text;

-- Create automation_settings table for template configs, timing, API keys
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation_settings"
ON public.automation_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage automation_settings"
ON public.automation_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default automation settings
INSERT INTO public.automation_settings (key, value, description) VALUES
  ('aisensy_api_key', '', 'AiSensy API Key'),
  ('pre_trip_reminder_days', '3', 'Days before travel to send pre-trip reminder'),
  ('safe_journey_hour', '7', 'Hour (0-23) to send safe journey message'),
  ('review_request_hour', '10', 'Hour (0-23) to send review request day after return'),
  ('review_link', '', 'Google Review link sent in review request'),
  ('template_file_closed', 'file_closed_template', 'AiSensy template name for file closed'),
  ('template_pre_trip', 'pre_trip_template', 'AiSensy template name for pre-trip reminder'),
  ('template_safe_journey', 'safe_journey_template', 'AiSensy template name for safe journey'),
  ('template_review_request', 'review_request_template', 'AiSensy template name for review request'),
  ('template_follow_up', 'follow_up_template', 'AiSensy template name for follow-up reminder')
ON CONFLICT (key) DO NOTHING;
