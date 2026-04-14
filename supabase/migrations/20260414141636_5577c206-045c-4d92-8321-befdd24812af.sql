
-- Table 1: role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage role_permissions"
  ON public.role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Table 2: automation_rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  trigger_condition jsonb DEFAULT '{}'::jsonb,
  channel text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'customer',
  template_name text,
  email_subject text,
  email_body text,
  sms_body text,
  delay_hours int DEFAULT 0,
  delay_days int DEFAULT 0,
  scheduled_time text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation_rules"
  ON public.automation_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage automation_rules"
  ON public.automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
