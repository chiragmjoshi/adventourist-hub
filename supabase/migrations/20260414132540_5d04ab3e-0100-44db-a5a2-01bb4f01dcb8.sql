
-- Add recipient_name to automation_queue
ALTER TABLE public.automation_queue ADD COLUMN IF NOT EXISTS recipient_name text;

-- Add missing columns to automations_log
ALTER TABLE public.automations_log ADD COLUMN IF NOT EXISTS cashflow_id uuid REFERENCES public.trip_cashflow(id);
ALTER TABLE public.automations_log ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.automation_templates(id);
ALTER TABLE public.automations_log ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.automations_log ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '[]'::jsonb;

-- Seed review link
INSERT INTO public.automation_settings (key, value, description)
VALUES ('review_link', 'https://g.page/r/CfMqwu-plVJfEAE/review', 'Google review link sent in review request message')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed pre_trip_reminder_days default
INSERT INTO public.automation_settings (key, value, description)
VALUES ('pre_trip_reminder_days', '3', 'Days before travel to send pre-trip reminder')
ON CONFLICT (key) DO NOTHING;

-- Seed safe_journey_hour default
INSERT INTO public.automation_settings (key, value, description)
VALUES ('safe_journey_hour', '7', 'Hour (IST) to send safe journey message')
ON CONFLICT (key) DO NOTHING;

-- Seed review_request_hour default
INSERT INTO public.automation_settings (key, value, description)
VALUES ('review_request_hour', '10', 'Hour (IST) to send review request')
ON CONFLICT (key) DO NOTHING;
