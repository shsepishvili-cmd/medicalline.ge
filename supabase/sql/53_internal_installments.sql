-- =============================================================================
-- 53_internal_installments.sql
-- Internal (company-financed) installment contracts: payment schedule, payments
-- and SMS reminder log. Admin-only; all money changes go through the functions
-- below, so a schedule can never disagree with the recorded payments.
-- Safe to run more than once. Run in Supabase Dashboard -> SQL Editor.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS public.installment_contract_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.installment_contracts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  contract_number   text NOT NULL UNIQUE,
  customer_name     text NOT NULL,
  customer_tax_id   text,
  phone             text NOT NULL CHECK (phone ~ '^995[0-9]{9}$'),
  product_name      text NOT NULL,
  serial_number     text,
  currency          text NOT NULL DEFAULT 'GEL',
  total_price       numeric(14,2) NOT NULL CHECK (total_price > 0),
  down_payment      numeric(14,2) NOT NULL DEFAULT 0 CHECK (down_payment >= 0),
  months            integer NOT NULL CHECK (months BETWEEN 1 AND 60),
  first_due_date    date NOT NULL,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  cancel_reason     text,
  reminders_enabled boolean NOT NULL DEFAULT true,
  public_token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  notes             text,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT installment_down_below_total CHECK (down_payment < total_price)
);

CREATE TABLE IF NOT EXISTS public.installment_schedule (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id        uuid NOT NULL REFERENCES public.installment_contracts(id) ON DELETE RESTRICT,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  due_date           date NOT NULL,
  amount             numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_amount        numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at            timestamptz,
  UNIQUE (contract_id, installment_number)
);

CREATE TABLE IF NOT EXISTS public.installment_payments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  contract_id             uuid NOT NULL REFERENCES public.installment_contracts(id) ON DELETE RESTRICT,
  schedule_id             uuid NOT NULL REFERENCES public.installment_schedule(id) ON DELETE RESTRICT,
  amount                  numeric(14,2) NOT NULL CHECK (amount > 0),
  method                  text NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'card_terminal', 'other', 'bog_online')),
  status                  text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'reversed')),
  paid_on                 date,
  note                    text,
  reversal_reason         text,
  provider_order_id       text,
  provider_transaction_id text,
  raw_response            jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.installment_sms_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  contract_id uuid NOT NULL REFERENCES public.installment_contracts(id) ON DELETE RESTRICT,
  schedule_id uuid REFERENCES public.installment_schedule(id) ON DELETE RESTRICT,
  kind        text NOT NULL CHECK (kind IN ('before_3', 'due_day', 'overdue_3', 'overdue_7', 'manual')),
  status      text NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  attempts    integer NOT NULL DEFAULT 1,
  message     text,
  error       text
);

