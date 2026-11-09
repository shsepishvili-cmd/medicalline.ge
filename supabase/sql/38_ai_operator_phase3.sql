-- Medical Line AI Operator: Phase 3 follow-ups and debt reminders.

CREATE TABLE IF NOT EXISTS public.ai_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer TEXT, phone TEXT NOT NULL,
  source_call UUID REFERENCES public.ai_call_jobs(id) ON DELETE SET NULL, reason TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL, priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ai_debt_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer TEXT, phone TEXT NOT NULL, amount NUMERIC,
  document_number TEXT, due_date DATE, note TEXT, source_call UUID REFERENCES public.ai_call_jobs(id) ON DELETE SET NULL,
  outcome TEXT, follow_up_date DATE, status TEXT NOT NULL DEFAULT 'pending', created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_followups_due_idx ON public.ai_followups (status, due_at);
CREATE INDEX IF NOT EXISTS ai_debt_reminders_status_idx ON public.ai_debt_reminders (status, due_date);

ALTER TABLE public.ai_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_debt_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_followups_admin_all ON public.ai_followups;
CREATE POLICY ai_followups_admin_all ON public.ai_followups FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS ai_debt_reminders_admin_all ON public.ai_debt_reminders;
CREATE POLICY ai_debt_reminders_admin_all ON public.ai_debt_reminders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));