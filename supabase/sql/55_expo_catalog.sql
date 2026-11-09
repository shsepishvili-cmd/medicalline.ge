-- =============================================================================
-- 55_expo_catalog.sql
-- Expo catalogue: a hand-picked subset of the existing products shown on
-- /expo2026. Products, photos and descriptions stay in the main catalogue;
-- this table only says which ones appear, in what order and with what label.
-- No prices here. Nothing is deleted or renamed. Safe to run more than once.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.expo_catalog_items (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  note       text CHECK (note IS NULL OR char_length(note) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expo_catalog_items_sort_idx ON public.expo_catalog_items (sort_order);

ALTER TABLE public.expo_catalog_items ENABLE ROW LEVEL SECURITY;

-- Which products are on show is public, like the catalogue itself.
DROP POLICY IF EXISTS "public_read_expo_catalog" ON public.expo_catalog_items;
CREATE POLICY "public_read_expo_catalog" ON public.expo_catalog_items
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_expo_catalog" ON public.expo_catalog_items;
CREATE POLICY "admin_write_expo_catalog" ON public.expo_catalog_items
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON public.expo_catalog_items FROM anon, authenticated;
GRANT SELECT ON public.expo_catalog_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.expo_catalog_items TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
