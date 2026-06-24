CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'signed', 'paid', 'cancelled'));

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS public_token UUID,
  ADD COLUMN IF NOT EXISTS document_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_code TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_phone TEXT,
  ADD COLUMN IF NOT EXISTS accepted_email TEXT,
  ADD COLUMN IF NOT EXISTS last_sent_channel TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_note TEXT;

UPDATE public.contracts
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_public_token_idx
  ON public.contracts (public_token);

CREATE TABLE IF NOT EXISTS public.contract_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_status TEXT,
  channel TEXT,
  ip_address TEXT,
  user_agent TEXT,
  phone TEXT,
  email TEXT,
  document_version INTEGER,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS contract_audit_logs_contract_idx
  ON public.contract_audit_logs (contract_id, created_at DESC);

ALTER TABLE public.contract_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_contract_audit_logs" ON public.contract_audit_logs;
CREATE POLICY "staff_all_contract_audit_logs" ON public.contract_audit_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'engineer', 'dealer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'engineer', 'dealer')
    )
  );

