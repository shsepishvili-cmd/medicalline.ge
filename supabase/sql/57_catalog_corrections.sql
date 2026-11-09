-- =============================================================================
-- 57_catalog_corrections.sql
-- Admin corrections to the products built into the site code (/catalog):
-- when catalog_override is on, the catalogue pages show this row's name,
-- brand, description, specifications and photos instead of the built-in
-- text. catalog_hidden hides a built-in product from the catalogue.
-- Turning catalog_override off restores the original. The site code and the
-- built-in data files are not changed. Safe to run more than once.
-- =============================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_hidden   boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_catalog_corrections_idx
  ON public.products (slug) WHERE catalog_override OR catalog_hidden;

COMMIT;

NOTIFY pgrst, 'reload schema';
