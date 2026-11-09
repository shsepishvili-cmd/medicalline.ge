'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'
import { QuickAddProduct } from '@/app/admin/expo2026/QuickAddProduct'
import styles from '@/app/expo2026/expo.module.css'

type Product = {
  id: string; slug: string; name: string; brand: string | null; category_slug: string | null; short_desc: string | null
  specs: Record<string, string> | null; images: string[] | null; is_active: boolean; show_in_catalog: boolean; created_at: string
}
type Category = { slug: string; name_ka: string | null }
type Draft = { name: string; brand: string; category: string; description: string; specs: string }

const specsText = (specs: Product['specs']) => Object.values(specs || {}).join('\n')
const specsRecord = (text: string) => Object.fromEntries(text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim().slice(0, 140)).filter(Boolean).slice(0, 15).map((line, index) => [`Feature ${index + 1}`, line]))

// Products added from the admin panel: they live in the products table, so
// they show in the main catalogue, the clinic portal and price requests.
// The 86 products built into the site code are not edited here.
export default function AdminProductsPage() {
  const { loading, error: gateError, profile, accessToken } = useWarrantyAdminGate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expoIds, setExpoIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ name: '', brand: '', category: '', description: '', specs: '' })
  const [showHidden, setShowHidden] = useState(false)
  const isAdmin = profile?.role === 'admin'

  const load = useCallback(async () => {
    const [p, c, e] = await Promise.all([
      supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, specs, images, is_active, show_in_catalog, created_at').eq('quick_added', true).order('created_at', { ascending: false }),
      supabase.from('categories').select('slug, name_ka').order('sort_order'),
      supabase.from('expo_catalog_items').select('product_id'),
    ])
    if (p.error) setError(/quick_added|show_in_catalog/.test(p.error.message) ? 'ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/56_quick_catalog_products.sql.' : p.error.message)
    setProducts((p.data || []) as Product[])
    setCategories((c.data || []) as Category[])
    setExpoIds(new Set(((e.data || []) as Array<{ product_id: string }>).map((row) => row.product_id)))
  }, [])

  useEffect(() => { if (isAdmin) void load() }, [isAdmin, load])

  const categoryName = useMemo(() => new Map(categories.map((row) => [row.slug, row.name_ka || row.slug])), [categories])
  const visible = products.filter((product) => showHidden || product.is_active)
  const hiddenCount = products.filter((product) => !product.is_active).length

  async function run(id: string, action: () => PromiseLike<{ error: { message: string } | null }>, done: string) {
    setSaving(id); setError(''); setMessage('')
    const { error: failure } = await action()
    setSaving('')
    if (failure) setError(failure.message)
    else setMessage(done)
    await load()
  }

  function startEdit(product: Product) {
    setEditing(product.id)
    setDraft({ name: product.name, brand: product.brand || '', category: product.category_slug || '', description: product.short_desc || '', specs: specsText(product.specs) })
  }

  async function saveEdit(product: Product) {
    const name = draft.name.replace(/\s+/g, ' ').trim().slice(0, 120)
    const brand = draft.brand.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (name.length < 2 || !brand) { setError('დასახელება და ბრენდი სავალდებულოა.'); return }
    await run(product.id, () => supabase.from('products').update({
      name, brand, category_slug: draft.category || null,
      short_desc: draft.description.replace(/\s+/g, ' ').trim().slice(0, 600) || null,
      specs: specsRecord(draft.specs),
    }).eq('id', product.id), `„${name}“ შენახულია. საიტზე დაახლოებით 1 წუთში განახლდება.`)
    setEditing(null)
  }

  async function toggleExpo(product: Product) {
    if (expoIds.has(product.id)) {
      await run(product.id, () => supabase.from('expo_catalog_items').delete().eq('product_id', product.id), `„${product.name}“ Expo-დან მოიხსნა.`)
      return
    }
    const { data: last } = await supabase.from('expo_catalog_items').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    await run(product.id, () => supabase.from('expo_catalog_items').insert({ product_id: product.id, sort_order: ((last as { sort_order?: number } | null)?.sort_order ?? 0) + 10, note: 'სიახლე' }), `„${product.name}“ Expo-ზე დაემატა.`)
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (gateError || !profile || !accessToken) return <AuthBlockedView message={gateError || 'წვდომა აკრძალულია.'} />
  if (!isAdmin) return <AuthBlockedView message="ეს გვერდი მხოლოდ ადმინისთვისაა." />

  const input = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: '1px solid #dce5ef', borderRadius: 8, font: 'inherit', fontSize: 13, boxSizing: 'border-box' as const }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/admin" className={styles.brand}>MEDICAL LINE <span>GEORGIA</span> · პროდუქცია</Link>
          <nav className={styles.topNav}>
            <Link href="/catalog" target="_blank">კატალოგი ↗</Link>
            <Link href="/admin/expo2026">Expo 2026</Link>
          </nav>
        </div>
      </header>
      <main className={`${styles.wrap} ${styles.main}`} style={{ maxWidth: 820 }}>
        <p className={styles.muted} style={{ marginTop: 0 }}>
          აქ დამატებული პროდუქტი ინახება ბაზაში და ჩანს მთავარ კატალოგში, ექიმის კაბინეტში და ფასის მოთხოვნებში. ფასს არ ვწერთ — ფასი ინდივიდუალურად იგზავნება შეთავაზებით.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.notice}>{message}</p> : null}

        <QuickAddProduct accessToken={accessToken} categories={categories} defaults={{ inCatalog: true, inExpo: false, note: '' }}
          onAdded={(name, where) => { setMessage(`„${name}“ დაემატა${where.inCatalog ? ' მთავარ კატალოგს' : ''}${where.inExpo ? (where.inCatalog ? ' და Expo-ს' : ' Expo-ს') : ''}. საიტზე დაახლოებით 1 წუთში გამოჩნდება.`); void load() }} />

        <div className={styles.head} style={{ marginTop: 26 }}>
          <div><h2 style={{ fontSize: 20 }}>ადმინიდან დამატებული ({visible.length})</h2></div>
          {hiddenCount ? <button type="button" className={styles.linkBtn} onClick={() => setShowHidden((value) => !value)}>{showHidden ? 'მოხსნილების დამალვა' : `მოხსნილების ჩვენება (${hiddenCount})`}</button> : null}
        </div>

        {visible.map((product) => (
          <div key={product.id} className={styles.step} style={{ marginBottom: 10, padding: 14, opacity: saving === product.id ? 0.5 : product.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 72, height: 72, flex: '0 0 72px', borderRadius: 10, background: '#f0f4fa', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                {product.images?.[0] ? <img src={product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <b style={{ color: '#102952' }}>{product.name}</b>
                <div className={styles.muted}>{product.brand || ''}{product.category_slug ? ` · ${categoryName.get(product.category_slug) || product.category_slug}` : ''}{product.is_active ? '' : ' · მოხსნილია'}</div>
                {product.is_active && product.show_in_catalog ? <a className={styles.muted} href={`/catalog/${product.slug}`} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>/catalog/{product.slug}</a> : null}
              </div>
            </div>

            {editing === product.id ? (
              <div style={{ marginTop: 10 }}>
                <label className={styles.field}>დასახელება<input style={input} value={draft.name} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                <label className={styles.field}>ბრენდი<input style={input} value={draft.brand} maxLength={60} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /></label>
                <label className={styles.field}>კატეგორია
                  <select style={input} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                    <option value="">— არ მივუთითებ —</option>
                    {categories.map((row) => <option key={row.slug} value={row.slug}>{row.name_ka || row.slug}</option>)}
                  </select>
                </label>
                <label className={styles.field}>მოკლე აღწერა<textarea style={input} rows={3} value={draft.description} maxLength={600} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <label className={styles.field}>მახასიათებლები (თითო ხაზზე ერთი)<textarea style={input} rows={4} value={draft.specs} maxLength={2000} onChange={(event) => setDraft({ ...draft, specs: event.target.value })} /></label>
                <div className={styles.row}>
                  <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={() => setEditing(null)}>გაუქმება</button>
                  <button type="button" className={styles.btn} disabled={!!saving} onClick={() => saveEdit(product)}>შენახვა</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                {product.is_active ? <>
                  <label className={styles.check} style={{ marginTop: 0, fontSize: 13 }}><input type="checkbox" disabled={!!saving} checked={product.show_in_catalog} onChange={(event) => run(product.id, () => supabase.from('products').update({ show_in_catalog: event.target.checked }).eq('id', product.id), event.target.checked ? `„${product.name}“ კატალოგში ჩაირთო.` : `„${product.name}“ კატალოგიდან მოიხსნა.`)} /> კატალოგი</label>
                  <label className={styles.check} style={{ marginTop: 0, fontSize: 13 }}><input type="checkbox" disabled={!!saving} checked={expoIds.has(product.id)} onChange={() => toggleExpo(product)} /> Expo</label>
                  <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => startEdit(product)}>რედაქტირება</button>
                  <button type="button" className={styles.linkBtn} style={{ color: '#a12238', fontWeight: 400 }} disabled={!!saving}
                    onClick={() => { if (window.confirm(`„${product.name}“ საიტიდან მოიხსნას?`)) void run(product.id, () => supabase.from('products').update({ is_active: false }).eq('id', product.id), `„${product.name}“ მოიხსნა. საჭიროების შემთხვევაში დააბრუნებთ.`) }}>საიტიდან მოხსნა</button>
                </> : (
                  <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => run(product.id, () => supabase.from('products').update({ is_active: true }).eq('id', product.id), `„${product.name}“ დაბრუნდა.`)}>დაბრუნება</button>
                )}
              </div>
            )}
          </div>
        ))}
        {!visible.length ? <p className={styles.muted}>ჯერ არცერთი პროდუქტი არ დაგიმატებიათ. დააჭირეთ ზემოთ წითელ ღილაკს.</p> : null}
      </main>
    </div>
  )
}
