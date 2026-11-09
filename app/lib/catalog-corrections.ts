import { createClient } from '@supabase/supabase-js'
import { inferBrand, localCatalogProducts, mapCategoryToSlug, specsArrayToRecord, type LocalCatalogProduct } from './catalogSync'

// Corrections an admin made to products built into the site code. The code
// stays the source of the original; a row with catalog_override replaces the
// shown text and photos, catalog_hidden takes the product off the catalogue.

export type CatalogCorrection = {
  slug: string
  override: boolean
  hidden: boolean
  name: string
  brand: string | null
  description: string | null
  specs: string[]
  images: string[]
}

type Row = { slug: string; name: string; brand: string | null; short_desc: string | null; specs: unknown; images: string[] | null; catalog_override: boolean; catalog_hidden: boolean }

export function findBuiltInProduct(slug: string) {
  return localCatalogProducts.find((product) => product.slug === slug) || null
}

export function builtInImages(product: LocalCatalogProduct) {
  const extra = (product as LocalCatalogProduct & { images?: string[] }).images
  return Array.isArray(extra) && extra.length ? extra : [product.img]
}

// The database row that mirrors a built-in product as it is in the code.
export function builtInCatalogRow(product: LocalCatalogProduct) {
  return {
    slug: product.slug,
    name: product.name,
    brand: inferBrand(product),
    category_slug: mapCategoryToSlug(product.cat),
    short_desc: product.description,
    specs: specsArrayToRecord(product.specs || []),
    images: builtInImages(product),
  }
}

function specsList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(String).filter(Boolean)
  return []
}

export async function loadCatalogCorrections(): Promise<Map<string, CatalogCorrection>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  const result = new Map<string, CatalogCorrection>()
  if (!url || !key) return result
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await supabase.from('products')
      .select('slug, name, brand, short_desc, specs, images, catalog_override, catalog_hidden')
    // Before migration 57 the columns do not exist: show the code as it is.
    if (error) return result
    for (const row of (data || []) as Row[]) {
      if (!row.catalog_override && !row.catalog_hidden) continue
      result.set(row.slug, {
        slug: row.slug, override: row.catalog_override, hidden: row.catalog_hidden, name: row.name, brand: row.brand,
        description: row.short_desc, specs: specsList(row.specs), images: (row.images || []).filter(Boolean),
      })
    }
  } catch (cause) {
    console.error('[catalog-corrections]', cause instanceof Error ? cause.message : cause)
  }
  return result
}

// Applies a correction to a built-in product as the catalogue pages use it.
export function applyCorrection<T extends { slug: string; name: string; img: string; description: string; specs?: string[]; brand?: string }>(product: T, correction?: CatalogCorrection): T & { images?: string[] } {
  if (!correction?.override) return product
  const images = correction.images.length ? correction.images : undefined
  return {
    ...product,
    name: correction.name || product.name,
    brand: correction.brand || product.brand,
    description: correction.description ?? product.description,
    specs: correction.specs.length ? correction.specs : product.specs,
    img: images?.[0] || product.img,
    ...(images ? { images } : {}),
  }
}
