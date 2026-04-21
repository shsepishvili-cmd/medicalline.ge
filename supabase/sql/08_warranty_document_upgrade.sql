-- =============================================================================
-- 08_warranty_document_upgrade.sql
-- Adds formal document fields to the warranties table.
-- Run in Supabase Dashboard → SQL Editor.
-- =============================================================================

-- Customer identification number (personal ID / სამეწარმეო კოდი / etc.)
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS customer_id_number TEXT;

-- Customer or clinic postal address
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Tracks which version of the Georgian warranty terms text was embedded in the PDF.
-- Increment when the clause wording changes so old PDFs stay reproducible.
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS terms_version TEXT NOT NULL DEFAULT '1.0';

-- Timestamp of the most recent PDF generation (NULL until first PDF is generated).
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