CREATE INDEX IF NOT EXISTS installment_schedule_due_idx ON public.installment_schedule(status, due_date);
CREATE INDEX IF NOT EXISTS installment_payments_contract_idx ON public.installment_payments(contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS installment_sms_log_contract_idx ON public.installment_sms_log(contract_id, created_at DESC);
-- One automatic reminder of each kind per installment.
CREATE UNIQUE INDEX IF NOT EXISTS installment_sms_once_per_stage
  ON public.installment_sms_log(schedule_id, kind) WHERE kind <> 'manual';
-- Only one online payment can be open for an installment at a time.
CREATE UNIQUE INDEX IF NOT EXISTS installment_one_open_online_payment
  ON public.installment_payments(schedule_id) WHERE method = 'bog_online' AND status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS installment_provider_order_uidx
  ON public.installment_payments(provider_order_id) WHERE provider_order_id IS NOT NULL;

ALTER TABLE public.installment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_sms_log ENABLE ROW LEVEL SECURITY;

-- Admins may read. There are deliberately no write policies: writes use the
-- functions below (admins) or the service role (online payment, reminders).
DROP POLICY IF EXISTS "installment_admin_read_contracts" ON public.installment_contracts;
CREATE POLICY "installment_admin_read_contracts" ON public.installment_contracts FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "installment_admin_read_schedule" ON public.installment_schedule;
CREATE POLICY "installment_admin_read_schedule" ON public.installment_schedule FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "installment_admin_read_payments" ON public.installment_payments;
CREATE POLICY "installment_admin_read_payments" ON public.installment_payments FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "installment_admin_read_sms" ON public.installment_sms_log;
CREATE POLICY "installment_admin_read_sms" ON public.installment_sms_log FOR SELECT TO authenticated USING (public.is_admin());

-- Recomputes one installment and its contract from the successful payments.
CREATE OR REPLACE FUNCTION public.installment_refresh(p_schedule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.installment_schedule;
  v_paid numeric(14,2);
  v_contract public.installment_contracts;
BEGIN
  SELECT * INTO v_row FROM public.installment_schedule WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installment not found'; END IF;

  SELECT coalesce(sum(amount), 0) INTO v_paid
  FROM public.installment_payments
  WHERE schedule_id = p_schedule_id AND status = 'succeeded';

  UPDATE public.installment_schedule
  SET paid_amount = v_paid,
      status = CASE WHEN status = 'cancelled' THEN 'cancelled' WHEN v_paid >= amount THEN 'paid' ELSE 'pending' END,
      paid_at = CASE WHEN v_paid >= amount THEN coalesce(paid_at, now()) ELSE NULL END
  WHERE id = p_schedule_id;

  SELECT * INTO v_contract FROM public.installment_contracts WHERE id = v_row.contract_id FOR UPDATE;
  IF v_contract.status <> 'cancelled' THEN
    UPDATE public.installment_contracts
    SET status = CASE WHEN EXISTS (
          SELECT 1 FROM public.installment_schedule WHERE contract_id = v_row.contract_id AND status = 'pending'
        ) THEN 'active' ELSE 'completed' END,
        updated_at = now()
    WHERE id = v_row.contract_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_installment_contract(p_contract jsonb, p_schedule jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_number text := nullif(btrim(p_contract->>'contract_number'), '');
  v_total numeric(14,2) := (p_contract->>'total_price')::numeric;
  v_down numeric(14,2) := coalesce((p_contract->>'down_payment')::numeric, 0);
  v_months integer := (p_contract->>'months')::integer;
  v_sum numeric(14,2);
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT count(*), coalesce(sum((row->>'amount')::numeric), 0)
  INTO v_count, v_sum
  FROM jsonb_array_elements(p_schedule) AS row;

  IF v_count <> v_months THEN RAISE EXCEPTION 'Schedule does not match the number of months'; END IF;
  IF v_sum <> v_total - v_down THEN RAISE EXCEPTION 'Schedule does not add up to the financed amount'; END IF;

  v_number := coalesce(
    v_number,
    'ML-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.installment_contract_number_seq')::text, 3, '0')
  );

  INSERT INTO public.installment_contracts (
    contract_number, customer_name, customer_tax_id, phone, product_name, serial_number,
    total_price, down_payment, months, first_due_date, reminders_enabled, notes, created_by
  ) VALUES (
    v_number,
    btrim(p_contract->>'customer_name'),
    nullif(btrim(p_contract->>'customer_tax_id'), ''),
    p_contract->>'phone',
    btrim(p_contract->>'product_name'),
    nullif(btrim(p_contract->>'serial_number'), ''),
    v_total, v_down, v_months,
    (p_contract->>'first_due_date')::date,
    coalesce((p_contract->>'reminders_enabled')::boolean, true),
    nullif(btrim(p_contract->>'notes'), ''),
    auth.uid()
  ) RETURNING id INTO v_id;

  INSERT INTO public.installment_schedule (contract_id, installment_number, due_date, amount)
  SELECT v_id, (row->>'installment_number')::integer, (row->>'due_date')::date, (row->>'amount')::numeric
  FROM jsonb_array_elements(p_schedule) AS row;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_installment_payment(
  p_schedule_id uuid,
  p_amount numeric,
  p_method text,
  p_paid_on date,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.installment_schedule;
  v_contract_status text;
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_method NOT IN ('cash', 'bank_transfer', 'card_terminal', 'other') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  SELECT * INTO v_row FROM public.installment_schedule WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installment not found'; END IF;
  SELECT status INTO v_contract_status FROM public.installment_contracts WHERE id = v_row.contract_id;
  IF v_contract_status = 'cancelled' OR v_row.status = 'cancelled' THEN RAISE EXCEPTION 'Contract is cancelled'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_amount > v_row.amount - v_row.paid_amount THEN RAISE EXCEPTION 'Amount exceeds the remaining balance'; END IF;

  INSERT INTO public.installment_payments (contract_id, schedule_id, amount, method, status, paid_on, note, recorded_by)
  VALUES (v_row.contract_id, p_schedule_id, p_amount, p_method, 'succeeded', coalesce(p_paid_on, current_date), nullif(btrim(p_note), ''), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.installment_refresh(p_schedule_id);
  RETURN v_id;
END;
$$;

-- Corrects a mistaken manual entry. The row stays for the audit trail.
CREATE OR REPLACE FUNCTION public.reverse_installment_payment(p_payment_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.installment_payments;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A reason is required'; END IF;

  SELECT * INTO v_payment FROM public.installment_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status <> 'succeeded' THEN RAISE EXCEPTION 'Only a successful payment can be reversed'; END IF;
  -- Money taken online can only be returned through the bank.
  IF v_payment.method = 'bog_online' THEN RAISE EXCEPTION 'Online payments cannot be reversed here'; END IF;

  UPDATE public.installment_payments
  SET status = 'reversed', reversal_reason = btrim(p_reason), updated_at = now()
  WHERE id = p_payment_id;

  PERFORM public.installment_refresh(v_payment.schedule_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_installment_contract(p_contract_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A reason is required'; END IF;

  UPDATE public.installment_contracts
  SET status = 'cancelled', cancel_reason = btrim(p_reason), updated_at = now()
  WHERE id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;

  UPDATE public.installment_schedule SET status = 'cancelled' WHERE contract_id = p_contract_id AND status = 'pending';
  UPDATE public.installment_payments SET status = 'cancelled', updated_at = now()
  WHERE contract_id = p_contract_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_installment_reminders(p_contract_id uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.installment_contracts SET reminders_enabled = p_enabled, updated_at = now() WHERE id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
END;
$$;

-- Called only by the server after BOG's signed callback. Safe to repeat. A late
-- online payment on an already settled installment is still recorded, because
-- the money was really received; the admin page shows it as an overpayment.
CREATE OR REPLACE FUNCTION public.complete_installment_online_payment(
  p_payment_id uuid,
  p_provider_transaction_id text,
  p_raw_response jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.installment_payments;
BEGIN
  SELECT * INTO v_payment FROM public.installment_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status = 'succeeded' THEN RETURN; END IF;

  UPDATE public.installment_payments
  SET status = 'succeeded', paid_on = current_date, provider_transaction_id = p_provider_transaction_id,
      raw_response = coalesce(p_raw_response, '{}'::jsonb), updated_at = now()
  WHERE id = p_payment_id;

  PERFORM public.installment_refresh(v_payment.schedule_id);
END;
$$;

-- Client page data. Reached only through the contract's secret link. Leaves out
-- the phone, tax ID, internal notes and payment history.
CREATE OR REPLACE FUNCTION public.get_installment_public(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'contract_number', c.contract_number,
    'customer_name', c.customer_name,
    'product_name', c.product_name,
    'total_price', c.total_price,
    'down_payment', c.down_payment,
    'months', c.months,
    'status', c.status,
    'schedule', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'installment_number', s.installment_number,
        'due_date', s.due_date,
        'amount', s.amount,
        'paid_amount', s.paid_amount,
        'status', s.status
      ) ORDER BY s.installment_number), '[]'::jsonb)
      FROM public.installment_schedule s WHERE s.contract_id = c.id
    )
  )
  FROM public.installment_contracts c
  WHERE c.public_token = p_token;
$$;

REVOKE ALL ON FUNCTION public.installment_refresh(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_installment_online_payment(uuid, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_installment_online_payment(uuid, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.create_installment_contract(jsonb, jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.record_installment_payment(uuid, numeric, text, date, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.reverse_installment_payment(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.cancel_installment_contract(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_installment_reminders(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_installment_contract(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_installment_payment(uuid, numeric, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_installment_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_installment_contract(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_installment_reminders(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.get_installment_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_installment_public(uuid) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
