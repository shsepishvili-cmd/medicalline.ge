-- Link public order-form customers into the canonical CRM/ERP customer table.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.ml_normalize_ge_phone(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := regexp_replace(coalesce(value, ''), '\D', '', 'g');
  IF digits ~ '^9955[0-9]{8}$' THEN
    RETURN digits;
  END IF;
  IF digits ~ '^5[0-9]{8}$' THEN
    RETURN '995' || digits;
  END IF;
  RETURN NULL;
END;
$$;

ALTER TABLE public.erp_parties
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS is_individual BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.order_customers
  ADD COLUMN IF NOT EXISTS erp_party_id UUID REFERENCES public.erp_parties(id) ON DELETE SET NULL;

UPDATE public.erp_parties
SET phone_normalized = public.ml_normalize_ge_phone(phone)
WHERE phone_normalized IS NULL
  AND public.ml_normalize_ge_phone(phone) IS NOT NULL;

CREATE INDEX IF NOT EXISTS erp_parties_company_phone_normalized_idx
  ON public.erp_parties(company_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS erp_parties_crm_owner_idx
  ON public.erp_parties(crm_owner_id);

CREATE INDEX IF NOT EXISTS erp_parties_profile_idx
  ON public.erp_parties(profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS order_portal_erp_parties_company_phone_unique
  ON public.erp_parties(company_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL
    AND source = 'order_portal'
    AND party_type IN ('customer', 'both');

CREATE INDEX IF NOT EXISTS order_customers_erp_party_id_idx
  ON public.order_customers(erp_party_id);

WITH default_company AS (
  SELECT id
  FROM public.erp_companies
  WHERE code = 'MEDIQALJORJIA'
  ORDER BY created_at ASC
  LIMIT 1
),
normalized_order_customers AS (
  SELECT
    oc.*,
    public.ml_normalize_ge_phone(coalesce(oc.phone_normalized, oc.phone_display)) AS normalized_phone
  FROM public.order_customers oc
),
inserted AS (
  INSERT INTO public.erp_parties (
    company_id,
    party_type,
    name,
    tax_id,
    phone,
    phone_normalized,
    email,
    city,
    lead_source,
    is_individual,
    source
  )
  SELECT
    dc.id,
    'customer',
    coalesce(nullif(noc.clinic_name, ''), noc.full_name),
    nullif(noc.tax_id, ''),
    coalesce(nullif(noc.phone_display, ''), noc.phone_normalized),
    noc.normalized_phone,
    nullif(noc.email, ''),
    nullif(noc.city, ''),
    'order_portal',
    noc.clinic_name IS NULL OR noc.clinic_name = '',
    'order_portal'
  FROM normalized_order_customers noc
  CROSS JOIN default_company dc
  WHERE noc.erp_party_id IS NULL
    AND noc.normalized_phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.erp_parties ep
      WHERE ep.company_id = dc.id
        AND (
          ep.phone_normalized = noc.normalized_phone
          OR (noc.tax_id IS NOT NULL AND noc.tax_id <> '' AND ep.tax_id = noc.tax_id)
        )
    )
  RETURNING id, company_id, phone_normalized
)
UPDATE public.order_customers oc
SET erp_party_id = ep.id
FROM default_company dc
JOIN public.erp_parties ep ON ep.company_id = dc.id
WHERE oc.erp_party_id IS NULL
  AND ep.phone_normalized = public.ml_normalize_ge_phone(coalesce(oc.phone_normalized, oc.phone_display))
  AND ep.party_type IN ('customer', 'both');
