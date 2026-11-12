-- =============================================================================
-- 56_quick_catalog_products.sql
-- Products an admin adds from the admin panel (phone quick-add) can appear in
-- the main /catalog as well as on /expo2026. The built-in catalogue in the
-- site code is untouched; these flags only apply to admin-added products.
-- Nothing is deleted or renamed. Safe to run more than once.
-- =============================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quick_added     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_catalog boolean NOT NULL DEFAULT false;

-- Products already created by the expo quick-add (slug prefix "expo-").
UPDATE public.products SET quick_added = true WHERE slug LIKE 'expo-%' AND NOT quick_added;

CREATE INDEX IF NOT EXISTS products_quick_catalog_idx
  ON public.products (show_in_catalog, is_active) WHERE quick_added;

COMMIT;

NOTIFY pgrst, 'reload schema';
