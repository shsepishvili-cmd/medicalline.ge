import { products as part1 } from '../catalog/data-part1'
import { products as part2 } from '../catalog/data-part2'

export type LocalCatalogAiFeature = { icon: string; title: string; desc: string }

export type LocalCatalogProduct = {
  id: number
  slug: string
  name: string
  img: string
  cat: string
  description: string
  specs: string[]
  aiFeatures?: LocalCatalogAiFeature[]
}

export const localCatalogProducts = [...part1, ...part2] as LocalCatalogProduct[]

export function normalizeProductText(value: string) {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\\p{L}\\p{N}]+/gu, '')
}

export function mapCategoryToSlug(category: string) {
  const normalized = category.trim().toLowerCase()
  const map: Record<string, string> = {
    'ენდოდონტია': 'endo',
    'ციფრული სკანერები': 'scan',
    'რადიოლოგია': 'radio',
    'ოპტიკა': 'optics',
    'ჰიგიენა': 'hygiene',
    'ქირურგია': 'surgery',
    'სხვა': 'other',
    'პარტნიორი ბრენდები': 'partner',
    'პარტნიორი': 'partner',
  }
  return map[normalized] || 'other'
}

export function inferBrand(product: Pick<LocalCatalogProduct, 'slug' | 'name'>) {
  const key = `${product.slug} ${product.name}`.toLowerCase()
  if (key.includes('hager')) return 'Hager'
  if (key.includes('finscan')) return 'LargeV'
  if (key.includes('philden')) return 'Philden'
  return 'Eighteeth'
}

export function specsArrayToRecord(specs: string[]) {
  return specs.reduce<Record<string, string>>((acc, item, index) => {
    acc[`Feature ${index + 1}`] = item
    return acc
  }, {})
}

export function findCatalogProductByAny(product: { slug?: string; name?: string; img?: string }) {
  const slugKey = normalizeProductText(product.slug || '')
  const nameKey = normalizeProductText(product.name || '')
  const imgKey = normalizeProductText(product.img || '')
  // Exact matches only: partial model names (e.g. Helios 680 vs 700)
  // must never replace an offer's image or specifications.
  return localCatalogProducts.find((item) =>
    (slugKey && normalizeProductText(item.slug) === slugKey) ||
    (nameKey && normalizeProductText(item.name) === nameKey) ||
    (imgKey && normalizeProductText(item.img) === imgKey)
  )
}

export function findDatabaseProductMatch<T extends { slug?: string; name?: string }>(
  dbProducts: T[],
  product: { slug?: string; name?: string },
) {
  const productSlug = normalizeProductText(product.slug || '')
  const productName = normalizeProductText(product.name || '')
  return dbProducts.find((dbProduct) => {
    const dbSlug = normalizeProductText(dbProduct.slug || '')
    const dbName = normalizeProductText(dbProduct.name || '')
    return (productSlug && dbSlug === productSlug) || (productName && dbName === productName)
  })
}

/**
 * Collapses multiple database product variants into unique slugs.
 * Groups products by slug and returns one representative per slug.
 */
export function collapseDatabaseProducts<T extends { slug?: string; name?: string }>(
  dbProducts: T[],
): T[] {
  const seen = new Set<string>()
  return dbProducts.filter((p) => {
    const key = normalizeProductText(p.slug || p.name || '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
