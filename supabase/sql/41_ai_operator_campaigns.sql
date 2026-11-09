-- Medical Line AI Operator: dialog campaign configuration.

CREATE TABLE IF NOT EXISTS public.ai_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, purpose TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'dialog', objective TEXT NOT NULL, allowed_topics TEXT[] NOT NULL DEFAULT '{}',
  forbidden_topics TEXT[] NOT NULL DEFAULT '{}', knowledge_scope TEXT[] NOT NULL DEFAULT '{}',
  opening_message TEXT NOT NULL, max_seconds INTEGER NOT NULL DEFAULT 180, active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_campaigns_active_idx ON public.ai_campaigns (active, created_at DESC);
ALTER TABLE public.ai_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_campaigns_admin_all ON public.ai_campaigns;
CREATE POLICY ai_campaigns_admin_all ON public.ai_campaigns FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));