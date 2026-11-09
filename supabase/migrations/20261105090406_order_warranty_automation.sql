-- Link an order-portal order to exactly one warranty and keep the warranty
-- attached to the canonical CRM/ERP customer.

ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS erp_party_id UUID REFERENCES public.erp_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_portal_order_id UUID REFERENCES public.order_portal_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS warranties_order_portal_order_id_unique
  ON public.warranties(order_portal_order_id)
  WHERE order_portal_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS warranties_erp_party_id_idx
  ON public.warranties(erp_party_id)
  WHERE erp_party_id IS NOT NULL;

ALTER TABLE public.order_portal_orders
  ADD COLUMN IF NOT EXISTS warranty_id UUID REFERENCES public.warranties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warranty_sms_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warranty_sms_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS order_portal_orders_warranty_id_unique
  ON public.order_portal_orders(warranty_id)
  WHERE warranty_id IS NOT NULL;
