-- =============================================================================
-- 52_warranty_certificate_v2.sql
-- Individual warranty card: printed component terms, package contents and the
-- handover checklist, plus a privacy-safe public lookup by number + serial.
-- Safe to run more than once. Run in Supabase Dashboard -> SQL Editor.
-- =============================================================================

BEGIN;

ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS component_terms TEXT,
  ADD COLUMN IF NOT EXISTS package_notes TEXT,
  ADD COLUMN IF NOT EXISTS handover_device_checked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS handover_installation_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS handover_manual_given BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS handover_training_done BOOLEAN NOT NULL DEFAULT FALSE;

-- New warranties are issued under the v2 terms. Existing rows keep the version
-- they were issued with, so their documents do not change retroactively.
ALTER TABLE public.warranties
  ALTER COLUMN terms_version SET DEFAULT '2.0';

-- The return type changes, so the function has to be dropped and recreated.
DROP FUNCTION IF EXISTS public.get_warranty_public_summary(UUID);

CREATE FUNCTION public.get_warranty_public_summary(p_verify_token UUID)
RETURNS TABLE (
  warranty_number            TEXT,
  brand                      TEXT,
  product_name               TEXT,
  model                      TEXT,
  serial_number              TEXT,
  clinic_name                TEXT,
  customer_name              TEXT,
  customer_id_number         TEXT,
  customer_address           TEXT,
  purchase_date              DATE,
  installation_date          DATE,
  warranty_start             DATE,
  warranty_months            INTEGER,
  warranty_end               DATE,
  status                     TEXT,
  terms_version              TEXT,
  generated_at               TIMESTAMPTZ,
  product_category           TEXT,
  component_terms            TEXT,
  package_notes              TEXT,
  handover_device_checked    BOOLEAN,
  handover_installation_done BOOLEAN,
  handover_manual_given      BOOLEAN,
  handover_training_done     BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.warranty_number,
    w.brand,
    w.product_name,
    w.model,
    w.serial_number,
    w.clinic_name,
    w.customer_name,
    w.customer_id_number,
    w.customer_address,
    w.purchase_date,
    w.installation_date,
    w.warranty_start,
    w.warranty_months,
    w.warranty_end,
    w.status,
    w.terms_version,
    w.generated_at,
    w.product_category,
    w.component_terms,
    w.package_notes,
    w.handover_device_checked,
    w.handover_installation_done,
    w.handover_manual_given,
    w.handover_training_done
  FROM public.warranties w
  WHERE w.verify_token = p_verify_token
    AND w.archived_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_warranty_public_summary(UUID) TO anon, authenticated;

-- Public lookup used by /warranty. Both values must match, and it deliberately
-- returns no buyer data and no verify token.
CREATE OR REPLACE FUNCTION public.lookup_warranty_public(
  p_warranty_number TEXT,
  p_serial_number TEXT
)
RETURNS TABLE (
  warranty_number  TEXT,
  product_category TEXT,
  brand            TEXT,
  product_name     TEXT,
  model            TEXT,
  serial_number    TEXT,
  warranty_start   DATE,
  warranty_months  INTEGER,
  warranty_end     DATE,
  status           TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.warranty_number,
    w.product_category,
    w.brand,
    w.product_name,
    w.model,
    w.serial_number,
    w.warranty_start,
    w.warranty_months,
    w.warranty_end,
    w.status
  FROM public.warranties w
  WHERE upper(btrim(w.warranty_number)) = upper(btrim(p_warranty_number))
    AND upper(btrim(w.serial_number)) = upper(btrim(p_serial_number))
    AND w.archived_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_warranty_public(TEXT, TEXT) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
