-- Prepared only. Do not apply until production schema comparison is complete.

CREATE TABLE IF NOT EXISTS public.ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category TEXT NOT NULL DEFAULT 'COMPANY INFO',
  customer_message TEXT NOT NULL, ideal_answer TEXT NOT NULL, product_slug TEXT,
  allowed_topics TEXT[] NOT NULL DEFAULT '{}', forbidden_topics TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT, priority INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_training_examples ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.ai_training_examples ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE public.ai_training_examples ADD COLUMN IF NOT EXISTS notes TEXT;
UPDATE public.ai_training_examples SET is_active = COALESCE(active, is_active) WHERE active IS NOT NULL;
ALTER TABLE public.ai_agent_corrections ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.ai_agent_corrections ADD COLUMN IF NOT EXISTS call_job_id UUID REFERENCES public.ai_call_jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ai_training_examples_active_priority_idx ON public.ai_training_examples (is_active, priority DESC);
CREATE INDEX IF NOT EXISTS ai_agent_corrections_call_job_idx ON public.ai_agent_corrections (call_job_id, created_at DESC);
ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_training_examples_admin_all ON public.ai_training_examples;
CREATE POLICY ai_training_examples_admin_all ON public.ai_training_examples FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));