-- Bugfix: lead_created automations never fired.
-- Also seeds the "Mid-Trip Check-in" rule the user asked for.
--
-- Root cause of the lead_created miss:
--   evaluateRulesForLead(id, 'lead_created') is never called.
--   * The admin app only calls it on disposition_changed + status_changed.
--   * The /submit-lead edge function (public enquiry form) inserts the
--     lead row directly and never calls the engine.
--   Result: 78 new leads in last 30 days, 0 Welcome emails fired.
--
-- Fix:
--   An AFTER-INSERT trigger on public.leads enqueues matching
--   lead_created rules server-side. Catches every lead regardless of
--   source — public enquiry, admin UI, bulk import, API — so this
--   can't be forgotten by a new call site.
--
-- Side-effect note:
--   The admin app's LeadDetail.handleStatusChange still handles
--   status_changed + disposition_changed. Those are unchanged.
--   We do NOT also fire lead_created from the client; the DB trigger
--   is authoritative — no double-queue risk.

-- ─────────────── Trigger function ───────────────

CREATE OR REPLACE FUNCTION public.on_lead_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule       RECORD;
  recipient  text;
  contact    text;
  scheduled  timestamptz;
BEGIN
  FOR rule IN
    SELECT *
      FROM public.automation_rules
     WHERE is_active = true
       AND trigger_event = 'lead_created'
  LOOP
    -- Condition filters mirror automationEngine.ts matchConditions().
    IF rule.condition_status      IS NOT NULL AND rule.condition_status      <> COALESCE(NEW.sales_status, '')  THEN CONTINUE; END IF;
    IF rule.condition_disposition IS NOT NULL AND rule.condition_disposition <> COALESCE(NEW.disposition, '')   THEN CONTINUE; END IF;
    IF rule.condition_platform    IS NOT NULL AND rule.condition_platform    <> COALESCE(NEW.platform, '')      THEN CONTINUE; END IF;
    IF rule.condition_channel     IS NOT NULL AND rule.condition_channel     <> COALESCE(NEW.channel, '')       THEN CONTINUE; END IF;

    IF rule.email_enabled THEN
      scheduled := NOW() + (COALESCE(rule.delay_hours, 0) || ' hours')::interval;

      -- recipient_type matches the client engine's shape so the shared
      -- dispatcher (process-automations) can route either way.
      IF rule.email_recipient = 'agent' THEN
        recipient := 'agent';
        contact   := NULL;  -- dispatcher resolves assigned_to -> user email
      ELSE
        recipient := 'customer';
        contact   := NEW.email;
      END IF;

      INSERT INTO public.automation_executions (
        rule_id, lead_id, trigger_event, channel,
        recipient_type, recipient_contact,
        status, scheduled_for
      ) VALUES (
        rule.id, NEW.id, 'lead_created', 'email',
        recipient, contact,
        'pending', scheduled
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_lead_created() IS
  'Server-side lead_created automation enqueue. Fires on every insert into public.leads, regardless of source. Replaces the never-called client-side evaluateRulesForLead(..., ''lead_created'').';

DROP TRIGGER IF EXISTS leads_automation_on_insert ON public.leads;
CREATE TRIGGER leads_automation_on_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.on_lead_created();

-- ─────────────── New rule: Mid-Trip Check-in ───────────────
--
-- Uses the existing travel_date_approaching sweep with a negative
-- trigger_days_before so the sweep targets `travel_start_date =
-- CURRENT_DATE - 2` → 2 days after departure. The travel-expert
-- phone number is a placeholder; edit the rule in Settings →
-- Automations to use your real number.

INSERT INTO public.automation_rules (
  name, trigger_event, trigger_days_before, is_active,
  email_enabled, email_recipient,
  email_subject, email_hero_title, email_hero_subtitle,
  email_body, email_cta_url, email_cta_label,
  email_format
)
SELECT
  'Mid-Trip Check-in',
  'travel_date_approaching', -2, true,
  true, 'customer',
  'Everything okay on your trip, {{name}}?',
  'We''re here if you need us',
  'A quick hello from the Adventourist team',
  'Hi {{name}},

Just a quick check-in — day 2 of your {{destination}} trip and we hope you''re having a brilliant time.

If anything comes up — a hotel issue, a transport hiccup, a last-minute change of plan — your travel expert is one tap away:

**Travel Expert:** +91 00000 00000
**Email:** support@adventourist.in

Safe travels,
Team Adventourist',
  'tel:+910000000000',
  'Call travel expert',
  'markdown'
WHERE NOT EXISTS (
  SELECT 1 FROM public.automation_rules WHERE name = 'Mid-Trip Check-in'
);

COMMENT ON TABLE public.automation_rules IS
  'Automation rule definitions. See src/services/automationEngine.ts for client-side evaluation + supabase/functions/process-automations for the server-side sweep. Phase M-A-E-D-MENU shipped prior.';
