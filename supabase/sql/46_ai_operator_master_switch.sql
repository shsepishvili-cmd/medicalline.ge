-- Medical Line AI Operator: master switch for outbound voice calls.

CREATE TABLE IF NOT EXISTS public.ai_operator_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  calls_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  disabled_reason TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_operator_settings_singleton CHECK (id = TRUE)
);

INSERT INTO public.ai_operator_settings (id, calls_enabled, disabled_reason)
VALUES (TRUE, FALSE, 'AI calling is disabled by default until an admin enables it.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_operator_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_operator_settings_admin_select ON public.ai_operator_settings;
CREATE POLICY ai_operator_settings_admin_select
ON public.ai_operator_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  )
);

DROP POLICY IF EXISTS ai_operator_settings_admin_update ON public.ai_operator_settings;
CREATE POLICY ai_operator_settings_admin_update
ON public.ai_operator_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.get_ai_operator_status()
RETURNS TABLE (
  calls_enabled BOOLEAN,
  disabled_reason TEXT,
  updated_at TIMESTAMPTZ,
  updated_by UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT settings.calls_enabled, settings.disabled_reason, settings.updated_at, settings.updated_by
  FROM public.ai_operator_settings AS settings
  WHERE settings.id = TRUE;
$$;

REVOKE ALL ON FUNCTION public.get_ai_operator_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_operator_status() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_ai_operator_enabled(enabled BOOLEAN, reason TEXT DEFAULT NULL)
RETURNS TABLE (
  calls_enabled BOOLEAN,
  disabled_reason TEXT,
  updated_at TIMESTAMPTZ,
  updated_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := (SELECT auth.uid());
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = actor
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update AI operator settings' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ai_operator_settings
  SET
    calls_enabled = enabled,
    disabled_reason = CASE WHEN enabled THEN NULL ELSE NULLIF(BTRIM(reason), '') END,
    updated_by = actor,
    updated_at = NOW()
  WHERE id = TRUE;

  RETURN QUERY
  SELECT settings.calls_enabled, settings.disabled_reason, settings.updated_at, settings.updated_by
  FROM public.ai_operator_settings AS settings
  WHERE settings.id = TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_operator_enabled(BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_ai_operator_enabled(BOOLEAN, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_call_job(worker_name TEXT)
RETURNS SETOF public.ai_call_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT calls_enabled FROM public.ai_operator_settings WHERE id = TRUE), FALSE) THEN
    RETURN;
  END IF;

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
