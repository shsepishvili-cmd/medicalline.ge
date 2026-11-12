-- =============================================================================
-- 58_fix_missing_product_photos.sql
-- Four products in the database point to photo files that are not on the
-- site, so /expo2026 shows them without a photo. Three get the product's real
-- photo that the site already serves (manufacturer images used in the blog,
-- or the same product's catalogue photo). Each update only applies while the
-- row still has the broken value, so a photo uploaded since is never
-- overwritten. ES-20 has no verified photo on the site: upload it from
-- /admin/products. Safe to run more than once.
-- =============================================================================

BEGIN;

-- Acuvision X1 dental microscope (was /images/acuvision-x1/product.jpeg, missing)
UPDATE public.products
SET images = ARRAY['/images/blog/acuvision-x1/acuvision-x1-1.jpg']
WHERE slug = 'acuvision-x1' AND images = ARRAY['/images/acuvision-x1/product.jpeg'];

-- HyperLight-A portable X-ray (was /images/hyperlight-a.png, missing)
UPDATE public.products
SET images = ARRAY['/images/blog/hyperlight-a/hyperlight-a-02.jpg']
WHERE slug = 'hyperlight-a' AND images = ARRAY['/images/hyperlight-a.png'];

-- NanoPix 1/2 (database row without a photo; same product as catalogue nanopix-1-2)
UPDATE public.products
SET images = ARRAY['/images/nanopix1.png']
WHERE slug = 'nanopix-1' AND (images IS NULL OR images = '{}');

COMMIT;

-- Check: every active product and whether it now has a photo.
SELECT slug, name, images[1] AS photo
FROM public.products
WHERE slug IN ('acuvision-x1', 'hyperlight-a', 'nanopix-1', 'es-20-dental-electrosurgical-unit');
