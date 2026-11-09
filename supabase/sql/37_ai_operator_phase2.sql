-- Medical Line AI Operator: Phase 2 calls and AI orders.

CREATE TABLE IF NOT EXISTS public.ai_call_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  customer_name TEXT,
  purpose TEXT NOT NULL DEFAULT 'notification',
  mode TEXT NOT NULL DEFAULT 'exact_message',
  script_text TEXT NOT NULL,
  caller_id TEXT NOT NULL DEFAULT '+995322453821',
  max_seconds INTEGER NOT NULL DEFAULT 180,
  sms_after BOOLEAN NOT NULL DEFAULT FALSE,
  sms_text TEXT,
  debt_details JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  outcome TEXT,
  transcript JSONB,
  summary TEXT,
  follow_up_date DATE,
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  connected_seconds INTEGER,
  customer_talk_seconds INTEGER,
  ai_talk_seconds INTEGER,
  silence_seconds INTEGER,
  worker_id TEXT,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'notification';
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'exact_message';
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS script_text TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS caller_id TEXT NOT NULL DEFAULT '+995322453821';
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS max_seconds INTEGER NOT NULL DEFAULT 180;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS sms_after BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS sms_text TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS debt_details JSONB;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued';
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS transcript JSONB;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS connected_seconds INTEGER;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS customer_talk_seconds INTEGER;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS ai_talk_seconds INTEGER;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS silence_seconds INTEGER;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS worker_id TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ai_agent_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'ai_voice_agent',
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  customer_name TEXT,
  phone TEXT,
  clinic TEXT,
  city TEXT,
  product TEXT,
  quantity INTEGER,
  delivery_details TEXT,
  confirmation_text TEXT,
  confirmed_at TIMESTAMPTZ,
  source_call UUID REFERENCES public.ai_call_jobs(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_call_jobs_queue_idx ON public.ai_call_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS ai_call_jobs_history_idx ON public.ai_call_jobs (created_at DESC);

ALTER TABLE public.ai_call_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_call_jobs_admin_all ON public.ai_call_jobs;
CREATE POLICY ai_call_jobs_admin_all ON public.ai_call_jobs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'ai_agent_orders' AND c.relkind IN ('r', 'p')
  ) THEN
    CREATE INDEX IF NOT EXISTS ai_agent_orders_source_idx ON public.ai_agent_orders (source, created_at DESC);
    ALTER TABLE public.ai_agent_orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS ai_agent_orders_admin_all ON public.ai_agent_orders;
    CREATE POLICY ai_agent_orders_admin_all ON public.ai_agent_orders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;