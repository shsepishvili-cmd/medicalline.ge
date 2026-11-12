-- Medical Line AI Operator: Phase 5 evaluation cases and auditable runs.

CREATE TABLE IF NOT EXISTS public.ai_evaluation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, customer_message TEXT NOT NULL,
  expected_behavior TEXT NOT NULL, forbidden_behavior TEXT, required_knowledge_source TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ai_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), case_id UUID NOT NULL REFERENCES public.ai_evaluation_cases(id) ON DELETE CASCADE,
  result TEXT NOT NULL DEFAULT 'NEEDS REVIEW', response_text TEXT, notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_evaluation_cases_active_idx ON public.ai_evaluation_cases (active, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_evaluation_runs_case_idx ON public.ai_evaluation_runs (case_id, created_at DESC);
ALTER TABLE public.ai_evaluation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_evaluation_cases_admin_all ON public.ai_evaluation_cases;
CREATE POLICY ai_evaluation_cases_admin_all ON public.ai_evaluation_cases FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS ai_evaluation_runs_admin_all ON public.ai_evaluation_runs;
CREATE POLICY ai_evaluation_runs_admin_all ON public.ai_evaluation_runs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));