'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'
import { PhotoReplace, QuickAddProduct } from '@/app/admin/expo2026/QuickAddProduct'
import { localCatalogProducts, type LocalCatalogProduct } from '@/app/lib/catalogSync'
import { builtInCatalogRow, builtInImages } from '@/app/lib/catalog-corrections'
import styles from '@/app/expo2026/expo.module.css'

type DbProduct = {
  id: string; slug: string; name: string; brand: string | null; category_slug: string | null; short_desc: string | null
  specs: Record<string, string> | null; images: string[] | null; is_active: boolean; show_in_catalog: boolean | null
  quick_added: boolean | null; catalog_override: boolean | null; catalog_hidden: boolean | null; created_at: string
}
type Category = { slug: string; name_ka: string | null }
type Draft = { name: string; brand: string; category: string; description: string; specs: string }
type Panel = { id: string; kind: 'edit' | 'photo' } | null

const specsText = (specs: DbProduct['specs']) => Object.values(specs || {}).join('\n')
const specsRecord = (text: string) => Object.fromEntries(text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim().slice(0, 140)).filter(Boolean).slice(0, 15).map((line, index) => [`Feature ${index + 1}`, line]))
const clean = (value: string, max: number) => value.replace(/\s+/g, ' ').trim().slice(0, max)
const MIGRATION_57 = 'კორექციისთვის ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/57_catalog_corrections.sql.'

const fieldStyle = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: '1px solid #dce5ef', borderRadius: 8, font: 'inherit', fontSize: 13, boxSizing: 'border-box' as const }

function Thumb({ src }: { src?: string | null }) {
  return (
    <div style={{ width: 72, height: 72, flex: '0 0 72px', borderRadius: 10, background: '#f0f4fa', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null}
    </div>
  )
}

function EditForm({ draft, setDraft, categories, busy, onCancel, onSave, showCategory = true }: { draft: Draft; setDraft: (draft: Draft) => void; categories: Category[]; busy: boolean; onCancel: () => void; onSave: () => void; showCategory?: boolean }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label className={styles.field}>დასახელება<input style={fieldStyle} value={draft.name} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className={styles.field}>ბრენდი<input style={fieldStyle} value={draft.brand} maxLength={60} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /></label>
      {showCategory ? (
        <label className={styles.field}>კატეგორია
          <select style={fieldStyle} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            <option value="">— არ მივუთითებ —</option>
            {categories.map((row) => <option key={row.slug} value={row.slug}>{row.name_ka || row.slug}</option>)}
          </select>
        </label>
      ) : null}
      <label className={styles.field}>აღწერა<textarea style={fieldStyle} rows={4} value={draft.description} maxLength={1200} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label className={styles.field}>მახასიათებლები (თითო ხაზზე ერთი)<textarea style={fieldStyle} rows={5} value={draft.specs} maxLength={2500} onChange={(event) => setDraft({ ...draft, specs: event.target.value })} /></label>
      <div className={styles.row}>
        <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={onCancel}>გაუქმება</button>
        <button type="button" className={styles.btn} disabled={busy} onClick={onSave}>შენახვა</button>
      </div>
    </div>
  )
}

