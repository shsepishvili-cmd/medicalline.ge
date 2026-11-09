-- Link call jobs to the campaign that controls their dialog scope.

ALTER TABLE public.ai_call_jobs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.ai_campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ai_call_jobs_campaign_idx ON public.ai_call_jobs (campaign_id, created_at DESC);