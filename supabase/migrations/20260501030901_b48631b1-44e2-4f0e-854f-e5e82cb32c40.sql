
-- Drop old automation tables (keep automations_log for legacy history)
DROP TABLE IF EXISTS public.automation_queue CASCADE;
DROP TABLE IF EXISTS public.automation_templates CASCADE;
DROP TABLE IF EXISTS public.automation_rules CASCADE;

-- New flexible rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,

  trigger_event text NOT NULL,
  trigger_days_before int,
  trigger_inactivity_days int,

  condition_status text[],
  condition_disposition text[],
  condition_platform text[],
  condition_channel text[],

  delay_hours int NOT NULL DEFAULT 0,
  send_time_window_start time,
  send_time_window_end time,

  wa_enabled boolean NOT NULL DEFAULT false,
  wa_recipient text NOT NULL DEFAULT 'customer',
  wa_template_name text,
  wa_message_body text,

  email_enabled boolean NOT NULL DEFAULT false,
  email_recipient text NOT NULL DEFAULT 'customer',
  email_subject text,
  email_body text,
  email_format text NOT NULL DEFAULT 'html',

  run_count int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation_rules"
  ON public.automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage automation_rules"
  ON public.automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Executions table
CREATE TABLE public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  lead_id uuid,
  trigger_event text,
  channel text,
  recipient_type text,
  recipient_contact text,
  message_preview text,
  status text NOT NULL DEFAULT 'pending',
  skip_reason text,
  error_message text,
  scheduled_for timestamptz,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation_executions"
  ON public.automation_executions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage automation_executions"
  ON public.automation_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_executions_rule ON public.automation_executions(rule_id);
CREATE INDEX idx_executions_lead ON public.automation_executions(lead_id);
CREATE INDEX idx_executions_status ON public.automation_executions(status);
CREATE INDEX idx_executions_scheduled ON public.automation_executions(scheduled_for)
  WHERE status = 'pending';

-- Seed 8 default rules
INSERT INTO public.automation_rules
  (name, description, trigger_event, trigger_days_before, delay_hours,
   send_time_window_start, send_time_window_end,
   wa_enabled, wa_recipient, wa_template_name, wa_message_body,
   email_enabled, email_recipient, email_subject, email_body,
   condition_status)
VALUES
  ('New lead — instant WA to customer',
   'Welcome message to every new lead the moment it lands.',
   'lead_created', NULL, 0, NULL, NULL,
   true, 'customer', 'new_lead_welcome',
   'Hi {{name}}! Thanks for reaching out to Adventourist. I''m {{agent_name}}, your travel expert. I''ll call you shortly to understand your {{destination}} travel plans. Meanwhile, feel free to WhatsApp me at +91 99304 00694.',
   false, 'customer', NULL, NULL, NULL),

  ('New lead — agent alert',
   'Notify the assigned agent that a new lead just arrived.',
   'lead_created', NULL, 0, NULL, NULL,
   true, 'agent', 'new_lead_agent_alert',
   'New lead alert! {{name}} ({{traveller_code}}) has enquired about {{destination}}. Mobile: {{mobile}}. Platform: {{platform}}. Call now!',
   false, 'agent', NULL, NULL, NULL),

  ('Trip confirmed — customer WA + Email',
   'Send confirmation when a lead status moves to file_closed.',
   'status_changed', NULL, 0, NULL, NULL,
   true, 'customer', 'trip_confirmed',
   'Hi {{name}}! Your {{destination}} trip is confirmed with Adventourist! Trip code: {{traveller_code}}. Travel date: {{travel_date}}. We''ll be in touch with all details. Excited for your adventure! - Team Adventourist',
   true, 'customer',
   'Your {{destination}} trip is confirmed!',
   '<h2>Your {{destination}} adventure is confirmed!</h2><p>Hi {{name}},</p><p>Trip code: <strong>{{traveller_code}}</strong><br/>Travel date: <strong>{{travel_date}}</strong></p><p>Your travel expert {{agent_name}} will share all the details shortly.</p><p>— Team Adventourist</p>',
   ARRAY['file_closed']),

  ('Lead lost — re-engagement WA (7 days)',
   'Win-back message a week after a lead is marked file_lost.',
   'status_changed', NULL, 168, NULL, NULL,
   true, 'customer', 'lead_lost_reengagement',
   'Hi {{name}}, this is {{agent_name}} from Adventourist. I know travel planning takes time — if you''re still dreaming of {{destination}}, we''d love to help! Our {{destination}} packages start from ₹{{price}}. Shall we pick up where we left off?',
   false, 'customer', NULL, NULL,
   ARRAY['file_lost']),

  ('Ghosted — follow-up WA (48h)',
   'Gentle nudge to leads marked ghosted.',
   'disposition_changed', NULL, 48, NULL, NULL,
   true, 'customer', 'ghosted_follow_up',
   'Hi {{name}}! Still dreaming of {{destination}}? We understand life gets busy. When you''re ready, we''re here — just reply to this message. Your travel expert {{agent_name}} is on standby. - Adventourist',
   false, 'customer', NULL, NULL, NULL),

  ('Pre-trip reminder — 3 days before',
   'Heads-up 3 days before travel, sent at 9 AM IST.',
   'travel_date_approaching', 3, 0, '09:00', '10:00',
   true, 'customer', 'pre_trip_3days',
   'Hi {{name}}! Your {{destination}} adventure is just 3 days away! Your travel expert {{agent_name}} will share final documents and emergency contacts today. Safe travels! - Team Adventourist',
   false, 'customer', NULL, NULL, NULL),

  ('Safe journey — day of travel',
   'Bon-voyage message on the morning of departure.',
   'travel_date_approaching', 0, 0, '07:00', '08:00',
   true, 'customer', 'safe_journey',
   'Have a wonderful journey to {{destination}}, {{name}}! Our team is available 24/7 at +91 99304 00694. Create memories that last a lifetime. - Team Adventourist',
   false, 'customer', NULL, NULL, NULL),

  ('Review request — day after return',
   'Ask for a Google review the day after the trip ends.',
   'travel_date_passed', 1, 0, '10:00', '11:00',
   true, 'customer', 'review_request',
   'Hi {{name}}! Welcome back from {{destination}}! We hope it was everything you dreamed of. Please take 1 minute to share your experience — it helps us serve travellers like you better: https://g.page/r/CfMqwu-plVJfEAE/review',
   false, 'customer', NULL, NULL, NULL);

-- Update automations_log to reference the new rules table (drop old FK column dependencies)
-- (template_id no longer used; left in place for legacy history)
