-- Medical Line AI Operator: Phase 1 knowledge, training, and corrections.

CREATE TABLE IF NOT EXISTS public.ai_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general', content TEXT NOT NULL,
  product_slug TEXT, priority INTEGER NOT NULL DEFAULT 0, strict_answer BOOLEAN NOT NULL DEFAULT FALSE,
  source_type TEXT NOT NULL DEFAULT 'admin', source_ref TEXT, valid_from TIMESTAMPTZ, valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'OUTDATED', 'ARCHIVED')),
  active BOOLEAN NOT NULL DEFAULT TRUE, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS source_ref TEXT;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS strict_answer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS product_slug TEXT;

CREATE TABLE IF NOT EXISTS public.ai_knowledge_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), knowledge_item_id UUID NOT NULL REFERENCES public.ai_knowledge_items(id) ON DELETE CASCADE,
  alias TEXT NOT NULL, keyword TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_message TEXT NOT NULL, ideal_answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'COMPANY INFO', product_slug TEXT, allowed_topics TEXT[] NOT NULL DEFAULT '{}', forbidden_topics TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT, priority INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE, created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ai_agent_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), question TEXT NOT NULL, wrong_answer TEXT NOT NULL, correct_answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'rejected')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_agent_corrections DROP CONSTRAINT IF EXISTS ai_agent_corrections_status_check;
UPDATE public.ai_agent_corrections SET status = 'approved' WHERE status = 'reviewed';
ALTER TABLE public.ai_agent_corrections ADD CONSTRAINT ai_agent_corrections_status_check CHECK (status IN ('pending', 'approved', 'applied', 'rejected'));

CREATE INDEX IF NOT EXISTS ai_knowledge_items_active_priority_idx ON public.ai_knowledge_items (active, status, priority DESC);
CREATE INDEX IF NOT EXISTS ai_training_examples_active_idx ON public.ai_training_examples (active, category, priority DESC);
CREATE INDEX IF NOT EXISTS ai_agent_corrections_status_idx ON public.ai_agent_corrections (status, created_at DESC);

ALTER TABLE public.ai_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_knowledge_admin_all ON public.ai_knowledge_items;
CREATE POLICY ai_knowledge_admin_all ON public.ai_knowledge_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS ai_aliases_admin_all ON public.ai_knowledge_aliases;
CREATE POLICY ai_aliases_admin_all ON public.ai_knowledge_aliases FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS ai_training_admin_all ON public.ai_training_examples;
CREATE POLICY ai_training_admin_all ON public.ai_training_examples FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS ai_corrections_admin_all ON public.ai_agent_corrections;
CREATE POLICY ai_corrections_admin_all ON public.ai_agent_corrections FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));