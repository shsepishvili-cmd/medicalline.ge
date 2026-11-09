CREATE TABLE IF NOT EXISTS public.internal_order_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  phone_normalized TEXT NOT NULL UNIQUE,
  phone_display TEXT,
  full_name TEXT NOT NULL,
  clinic_name TEXT,
  city TEXT,
  source TEXT NOT NULL DEFAULT 'manual_entry'
);

CREATE TABLE IF NOT EXISTS public.internal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.internal_order_customers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'ordered', 'received', 'delivered', 'cancelled')),
  product_text TEXT NOT NULL,
  quantity_text TEXT,
  supplier_text TEXT,
  expected_date DATE,
  paid_amount NUMERIC(12, 2),
  sale_amount NUMERIC(12, 2),
  notes TEXT,
  created_by_name TEXT
);

ALTER TABLE public.internal_order_customers
  ADD COLUMN IF NOT EXISTS phone_display TEXT;

ALTER TABLE public.internal_order_customers
  ADD COLUMN IF NOT EXISTS clinic_name TEXT;

ALTER TABLE public.internal_order_customers
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.internal_orders
  ADD COLUMN IF NOT EXISTS quantity_text TEXT;

ALTER TABLE public.internal_orders
  ADD COLUMN IF NOT EXISTS supplier_text TEXT;

ALTER TABLE public.internal_orders
  ADD COLUMN IF NOT EXISTS expected_date DATE;

ALTER TABLE public.internal_orders
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2);

ALTER TABLE public.internal_orders
  ADD COLUMN IF NOT EXISTS sale_amount NUMERIC(12, 2);

ALTER TABLE public.internal_orders
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

CREATE INDEX IF NOT EXISTS internal_order_customers_phone_idx ON public.internal_order_customers(phone_normalized);
CREATE INDEX IF NOT EXISTS internal_orders_created_at_idx ON public.internal_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS internal_orders_status_idx ON public.internal_orders(status);
CREATE INDEX IF NOT EXISTS internal_orders_customer_id_idx ON public.internal_orders(customer_id);

CREATE OR REPLACE FUNCTION public.set_internal_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_internal_order_customers_updated_at ON public.internal_order_customers;
CREATE TRIGGER set_internal_order_customers_updated_at
BEFORE UPDATE ON public.internal_order_customers
FOR EACH ROW
EXECUTE FUNCTION public.set_internal_orders_updated_at();

DROP TRIGGER IF EXISTS set_internal_orders_updated_at ON public.internal_orders;
CREATE TRIGGER set_internal_orders_updated_at
BEFORE UPDATE ON public.internal_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_internal_orders_updated_at();

ALTER TABLE public.internal_order_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.internal_order_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.internal_orders TO authenticated;

DROP POLICY IF EXISTS "Staff can read internal order customers" ON public.internal_order_customers;
CREATE POLICY "Staff can read internal order customers"
ON public.internal_order_customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can insert internal order customers" ON public.internal_order_customers;
CREATE POLICY "Staff can insert internal order customers"
ON public.internal_order_customers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can update internal order customers" ON public.internal_order_customers;
CREATE POLICY "Staff can update internal order customers"
ON public.internal_order_customers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can read internal orders" ON public.internal_orders;
CREATE POLICY "Staff can read internal orders"
ON public.internal_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can insert internal orders" ON public.internal_orders;
CREATE POLICY "Staff can insert internal orders"
ON public.internal_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);

DROP POLICY IF EXISTS "Staff can update internal orders" ON public.internal_orders;
CREATE POLICY "Staff can update internal orders"
ON public.internal_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.role IN ('admin', 'manager', 'technician', 'engineer')
  )
);
