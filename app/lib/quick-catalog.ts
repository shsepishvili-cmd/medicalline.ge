import { createClient } from '@supabase/supabase-js'

// Products an admin added from the admin panel and marked for the main
// catalogue. Shaped like the built-in catalogue entries so the same pages can
// render them. Prices are never read here.
export type QuickCatalogProduct = {
  id: number
  slug: string
  name: string
  img: string
  images: string[]
  cat: string
  brand: string
  description: string
  specs: string[]
  quickAdded: true
}

type Row = { id: string; slug: string; name: string; brand: string | null; category_slug: string | null; short_desc: string | null; specs: unknown; images: string[] | null }

// A stable numeric id (the built-in catalogue uses small integers).
function numericId(uuid: string) {
  return 1_000_000 + (parseInt(uuid.replace(/-/g, '').slice(0, 7), 16) % 8_000_000)
}

function specsList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(String).filter(Boolean)
  return []
}

export async function loadQuickCatalogProducts(excludeSlugs: Iterable<string> = []): Promise<QuickCatalogProduct[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!url || !key) return []
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const [products, categories] = await Promise.all([
      supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, specs, images')
        .eq('is_active', true).eq('quick_added', true).eq('show_in_catalog', true).order('created_at', { ascending: false }),
      supabase.from('categories').select('slug, name_ka'),
    ])
    // Before migration 56 the columns do not exist: show the built-in catalogue only.
    if (products.error) return []
    const names = new Map(((categories.data || []) as Array<{ slug: string; name_ka: string }>).map((row) => [row.slug, row.name_ka]))
    const skip = new Set(excludeSlugs)
    return ((products.data || []) as Row[])
      .filter((row) => !skip.has(row.slug) && row.images?.[0])
      .map((row) => ({
        id: numericId(row.id),
        slug: row.slug,
        name: row.name,
        img: row.images![0],
        images: row.images!,
        cat: (row.category_slug && names.get(row.category_slug)) || 'სიახლეები',
        brand: row.brand || '',
        description: row.short_desc || '',
        specs: specsList(row.specs),
        quickAdded: true as const,
      }))
  } catch (cause) {
    console.error('[quick-catalog]', cause instanceof Error ? cause.message : cause)
    return []
  }
}

export async function loadQuickCatalogProduct(slug: string) {
  const all = await loadQuickCatalogProducts()
  return all.find((product) => product.slug === slug) || null
}
