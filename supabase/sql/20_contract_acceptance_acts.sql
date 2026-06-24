-- Acceptance-delivery acts linked to contracts, with public SMS/OTP confirmation.

CREATE TABLE IF NOT EXISTS public.contract_acceptance_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  act_number TEXT NOT NULL UNIQUE,
  act_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'cancelled')),
  public_token UUID UNIQUE DEFAULT gen_random_uuid(),
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_phone TEXT,
  accepted_email TEXT,
  accepted_by TEXT,
  accepted_identity_suffix TEXT,
  acceptance_note TEXT,
  last_sent_channel TEXT,
  delivery_address TEXT,
  equipment_condition TEXT DEFAULT 'აპარატი მიღებულია ვიზუალურად გამართული მდგომარეობით',
  installation_completed BOOLEAN NOT NULL DEFAULT TRUE,
  training_completed BOOLEAN NOT NULL DEFAULT TRUE,
  missing_items TEXT,
  remarks TEXT,
  act_body TEXT,
  document_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS contract_acceptance_acts_contract_id_idx
  ON public.contract_acceptance_acts(contract_id);

CREATE INDEX IF NOT EXISTS contract_acceptance_acts_public_token_idx
  ON public.contract_acceptance_acts(public_token);

ALTER TABLE public.contract_acceptance_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read acceptance acts" ON public.contract_acceptance_acts;
CREATE POLICY "Staff can read acceptance acts"
  ON public.contract_acceptance_acts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'manager', 'technician')
    )
  );

DROP POLICY IF EXISTS "Staff can insert acceptance acts" ON public.contract_acceptance_acts;
CREATE POLICY "Staff can insert acceptance acts"
  ON public.contract_acceptance_acts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'manager', 'technician')
    )
  );

DROP POLICY IF EXISTS "Staff can update acceptance acts" ON public.contract_acceptance_acts;
CREATE POLICY "Staff can update acceptance acts"
  ON public.contract_acceptance_acts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'manager', 'technician')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'manager', 'technician')
    )
  );

CREATE OR REPLACE FUNCTION public.set_contract_acceptance_act_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_contract_acceptance_act_updated_at ON public.contract_acceptance_acts;
CREATE TRIGGER set_contract_acceptance_act_updated_at
BEFORE UPDATE ON public.contract_acceptance_acts
FOR EACH ROW
EXECUTE FUNCTION public.set_contract_acceptance_act_updated_at();

