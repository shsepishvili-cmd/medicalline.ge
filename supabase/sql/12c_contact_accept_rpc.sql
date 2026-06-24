CREATE OR REPLACE FUNCTION public.accept_public_contract(
  p_public_token UUID,
  p_otp_code TEXT,
  p_accept_terms BOOLEAN,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_identity_suffix TEXT DEFAULT NULL,
  p_acceptor_name TEXT DEFAULT NULL
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
AS $ml$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_expected_suffix TEXT;
  v_supplied_suffix TEXT;
  v_acceptor_name TEXT;
BEGIN
  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE public.contracts.public_token = p_public_token
     OR public.contracts.id = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Contract not found.', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF NOT p_accept_terms THEN
    RETURN QUERY SELECT FALSE, 'Terms were not accepted.', v_contract.id, v_contract.status;
    RETURN;
  END IF;

  v_expected_suffix := right(regexp_replace(COALESCE(v_contract.customer_id_number, ''), '\D', '', 'g'), 4);
  v_supplied_suffix := right(regexp_replace(COALESCE(p_identity_suffix, ''), '\D', '', 'g'), 4);
  v_acceptor_name := NULLIF(trim(COALESCE(p_acceptor_name, '')), '');

  IF length(v_expected_suffix) = 4 AND v_supplied_suffix <> v_expected_suffix THEN
    RETURN QUERY SELECT FALSE, 'Identification code suffix is incorrect.', v_contract.id, v_contract.status;
    RETURN;
  END IF;

  IF v_acceptor_name IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Acceptor name is required.', v_contract.id, v_contract.status;
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
      accepted_at = COALESCE(public.contracts.accepted_at, now()),
      signed_at = COALESCE(public.contracts.signed_at, now()),
      otp_verified_at = now(),
      otp_code = NULL,
      otp_expires_at = NULL,
      accepted_phone = COALESCE(NULLIF(trim(COALESCE(p_phone, '')), ''), accepted_phone, phone),
      accepted_email = COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), accepted_email, email),
      acceptance_note = concat(
        'Confirmed electronically by SMS/OTP at ',
        now()::TEXT,
        '; document_version=',
        COALESCE(v_contract.document_version, 1)::TEXT,
        '; public_token=',
        COALESCE(v_contract.public_token::TEXT, v_contract.id::TEXT)
        ,
        '; acceptor=',
        v_acceptor_name,
        '; identity_suffix_matched=',
        CASE WHEN length(v_expected_suffix) = 4 THEN 'true' ELSE 'not_required' END
      ),
      status = 'signed'
  WHERE public.contracts.id = v_contract.id;

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
    jsonb_build_object(
      'accepted_terms', TRUE,
      'confirmation_method', 'sms_otp',
      'public_token', COALESCE(v_contract.public_token::TEXT, v_contract.id::TEXT),
      'contract_number', v_contract.contract_number,
      'document_version', v_contract.document_version,
      'acceptor_name', v_acceptor_name,
      'identity_suffix_matched', length(v_expected_suffix) = 4
    )
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
    jsonb_build_object(
      'otp_verified', TRUE,
      'confirmation_method', 'sms_otp',
      'public_token', COALESCE(v_contract.public_token::TEXT, v_contract.id::TEXT),
      'contract_number', v_contract.contract_number,
      'document_version', v_contract.document_version,
      'acceptor_name', v_acceptor_name,
      'identity_suffix_matched', length(v_expected_suffix) = 4
    )
  );

  RETURN QUERY SELECT TRUE, 'Contract accepted and signed.', v_contract.id, 'signed';
END;
$ml$;

GRANT EXECUTE ON FUNCTION public.accept_public_contract(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
