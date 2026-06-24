-- =============================================================================
-- 11_contact_contract_workflow.sql
-- Extends contracts into a lightweight contact / acceptance workflow.
-- Run in Supabase Dashboard -> SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Contract workflow fields
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Public workflow helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_contract_summary(
  p_public_token UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contract_number TEXT,
  contract_date DATE,
  clinic_name TEXT,
  customer_name TEXT,
  customer_id_number TEXT,
  customer_address TEXT,
  phone TEXT,
  email TEXT,
  product_name TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  currency TEXT,
  vat_rate NUMERIC,
  vat_included BOOLEAN,
  total_amount NUMERIC,
  payment_terms TEXT,
  delivery_date DATE,
  delivery_address TEXT,
  installation_included BOOLEAN,
  warranty_months INTEGER,
  special_terms TEXT,
  status TEXT,
  pdf_path TEXT,
  document_version INTEGER,
  public_token UUID,
  agreed_to_terms BOOLEAN,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE public_token = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_contract.status IN ('draft', 'sent') THEN
    UPDATE public.contracts
    SET status = 'viewed',
        viewed_at = COALESCE(viewed_at, now())
    WHERE id = v_contract.id;

    v_contract.status := 'viewed';
    v_contract.viewed_at := COALESCE(v_contract.viewed_at, now());
  END IF;

  INSERT INTO public.contract_audit_logs (
    contract_id,
    event_type,
    event_status,
    ip_address,
    user_agent,
    phone,
    email,
    document_version,
    metadata
  ) VALUES (
    v_contract.id,
    'viewed',
    v_contract.status,
    p_ip_address,
    p_user_agent,
    v_contract.phone,
    v_contract.email,
    v_contract.document_version,
    jsonb_build_object('public_token', p_public_token)
  );

  RETURN QUERY
  SELECT
    v_contract.id,
    v_contract.contract_number,
    v_contract.contract_date,
    v_contract.clinic_name,
    v_contract.customer_name,
    v_contract.customer_id_number,
    v_contract.customer_address,
    v_contract.phone,
    v_contract.email,
    v_contract.product_name,
    v_contract.brand,
    v_contract.model,
    v_contract.serial_number,
    v_contract.quantity,
    v_contract.unit_price,
    v_contract.currency,
    v_contract.vat_rate,
    v_contract.vat_included,
    v_contract.total_amount,
    v_contract.payment_terms,
    v_contract.delivery_date,
    v_contract.delivery_address,
    v_contract.installation_included,
    v_contract.warranty_months,
    v_contract.special_terms,
    v_contract.status,
    v_contract.pdf_path,
    v_contract.document_version,
    v_contract.public_token,
    v_contract.agreed_to_terms,
    v_contract.sent_at,
    v_contract.viewed_at,
    v_contract.accepted_at,
    v_contract.signed_at,
    v_contract.paid_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_public_contract(
  p_public_token UUID,
  p_otp_code TEXT,
  p_accept_terms BOOLEAN,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  ok BOOLEAN,
  message TEXT,
  contract_id UUID,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE public_token = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Contract not found.', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF NOT p_accept_terms THEN
    RETURN QUERY SELECT FALSE, 'Terms were not accepted.', v_contract.id, v_contract.status;
    RETURN;
  END IF;

  IF v_contract.otp_code IS NULL OR v_contract.otp_expires_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'OTP has not been issued.', v_contract.id, v_contract.status;
    RETURN;
  END IF;

  IF now() > v_contract.otp_expires_at THEN
    RETURN QUERY SELECT FALSE, 'OTP has expired.', v_contract.id, v_contract.status;
    RETURN;
  END IF;

  IF v_contract.otp_code <> trim(COALESCE(p_otp_code, '')) THEN
    RETURN QUERY SELECT FALSE, 'OTP is incorrect.', v_contract.id, v_contract.status;
    RETURN;
  END IF;

  UPDATE public.contracts
  SET agreed_to_terms = TRUE,
      accepted_at = COALESCE(accepted_at, now()),
      signed_at = COALESCE(signed_at, now()),
      otp_verified_at = now(),
      otp_code = NULL,
      otp_expires_at = NULL,
      accepted_phone = COALESCE(NULLIF(trim(COALESCE(p_phone, '')), ''), accepted_phone, phone),
      accepted_email = COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), accepted_email, email),
      status = 'signed'
  WHERE id = v_contract.id;

  INSERT INTO public.contract_audit_logs (
    contract_id,
    event_type,
    event_status,
    ip_address,
    user_agent,
    phone,
    email,
    document_version,
    metadata
  ) VALUES
  (
    v_contract.id,
    'accepted',
    'accepted',
    p_ip_address,
    p_user_agent,
    COALESCE(NULLIF(trim(COALESCE(p_phone, '')), ''), v_contract.phone),
    COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), v_contract.email),
    v_contract.document_version,
    jsonb_build_object('accepted_terms', TRUE)
  ),
  (
    v_contract.id,
    'signed',
    'signed',
    p_ip_address,
    p_user_agent,
    COALESCE(NULLIF(trim(COALESCE(p_phone, '')), ''), v_contract.phone),
    COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), v_contract.email),
    v_contract.document_version,
    jsonb_build_object('otp_verified', TRUE)
  );

  RETURN QUERY SELECT TRUE, 'Contract accepted and signed.', v_contract.id, 'signed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_contract_summary(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_public_contract(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