CREATE OR REPLACE FUNCTION public.get_public_acceptance_act_summary(
  p_public_token UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contract_id UUID,
  act_number TEXT,
  act_date DATE,
  status TEXT,
  public_token UUID,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by TEXT,
  accepted_identity_suffix TEXT,
  delivery_address TEXT,
  equipment_condition TEXT,
  installation_completed BOOLEAN,
  training_completed BOOLEAN,
  missing_items TEXT,
  remarks TEXT,
  act_body TEXT,
  document_version INTEGER,
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
  delivery_date DATE,
  warranty_months INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_act public.contract_acceptance_acts%ROWTYPE;
BEGIN
  SELECT *
  INTO v_act
  FROM public.contract_acceptance_acts caa
  WHERE caa.public_token = p_public_token
    AND caa.status <> 'cancelled'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_act.viewed_at IS NULL THEN
    UPDATE public.contract_acceptance_acts caa
    SET viewed_at = now(),
        status = CASE WHEN caa.status = 'sent' THEN 'viewed' ELSE caa.status END
    WHERE caa.id = v_act.id
    RETURNING * INTO v_act;

    INSERT INTO public.contract_audit_logs (
      contract_id, event_type, event_status, channel, ip_address, user_agent,
      phone, email, document_version, metadata
    )
    SELECT
      c.id, 'acceptance_act_viewed', v_act.status, 'public_link', p_ip_address, p_user_agent,
      c.phone, c.email, v_act.document_version,
      jsonb_build_object('acceptance_act_id', v_act.id, 'act_number', v_act.act_number)
    FROM public.contracts c
    WHERE c.id = v_act.contract_id;
  END IF;

  RETURN QUERY
  SELECT
    v_act.id,
    v_act.contract_id,
    v_act.act_number,
    v_act.act_date,
    v_act.status,
    v_act.public_token,
    v_act.sent_at,
    v_act.viewed_at,
    v_act.accepted_at,
    v_act.accepted_by,
    v_act.accepted_identity_suffix,
    v_act.delivery_address,
    v_act.equipment_condition,
    v_act.installation_completed,
    v_act.training_completed,
    v_act.missing_items,
    v_act.remarks,
    v_act.act_body,
    v_act.document_version,
    c.contract_number,
    c.contract_date,
    c.clinic_name,
    c.customer_name,
    c.customer_id_number,
    c.customer_address,
    c.phone,
    c.email,
    c.product_name,
    c.brand,
    c.model,
    c.serial_number,
    c.quantity,
    c.delivery_date,
    c.warranty_months
  FROM public.contracts c
  WHERE c.id = v_act.contract_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_public_acceptance_act(
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
RETURNS TABLE (ok BOOLEAN, status TEXT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_act public.contract_acceptance_acts%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_expected_suffix TEXT;
BEGIN
  IF COALESCE(p_accept_terms, false) IS NOT TRUE THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'აქტის დასადასტურებლად მონიშნეთ თანხმობა.';
    RETURN;
  END IF;

  IF length(trim(COALESCE(p_acceptor_name, ''))) < 2 THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'მიუთითეთ დამადასტურებელი პირის სახელი და გვარი.';
    RETURN;
  END IF;

  SELECT *
  INTO v_act
  FROM public.contract_acceptance_acts caa
  WHERE caa.public_token = p_public_token
    AND caa.status <> 'cancelled'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'მიღება-ჩაბარების აქტი ვერ მოიძებნა.';
    RETURN;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts c
  WHERE c.id = v_act.contract_id
  LIMIT 1;

  IF v_act.status = 'accepted' THEN
    RETURN QUERY SELECT true, v_act.status, 'აქტი უკვე დადასტურებულია.';
    RETURN;
  END IF;

  IF v_act.otp_code IS NULL OR trim(v_act.otp_code) <> trim(COALESCE(p_otp_code, '')) THEN
    RETURN QUERY SELECT false, v_act.status, 'SMS კოდი არასწორია.';
    RETURN;
  END IF;

  IF v_act.otp_expires_at IS NOT NULL AND v_act.otp_expires_at < now() THEN
    RETURN QUERY SELECT false, v_act.status, 'SMS კოდის მოქმედების ვადა ამოიწურა.';
    RETURN;
  END IF;

  v_expected_suffix := right(regexp_replace(COALESCE(v_contract.customer_id_number, ''), '\D', '', 'g'), 4);
  IF length(v_expected_suffix) = 4 AND v_expected_suffix <> regexp_replace(COALESCE(p_identity_suffix, ''), '\D', '', 'g') THEN
    RETURN QUERY SELECT false, v_act.status, 'საიდენტიფიკაციო კოდის ბოლო 4 ციფრი არ ემთხვევა.';
    RETURN;
  END IF;

  UPDATE public.contract_acceptance_acts caa
  SET status = 'accepted',
      accepted_at = now(),
      otp_verified_at = now(),
      accepted_phone = COALESCE(p_phone, v_contract.phone),
      accepted_email = COALESCE(p_email, v_contract.email),
      accepted_by = trim(p_acceptor_name),
      accepted_identity_suffix = NULLIF(regexp_replace(COALESCE(p_identity_suffix, ''), '\D', '', 'g'), ''),
      acceptance_note = concat(
        'Accepted by ', trim(p_acceptor_name),
        ' via SMS/OTP on ', to_char(now(), 'YYYY-MM-DD HH24:MI:SS TZ')
      )
  WHERE caa.id = v_act.id
  RETURNING * INTO v_act;

  INSERT INTO public.contract_audit_logs (
    contract_id, event_type, event_status, channel, ip_address, user_agent,
    phone, email, document_version, metadata
  )
  VALUES (
    v_contract.id, 'acceptance_act_accepted', 'accepted', 'sms_otp', p_ip_address, p_user_agent,
    COALESCE(p_phone, v_contract.phone), COALESCE(p_email, v_contract.email), v_act.document_version,
    jsonb_build_object(
      'acceptance_act_id', v_act.id,
      'act_number', v_act.act_number,
      'accepted_by', v_act.accepted_by,
      'accepted_identity_suffix', v_act.accepted_identity_suffix
    )
  );

  RETURN QUERY SELECT true, v_act.status, 'მიღება-ჩაბარების აქტი დადასტურდა.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_acceptance_act_summary(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_public_acceptance_act(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
