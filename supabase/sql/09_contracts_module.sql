-- =============================================================================
-- 09_contracts_module.sql
-- Creates the contracts table and related objects.
-- Run in Supabase Dashboard → SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Auto-generated sequential number, e.g. CNTR-2025-0001
  contract_number     TEXT NOT NULL UNIQUE,

  contract_date       DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Optional link to the warranty record created alongside this contract
  warranty_id         UUID REFERENCES public.warranties(id) ON DELETE SET NULL,

  -- Buyer / clinic info
  clinic_name         TEXT,
  customer_name       TEXT,
  customer_id_number  TEXT,         -- personal ID or business registration number
  customer_address    TEXT,
  phone               TEXT,
  email               TEXT,

  -- Product / service being sold
  product_name        TEXT NOT NULL,
  brand               TEXT NOT NULL,
  model               TEXT,
  serial_number       TEXT,
  quantity            INTEGER NOT NULL DEFAULT 1,

  -- Financials
  unit_price          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'GEL',
  vat_rate            NUMERIC(5, 2) NOT NULL DEFAULT 18,  -- percent, 0 = VAT-exempt
  vat_included        BOOLEAN NOT NULL DEFAULT TRUE,      -- price already includes VAT
  total_amount        NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Terms
  payment_terms       TEXT,          -- e.g. "100% წინასწარ", "50% ავანსი, 50% მიწოდებისას"
  delivery_date       DATE,
  delivery_address    TEXT,
  installation_included BOOLEAN NOT NULL DEFAULT FALSE,
  warranty_months     INTEGER NOT NULL DEFAULT 0,
  special_terms       TEXT,          -- any extra clauses appended to the document

  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'signed', 'cancelled')),

  -- PDF
  pdf_path            TEXT,
  generated_at        TIMESTAMPTZ,

  -- Audit
  notes               TEXT,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_contracts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contracts_updated_at();

-- Auto-generate sequential contract_number like CNTR-2025-0001
CREATE SEQUENCE IF NOT EXISTS public.contract_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'CNTR-' || to_char(now(), 'YYYY') || '-' ||
                           LPAD(nextval('public.contract_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_number ON public.contracts;
CREATE TRIGGER trg_contracts_number
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();

-- Indexes
CREATE INDEX IF NOT EXISTS contracts_status_idx        ON public.contracts (status);
CREATE INDEX IF NOT EXISTS contracts_contract_date_idx ON public.contracts (contract_date DESC);
CREATE INDEX IF NOT EXISTS contracts_warranty_id_idx   ON public.contracts (warranty_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Staff (admin / engineer / dealer) can do everything
CREATE POLICY "staff_all_contracts" ON public.contracts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'engineer', 'dealer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role IN ('admin', 'engineer', 'dealer')
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket (run separately if the bucket does not exist yet)
-- The bucket 'warranty-documents' is already created for warranties —
-- contracts will be stored in the same bucket under a 'contracts/' prefix.
-- No additional bucket is needed.
-- ---------------------------------------------------------------------------
