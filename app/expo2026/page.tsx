import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { buildPageMetadata } from '@/app/lib/seo'
import { findCatalogProductByAny, localCatalogProducts } from '@/app/lib/catalogSync'
import type { Viewport } from 'next'
import { ExpoCatalog, type ExpoProduct } from './ExpoCatalog'
import { InstallHint } from './InstallHint'
import styles from './expo.module.css'

export const revalidate = 60

// Phone app feel: installable from the home screen (Android and iPhone),
// full-bleed under the iPhone notch, navy browser bar.
export const viewport: Viewport = { themeColor: '#0a2044', viewportFit: 'cover', width: 'device-width', initialScale: 1 }

const baseMetadata = buildPageMetadata({
  path: '/expo2026',
  title: 'GDDA Dental Expo 2026 | Medical Line Georgia',
  description: 'Medical Line Georgia GDDA Dental Expo 2026-ზე: სტომატოლოგიური აპარატურის კატალოგი და პერსონალური საგამოფენო შეთავაზების მოთხოვნა.',
  keywords: ['GDDA Expo 2026', 'სტომატოლოგიური გამოფენა', 'Medical Line Georgia', 'სპეციალური ფასი'],
})

export const metadata = {
  ...baseMetadata,
  manifest: '/expo2026/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'ML Expo', statusBarStyle: 'black-translucent' as const },
  icons: { ...(typeof baseMetadata.icons === 'object' && baseMetadata.icons ? baseMetadata.icons : {}), apple: '/expo2026/apple-touch-icon.png' },
}

// Products come from the live catalogue (their ids are what a price request
// refers to); photos and descriptions from the site's own verified catalogue
// data. Prices are never selected here. When the admin has picked an expo
// selection, only those products are shown, in the chosen order; until then,
// or if the selection table is missing, the full catalogue is shown.
async function loadProducts(): Promise<{ products: ExpoProduct[]; curated: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!url || !key) return { products: [], curated: false }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const [{ data, error }, selection, categoryRows] = await Promise.all([
    supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, images, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('expo_catalog_items').select('product_id, sort_order, note').order('sort_order'),
    supabase.from('categories').select('slug, name_ka'),
  ])
  const categoryName = new Map(((categoryRows.data || []) as Array<{ slug: string; name_ka: string | null }>).map((row) => [row.slug, row.name_ka || row.slug]))
  if (error) {
    console.error('[expo2026] products', error.message)
    return { products: [], curated: false }
  }
  if (selection.error) console.error('[expo2026] expo selection', selection.error.message)
  const picks = selection.error ? [] : (selection.data || []) as Array<{ product_id: string; sort_order: number; note: string | null }>
  const rank = new Map(picks.map((pick, index) => [pick.product_id, { index, note: pick.note }]))

  const all: ExpoProduct[] = (data || []).map((product) => {
    const local = findCatalogProductByAny({ slug: product.slug, name: product.name })
    const exact = localCatalogProducts.find((item) => item.slug === product.slug) || local
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand || exact?.brand || '',
      category: exact?.cat || (product.category_slug ? categoryName.get(product.category_slug) || product.category_slug : '') || 'სიახლეები',
      description: (product.short_desc || exact?.description || '').slice(0, 180),
      image: product.images?.[0] || exact?.img || null,
      note: rank.get(product.id)?.note || null,
    }
  })
  const chosen = all.filter((product) => rank.has(product.id))
    .sort((a, b) => (rank.get(a.id)?.index ?? 0) - (rank.get(b.id)?.index ?? 0))
  return chosen.length ? { products: chosen, curated: true } : { products: all, curated: false }
}

export default async function Expo2026Page() {
  const { products, curated } = await loadProducts()

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/" className={styles.brand}>MEDICAL LINE <span>GEORGIA</span></Link>
          <nav className={styles.topNav} aria-label="Expo ნავიგაცია">
            <a href="#catalog" className={styles.hideMobile}>კატალოგი</a>
            <Link href="/clinic">ჩემი კაბინეტი</Link>
            <Link href="/warranty" className={styles.hideMobile}>გარანტია</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={styles.eyebrow}>MEDICAL LINE GEORGIA · სტენდი F4</div>
          <h1>GDDA DENTAL EXPO 2026</h1>
          <div className={styles.heroLine} />
          <p>აღმოაჩინეთ სტომატოლოგიური აპარატურა, გაეცანით ტექნიკურ მონაცემებს და მოითხოვეთ პერსონალური საგამოფენო შეთავაზება.</p>
          <div className={styles.heroMeta}><span>13–15 ნოემბერი</span><span>Hualing Plaza · თბილისი</span><span>სტენდი F4</span></div>
          <div className={styles.heroActions}>
            <a className={styles.btn} href="#catalog">კატალოგის ნახვა</a>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/clinic">ექიმის კაბინეტი</Link>
          </div>
        </div>
      </section>

      <main className={`${styles.wrap} ${styles.main}`}>
        <InstallHint />
        <div className={styles.steps}>
          <div className={styles.step}><b>01</b><h3>აირჩიეთ პროდუქტები</h3><p>კატალოგი ყველასთვის ღიაა. მონიშნეთ ერთი ან რამდენიმე პროდუქტი და რაოდენობა.</p></div>
          <div className={styles.step}><b>02</b><h3>დაადასტურეთ ნომერი</h3><p>SMS კოდით. თუ უკვე დარეგისტრირებული ხართ, შეხვალთ თქვენს არსებულ კაბინეტში.</p></div>
          <div className={styles.step}><b>03</b><h3>მიიღეთ შეთავაზება</h3><p>მენეჯერი ფასს ინდივიდუალურად ამტკიცებს და გამოგიგზავნით ერთჯერად დაცულ ბმულს.</p></div>
        </div>

        <section id="catalog">
          <div className={styles.head}>
            <div>
              <h2>{curated ? 'Expo 2026 კატალოგი' : 'პროდუქციის კატალოგი'}</h2>
              <p>{curated ? 'პროდუქტები, რომლებსაც სტენდ F4-ზე წარმოვადგენთ. ' : ''}ფასები არ ქვეყნდება — სპეციალურ ფასს მენეჯერი გიგზავნით პირადად.</p>
            </div>
          </div>
          {products.length ? <ExpoCatalog products={products} curated={curated} /> : <p className={styles.muted}>კატალოგი დროებით მიუწვდომელია. დაგვიკავშირდით: +995 514 011 116</p>}
        </section>
      </main>
    </div>
  )
}
