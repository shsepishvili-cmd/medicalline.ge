CREATE TABLE IF NOT EXISTS public.order_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  phone_normalized TEXT NOT NULL UNIQUE,
  phone_display TEXT,
  full_name TEXT NOT NULL,
  clinic_name TEXT,
  city TEXT,
  email TEXT,
  tax_id TEXT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS public.order_portal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.order_customers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'quoted', 'confirmed', 'delivered', 'cancelled')),
  requested_product TEXT NOT NULL,
  product_category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),
  urgency TEXT,
  preferred_contact TEXT,
  delivery_city TEXT,
  delivery_address TEXT,
  comment TEXT,
  source TEXT NOT NULL DEFAULT 'public_order_portal',
  ip_address TEXT,
  user_agent TEXT,
  admin_note TEXT,
  reminder_at TIMESTAMPTZ,
  status_sms_sent_at TIMESTAMPTZ,
  status_sms_error TEXT
);

ALTER TABLE public.order_portal_orders
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;

ALTER TABLE public.order_portal_orders
  ADD COLUMN IF NOT EXISTS status_sms_sent_at TIMESTAMPTZ;

ALTER TABLE public.order_portal_orders
  ADD COLUMN IF NOT EXISTS status_sms_error TEXT;

CREATE INDEX IF NOT EXISTS order_customers_phone_normalized_idx ON public.order_customers(phone_normalized);
CREATE INDEX IF NOT EXISTS order_portal_orders_created_at_idx ON public.order_portal_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS order_portal_orders_status_idx ON public.order_portal_orders(status);
CREATE INDEX IF NOT EXISTS order_portal_orders_customer_id_idx ON public.order_portal_orders(customer_id);
CREATE INDEX IF NOT EXISTS order_portal_orders_reminder_at_idx ON public.order_portal_orders(reminder_at) WHERE reminder_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_order_portal_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_customers_updated_at ON public.order_customers;
CREATE TRIGGER set_order_customers_updated_at
BEFORE UPDATE ON public.order_customers
FOR EACH ROW
EXECUTE FUNCTION public.set_order_portal_updated_at();

DROP TRIGGER IF EXISTS set_order_portal_orders_updated_at ON public.order_portal_orders;
CREATE TRIGGER set_order_portal_orders_updated_at
BEFORE UPDATE ON public.order_portal_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_portal_updated_at();

ALTER TABLE public.order_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_portal_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read order customers" ON public.order_customers;
CREATE POLICY "Staff can read order customers"
ON public.order_customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can update order customers" ON public.order_customers;
CREATE POLICY "Staff can update order customers"
ON public.order_customers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can read orders" ON public.order_portal_orders;
CREATE POLICY "Staff can read orders"
ON public.order_portal_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can update orders" ON public.order_portal_orders;
CREATE POLICY "Staff can update orders"
ON public.order_portal_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);
