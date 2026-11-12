-- Medical Line AI Operator: Phase 4 VPS worker claim contract.

CREATE OR REPLACE FUNCTION public.claim_ai_call_job(worker_name TEXT)
RETURNS SETOF public.ai_call_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH next_job AS (
    SELECT id
    FROM public.ai_call_jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.ai_call_jobs AS job
  SET status = 'dialing', worker_id = worker_name, started_at = NOW(), updated_at = NOW()
  FROM next_job
  WHERE job.id = next_job.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_call_job(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ai_call_job(TEXT) TO service_role;