// Products in the admin panel. "New products" are added here and live only
// in the database. "Site catalogue" are the products built into the site
// code: corrections are stored in the database and shown instead of the
// original, which "restore original" brings back.
export default function AdminProductsPage() {
  const { loading, error: gateError, profile, accessToken } = useWarrantyAdminGate()
  const [tab, setTab] = useState<'new' | 'builtin'>('new')
  const [rows, setRows] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expoIds, setExpoIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [draft, setDraft] = useState<Draft>({ name: '', brand: '', category: '', description: '', specs: '' })
  const [showHidden, setShowHidden] = useState(false)
  const [search, setSearch] = useState('')
  const [hasCorrections, setHasCorrections] = useState(true)
  const isAdmin = profile?.role === 'admin'

  const load = useCallback(async () => {
    const full = 'id, slug, name, brand, category_slug, short_desc, specs, images, is_active, show_in_catalog, quick_added, catalog_override, catalog_hidden, created_at'
    const [p, c, e] = await Promise.all([
      supabase.from('products').select(full).order('created_at', { ascending: false })
        .then(async (result) => {
          if (!result.error) return result
          setHasCorrections(false)
          return supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, specs, images, is_active, show_in_catalog, quick_added, created_at').order('created_at', { ascending: false })
        }),
      supabase.from('categories').select('slug, name_ka').order('sort_order'),
      supabase.from('expo_catalog_items').select('product_id'),
    ])
    if (p.error) setError(/quick_added|show_in_catalog/.test(p.error.message) ? 'ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/56_quick_catalog_products.sql.' : p.error.message)
    setRows((p.data || []) as DbProduct[])
    setCategories((c.data || []) as Category[])
    setExpoIds(new Set(((e.data || []) as Array<{ product_id: string }>).map((row) => row.product_id)))
  }, [])

  useEffect(() => { if (isAdmin) void load() }, [isAdmin, load])

  const categoryName = useMemo(() => new Map(categories.map((row) => [row.slug, row.name_ka || row.slug])), [categories])
  const added = rows.filter((row) => row.quick_added)
  const visibleAdded = added.filter((row) => showHidden || row.is_active)
  const hiddenAdded = added.filter((row) => !row.is_active).length
  const bySlug = useMemo(() => new Map(rows.map((row) => [row.slug, row])), [rows])
  const builtIn = useMemo(() => {
    const query = search.trim().toLowerCase()
    return localCatalogProducts.filter((product) => !query || `${product.name} ${product.cat} ${product.brand || ''}`.toLowerCase().includes(query))
  }, [search])
  const correctedCount = localCatalogProducts.filter((product) => bySlug.get(product.slug)?.catalog_override || bySlug.get(product.slug)?.catalog_hidden).length

  async function run(id: string, action: () => PromiseLike<{ error: { message: string } | null }>, done: string) {
    setSaving(id); setError(''); setMessage('')
    const { error: failure } = await action()
    setSaving('')
    if (failure) setError(/catalog_override|catalog_hidden/.test(failure.message) ? MIGRATION_57 : failure.message)
    else { setMessage(done); setPanel(null) }
    await load()
  }

  // ---- admin-added products
  function editAdded(row: DbProduct) {
    setPanel({ id: row.id, kind: 'edit' })
    setDraft({ name: row.name, brand: row.brand || '', category: row.category_slug || '', description: row.short_desc || '', specs: specsText(row.specs) })
  }
  async function saveAdded(row: DbProduct) {
    const name = clean(draft.name, 120); const brand = clean(draft.brand, 60)
    if (name.length < 2 || !brand) { setError('დასახელება და ბრენდი სავალდებულოა.'); return }
    await run(row.id, () => supabase.from('products').update({
      name, brand, category_slug: draft.category || null, short_desc: clean(draft.description, 1200) || null, specs: specsRecord(draft.specs),
    }).eq('id', row.id), `„${name}“ შენახულია. საიტზე დაახლოებით 1 წუთში განახლდება.`)
  }
  async function toggleExpo(row: DbProduct) {
    if (expoIds.has(row.id)) {
      await run(row.id, () => supabase.from('expo_catalog_items').delete().eq('product_id', row.id), `„${row.name}“ Expo-დან მოიხსნა.`)
      return
    }
    const { data: last } = await supabase.from('expo_catalog_items').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    await run(row.id, () => supabase.from('expo_catalog_items').insert({ product_id: row.id, sort_order: ((last as { sort_order?: number } | null)?.sort_order ?? 0) + 10, note: 'სიახლე' }), `„${row.name}“ Expo-ზე დაემატა.`)
  }

  // ---- built-in catalogue corrections
  function shownFor(product: LocalCatalogProduct) {
    const row = bySlug.get(product.slug)
    const corrected = !!row?.catalog_override
    return {
      row, corrected, hidden: !!row?.catalog_hidden,
      name: corrected ? row!.name : product.name,
      image: corrected && row!.images?.length ? row!.images[0] : builtInImages(product)[0],
    }
  }
  function editBuiltIn(product: LocalCatalogProduct) {
    const { row, corrected } = shownFor(product)
    setPanel({ id: product.slug, kind: 'edit' })
    setDraft(corrected && row
      ? { name: row.name, brand: row.brand || '', category: '', description: row.short_desc || '', specs: specsText(row.specs) }
      : { name: product.name, brand: builtInCatalogRow(product).brand, category: '', description: product.description, specs: (product.specs || []).join('\n') })
  }
  // Writes the correction; the first one also copies the original photos so
  // only what was edited changes on the page.
  function writeBuiltIn(product: LocalCatalogProduct, fields: Record<string, unknown>) {
    const row = bySlug.get(product.slug)
    if (row) return supabase.from('products').update(fields).eq('id', row.id)
    return supabase.from('products').insert({ ...builtInCatalogRow(product), is_active: true, ...fields })
  }
  async function saveBuiltIn(product: LocalCatalogProduct) {
    const name = clean(draft.name, 120); const brand = clean(draft.brand, 60)
    if (name.length < 2 || !brand) { setError('დასახელება და ბრენდი სავალდებულოა.'); return }
    const row = bySlug.get(product.slug)
    const images = row?.catalog_override && row.images?.length ? row.images : builtInImages(product)
    await run(product.slug, () => writeBuiltIn(product, {
      name, brand, short_desc: clean(draft.description, 1200) || null, specs: specsRecord(draft.specs), images, catalog_override: true,
    }), `„${name}“ შესწორდა. საიტზე დაახლოებით 1 წუთში განახლდება.`)
  }
  async function restoreBuiltIn(product: LocalCatalogProduct) {
    if (!window.confirm(`„${product.name}“ დაუბრუნდეს ორიგინალ ტექსტსა და ფოტოს?`)) return
    const { slug: _slug, ...original } = builtInCatalogRow(product)
    void _slug
    await run(product.slug, () => writeBuiltIn(product, { ...original, catalog_override: false, catalog_hidden: false }), `„${product.name}“ ორიგინალს დაუბრუნდა.`)
  }
  async function setBuiltInHidden(product: LocalCatalogProduct, hidden: boolean) {
    if (hidden && !window.confirm(`„${product.name}“ კატალოგიდან დაიმალოს?`)) return
    await run(product.slug, () => writeBuiltIn(product, { catalog_hidden: hidden }), hidden ? `„${product.name}“ კატალოგიდან დაიმალა.` : `„${product.name}“ კატალოგში დაბრუნდა.`)
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (gateError || !profile || !accessToken) return <AuthBlockedView message={gateError || 'წვდომა აკრძალულია.'} />
  if (!isAdmin) return <AuthBlockedView message="ეს გვერდი მხოლოდ ადმინისთვისაა." />

  const photoDone = (label: string) => () => { setPanel(null); setMessage(`„${label}“ — ფოტო შეიცვალა. საიტზე დაახლოებით 1 წუთში განახლდება.`); void load() }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/admin" className={styles.brand}>MEDICAL LINE <span>GEORGIA</span> · პროდუქცია</Link>
          <nav className={styles.topNav}>
            <button type="button" className={styles.linkBtn} style={{ color: tab === 'new' ? '#d72c47' : undefined }} onClick={() => { setTab('new'); setPanel(null) }}>ახალი პროდუქტები ({added.filter((row) => row.is_active).length})</button>
            <button type="button" className={styles.linkBtn} style={{ color: tab === 'builtin' ? '#d72c47' : undefined }} onClick={() => { setTab('builtin'); setPanel(null) }}>საიტის კატალოგი ({localCatalogProducts.length})</button>
            <Link href="/catalog" target="_blank">კატალოგი ↗</Link>
          </nav>
        </div>
      </header>
      <main className={`${styles.wrap} ${styles.main}`} style={{ maxWidth: 820 }}>
        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.notice}>{message}</p> : null}

        {tab === 'new' ? (
          <>
            <p className={styles.muted} style={{ marginTop: 0 }}>
              აქ დამატებული პროდუქტი ინახება ბაზაში და ჩანს მთავარ კატალოგში, ექიმის კაბინეტში და ფასის მოთხოვნებში. ფასს არ ვწერთ — ფასი ინდივიდუალურად იგზავნება შეთავაზებით.
            </p>
            <QuickAddProduct accessToken={accessToken} categories={categories} defaults={{ inCatalog: true, inExpo: false, note: '' }}
              onAdded={(name, where) => { setMessage(`„${name}“ დაემატა${where.inCatalog ? ' მთავარ კატალოგს' : ''}${where.inExpo ? (where.inCatalog ? ' და Expo-ს' : ' Expo-ს') : ''}. საიტზე დაახლოებით 1 წუთში გამოჩნდება.`); void load() }} />

            <div className={styles.head} style={{ marginTop: 26 }}>
              <div><h2 style={{ fontSize: 20 }}>ადმინიდან დამატებული ({visibleAdded.length})</h2></div>
              {hiddenAdded ? <button type="button" className={styles.linkBtn} onClick={() => setShowHidden((value) => !value)}>{showHidden ? 'მოხსნილების დამალვა' : `მოხსნილების ჩვენება (${hiddenAdded})`}</button> : null}
            </div>

            {visibleAdded.map((row) => (
              <div key={row.id} className={styles.step} style={{ marginBottom: 10, padding: 14, opacity: saving === row.id ? 0.5 : row.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Thumb src={row.images?.[0]} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ color: '#102952' }}>{row.name}</b>
                    <div className={styles.muted}>{row.brand || ''}{row.category_slug ? ` · ${categoryName.get(row.category_slug) || row.category_slug}` : ''}{row.is_active ? '' : ' · მოხსნილია'}</div>
                    {row.is_active && row.show_in_catalog ? <a className={styles.muted} href={`/catalog/${row.slug}`} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>/catalog/{row.slug}</a> : null}
                  </div>
                </div>
                {panel?.id === row.id && panel.kind === 'edit' ? (
                  <EditForm draft={draft} setDraft={setDraft} categories={categories} busy={!!saving} onCancel={() => setPanel(null)} onSave={() => saveAdded(row)} />
                ) : panel?.id === row.id && panel.kind === 'photo' ? (
                  <PhotoReplace accessToken={accessToken} target={{ productId: row.id }} onCancel={() => setPanel(null)} onDone={photoDone(row.name)} />
                ) : (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                    {row.is_active ? <>
                      <label className={styles.check} style={{ marginTop: 0, fontSize: 13 }}><input type="checkbox" disabled={!!saving} checked={!!row.show_in_catalog} onChange={(event) => run(row.id, () => supabase.from('products').update({ show_in_catalog: event.target.checked }).eq('id', row.id), event.target.checked ? `„${row.name}“ კატალოგში ჩაირთო.` : `„${row.name}“ კატალოგიდან მოიხსნა.`)} /> კატალოგი</label>
                      <label className={styles.check} style={{ marginTop: 0, fontSize: 13 }}><input type="checkbox" disabled={!!saving} checked={expoIds.has(row.id)} onChange={() => toggleExpo(row)} /> Expo</label>
                      <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => editAdded(row)}>რედაქტირება</button>
                      <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => setPanel({ id: row.id, kind: 'photo' })}>ფოტოს შეცვლა</button>
                      <button type="button" className={styles.linkBtn} style={{ color: '#a12238', fontWeight: 400 }} disabled={!!saving}
                        onClick={() => { if (window.confirm(`„${row.name}“ საიტიდან მოიხსნას?`)) void run(row.id, () => supabase.from('products').update({ is_active: false }).eq('id', row.id), `„${row.name}“ მოიხსნა. საჭიროების შემთხვევაში დააბრუნებთ.`) }}>საიტიდან მოხსნა</button>
                    </> : (
                      <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => run(row.id, () => supabase.from('products').update({ is_active: true }).eq('id', row.id), `„${row.name}“ დაბრუნდა.`)}>დაბრუნება</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!visibleAdded.length ? <p className={styles.muted}>ჯერ არცერთი პროდუქტი არ დაგიმატებიათ. დააჭირეთ ზემოთ წითელ ღილაკს.</p> : null}
          </>
        ) : (
          <>
            <p className={styles.muted} style={{ marginTop: 0 }}>
              საიტზე ჩაშენებული პროდუქტები. შესწორება (ტექსტი, მახასიათებლები, ფოტო) ინახება ბაზაში და საიტზე ჩანს ორიგინალის ნაცვლად; „ორიგინალზე დაბრუნება“ ყველაფერს აღადგენს. შესწორებულია: {correctedCount}.
            </p>
            {!hasCorrections ? <p className={styles.error}>{MIGRATION_57}</p> : null}
            <input className={styles.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ძებნა: პროდუქტი, ბრენდი ან კატეგორია" />
            {builtIn.map((product) => {
              const shown = shownFor(product)
              return (
                <div key={product.slug} className={styles.step} style={{ marginBottom: 10, padding: 14, opacity: saving === product.slug ? 0.5 : shown.hidden ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Thumb src={shown.image} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b style={{ color: '#102952' }}>{shown.name}</b>
                      <div className={styles.muted}>{product.cat}{shown.corrected ? ' · შესწორებულია' : ''}{shown.hidden ? ' · დამალულია' : ''}</div>
                      {!shown.hidden ? <a className={styles.muted} href={`/catalog/${product.slug}`} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>/catalog/{product.slug}</a> : null}
                    </div>
                  </div>
                  {panel?.id === product.slug && panel.kind === 'edit' ? (
                    <EditForm draft={draft} setDraft={setDraft} categories={categories} busy={!!saving} showCategory={false} onCancel={() => setPanel(null)} onSave={() => saveBuiltIn(product)} />
                  ) : panel?.id === product.slug && panel.kind === 'photo' ? (
                    <PhotoReplace accessToken={accessToken} target={{ slug: product.slug }} onCancel={() => setPanel(null)} onDone={photoDone(shown.name)} />
                  ) : (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                      <button type="button" className={styles.linkBtn} disabled={!!saving || !hasCorrections} onClick={() => editBuiltIn(product)}>შესწორება</button>
                      <button type="button" className={styles.linkBtn} disabled={!!saving || !hasCorrections} onClick={() => setPanel({ id: product.slug, kind: 'photo' })}>ფოტოს შეცვლა</button>
                      {shown.hidden
                        ? <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => setBuiltInHidden(product, false)}>კატალოგში დაბრუნება</button>
                        : <button type="button" className={styles.linkBtn} style={{ color: '#a12238', fontWeight: 400 }} disabled={!!saving || !hasCorrections} onClick={() => setBuiltInHidden(product, true)}>დამალვა</button>}
                      {shown.corrected ? <button type="button" className={styles.linkBtn} style={{ fontWeight: 400 }} disabled={!!saving} onClick={() => restoreBuiltIn(product)}>ორიგინალზე დაბრუნება</button> : null}
                    </div>
                  )}
                </div>
              )
            })}
            {!builtIn.length ? <p className={styles.muted}>ვერაფერი მოიძებნა.</p> : null}
          </>
        )}
      </main>
    </div>
  )
}
