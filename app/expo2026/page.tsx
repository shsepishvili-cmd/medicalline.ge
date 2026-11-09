import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { buildPageMetadata } from '@/app/lib/seo'
import { findCatalogProductByAny, localCatalogProducts } from '@/app/lib/catalogSync'
import { ExpoCatalog, type ExpoProduct } from './ExpoCatalog'
import styles from './expo.module.css'

export const revalidate = 300

export const metadata = buildPageMetadata({
  path: '/expo2026',
  title: 'GDDA Dental Expo 2026 | Medical Line Georgia',
  description: 'Medical Line Georgia GDDA Dental Expo 2026-ზე: სტომატოლოგიური აპარატურის კატალოგი და პერსონალური საგამოფენო შეთავაზების მოთხოვნა.',
  keywords: ['GDDA Expo 2026', 'სტომატოლოგიური გამოფენა', 'Medical Line Georgia', 'სპეციალური ფასი'],
})

// Products come from the live catalogue (their ids are what a price request
// refers to); photos and descriptions from the site's own verified catalogue
// data. Prices are never selected here.
async function loadProducts(): Promise<ExpoProduct[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!url || !key) return []
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, brand, category_slug, short_desc, images, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) {
    console.error('[expo2026] products', error.message)
    return []
  }
  return (data || []).map((product) => {
    const local = findCatalogProductByAny({ slug: product.slug, name: product.name })
    const exact = localCatalogProducts.find((item) => item.slug === product.slug) || local
    return {
      id: product.id,
      name: product.name,
      brand: product.brand || exact?.brand || '',
      category: exact?.cat || product.category_slug || '',
      description: (product.short_desc || exact?.description || '').slice(0, 180),
      image: product.images?.[0] || exact?.img || null,
    }
  })
}

export default async function Expo2026Page() {
  const products = await loadProducts()

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/" className={styles.brand}>MEDICAL LINE <span>GEORGIA</span></Link>
          <nav className={styles.topNav} aria-label="Expo ნავიგაცია">
            <a href="#catalog">კატალოგი</a>
            <Link href="/clinic">ჩემი კაბინეტი</Link>
            <Link href="/warranty">გარანტია</Link>
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
        <div className={styles.steps}>
          <div className={styles.step}><b>01</b><h3>აირჩიეთ პროდუქტები</h3><p>კატალოგი ყველასთვის ღიაა. მონიშნეთ ერთი ან რამდენიმე პროდუქტი და რაოდენობა.</p></div>
          <div className={styles.step}><b>02</b><h3>დაადასტურეთ ნომერი</h3><p>SMS კოდით. თუ უკვე დარეგისტრირებული ხართ, შეხვალთ თქვენს არსებულ კაბინეტში.</p></div>
          <div className={styles.step}><b>03</b><h3>მიიღეთ შეთავაზება</h3><p>მენეჯერი ფასს ინდივიდუალურად ამტკიცებს და გამოგიგზავნით ერთჯერად დაცულ ბმულს.</p></div>
        </div>

        <section id="catalog">
          <div className={styles.head}>
            <div>
              <h2>პროდუქციის კატალოგი</h2>
              <p>ფასები არ ქვეყნდება — სპეციალურ ფასს მენეჯერი გიგზავნით პირადად.</p>
            </div>
          </div>
          {products.length ? <ExpoCatalog products={products} /> : <p className={styles.muted}>კატალოგი დროებით მიუწვდომელია. დაგვიკავშირდით: +995 514 011 116</p>}
        </section>
      </main>
    </div>
  )
}
