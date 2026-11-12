-- Supplier document archive: classify archived uploads without moving records.

ALTER TABLE public.supplier_invoices
ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'supplier_invoice'
CHECK (document_type IN ('supplier_invoice', 'business_trip'));

CREATE OR REPLACE VIEW public.invoice_unified_history AS
SELECT
  'sales'::TEXT AS invoice_kind,
  id::TEXT AS source_id,
  invoice_number AS number,
  customer_name AS counterparty,
  invoice_date,
  currency,
  grand_total AS total,
  status,
  created_at
FROM public.invoices
UNION ALL
SELECT
  'legacy_sales',
  i.id::TEXT,
  i.number,
  COALESCE(c.company, c.name, 'უცნობი კლიენტი'),
  CASE WHEN i.date ~ '^\d{4}-\d{2}-\d{2}$' THEN i.date::DATE ELSE NULL END,
  i.currency,
  i.total,
  i.status,
  i.created_at
FROM public.inv_invoices i
LEFT JOIN public.inv_clients c ON c.id = i.client_id
UNION ALL
SELECT
  COALESCE(document_type, 'supplier_invoice'),
  id::TEXT,
  invoice_number,
  manufacturer_name,
  invoice_date,
  currency,
  total,
  'received',
  created_at
FROM public.supplier_invoices;

GRANT SELECT ON public.invoice_unified_history TO authenticated;
