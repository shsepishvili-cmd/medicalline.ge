-- =============================================================================
-- 07_warranty_verify_rpc.sql
-- Recreates the public warranty verification RPC function.
-- Run this in Supabase SQL Editor if /warranty/verify/[token] shows errors.
-- =============================================================================

-- Requires pgcrypto for gen_random_uuid (should already be enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add verify_token column if it doesn't exist yet (safe to run multiple times)
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS verify_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Add qr_url column if it doesn't exist yet
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS warranties_verify_token_idx
  ON public.warranties (verify_token);

-- ---------------------------------------------------------------------------
-- Public verification function
-- security definer = runs as the function owner, bypasses RLS
-- granted to anon so unauthenticated users can verify QR codes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_warranty_public_summary(p_verify_token UUID)
RETURNS TABLE (
  warranty_number   TEXT,
  brand             TEXT,
  product_name      TEXT,
  model             TEXT,
  serial_number     TEXT,
  clinic_name       TEXT,
  customer_name     TEXT,
  purchase_date     DATE,
  installation_date DATE,
  warranty_start    DATE,
  warranty_end      DATE,
  status            TEXT
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
    w.purchase_date,
    w.installation_date,
    w.warranty_start,
    w.warranty_end,
    w.status
  FROM public.warranties w
  WHERE w.verify_token = p_verify_token
    AND w.archived_at IS NULL
  LIMIT 1;
$$;

-- Grant access to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_warranty_public_summary(UUID) TO anon, authenticated;
