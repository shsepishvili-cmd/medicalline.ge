-- =============================================================================
-- 13_warranty_public_pdf_fix.sql
-- Ensures public warranty verification/PDF has buyer ID and warranty duration.
-- Run in Supabase SQL Editor for production.
-- =============================================================================

ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS customer_id_number TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS terms_version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.get_warranty_public_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_warranty_public_summary(p_verify_token UUID)
RETURNS TABLE (
  warranty_number    TEXT,
  brand              TEXT,
  product_name       TEXT,
  model              TEXT,
  serial_number      TEXT,
  clinic_name        TEXT,
  customer_name      TEXT,
  customer_id_number TEXT,
  customer_address   TEXT,
  purchase_date      DATE,
  installation_date  DATE,
  warranty_start     DATE,
  warranty_months    INTEGER,
  warranty_end       DATE,
  status             TEXT,
  terms_version      TEXT,
  generated_at       TIMESTAMPTZ
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
    w.generated_at
  FROM public.warranties w
  WHERE w.verify_token = p_verify_token
    AND w.archived_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_warranty_public_summary(UUID) TO anon, authenticated;
