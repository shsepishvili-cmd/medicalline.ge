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
AS $ml$
DECLARE
  v_contract public.contracts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE public.contracts.public_token = p_public_token
     OR public.contracts.id = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_contract.status IN ('draft', 'sent') THEN
    UPDATE public.contracts
    SET status = 'viewed',
        viewed_at = COALESCE(public.contracts.viewed_at, now())
    WHERE public.contracts.id = v_contract.id;

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
$ml$;

GRANT EXECUTE ON FUNCTION public.get_public_contract_summary(UUID, TEXT, TEXT) TO anon, authenticated;
