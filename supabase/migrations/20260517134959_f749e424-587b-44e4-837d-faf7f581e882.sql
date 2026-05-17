ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS done_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_reminders_lead ON public.reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_pending ON public.reminders(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders(created_by);