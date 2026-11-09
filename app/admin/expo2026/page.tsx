'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'
import styles from '@/app/expo2026/expo.module.css'
import { QuickAddProduct } from './QuickAddProduct'

type RequestRow = {
  id: string; group_id: string | null; status: string; quantity: number; created_at: string; source: string
  doctor_name_snapshot: string; clinic_name_snapshot: string; phone_snapshot: string; products: { name: string } | null
}
type OutboxRow = { id: string; created_at: string; recipient: string; purpose: string; status: string; attempts: number; last_error: string | null; sent_at: string | null }
type AuditRow = { id: string; created_at: string; actor: string | null; action: string; target_type: string | null; target_id: string | null; details: Record<string, unknown> }
type Conflict = { phone: string; profiles: number }
type CatalogProduct = { id: string; slug: string; name: string; brand: string | null }
type Pick = { product_id: string; sort_order: number; note: string | null }

const CATALOG_HINT = 'Expo კატალოგისთვის გაუშვით supabase/sql/55_expo_catalog.sql.'
const MIGRATION_HINT = 'ბაზა ჯერ არ არის განახლებული: გაუშვით supabase/sql/54_expo2026_integration.sql.'
const STATUS: Record<string, string> = { received: 'ახალი', reviewing: 'განხილვაში', offer_ready: 'შეთავაზება გაგზავნილია', offer_received: 'ექიმმა ნახა', cancelled: 'გაუქმებული', expired: 'ვადაგასული' }
const OUTBOX: Record<string, string> = { queued: 'რიგში', sending: 'იგზავნება', sent: 'გაიგზავნა', failed: 'ვერ გაიგზავნა', cancelled: 'გაუქმდა' }
const PURPOSE: Record<string, string> = { offer_link: 'შეთავაზების ბმული', sms_login: 'შესვლის კოდი' }
const time = (value: string | null) => (value ? new Date(value).toLocaleString('ka-GE') : '—')
const masked = (phone: string) => (phone.length > 6 ? `${phone.slice(0, 5)}***${phone.slice(-2)}` : phone)

export default function Expo2026AdminPage() {
  const { loading, error: gateError, profile, accessToken } = useWarrantyAdminGate()
  const [tab, setTab] = useState<'catalog' | 'requests' | 'messages' | 'audit' | 'conflicts'>('catalog')
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [outbox, setOutbox] = useState<OutboxRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [message, setMessage] = useState('')
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [saving, setSaving] = useState('')
  const [categories, setCategories] = useState<Array<{ slug: string; name_ka: string | null }>>([])
  const [catalogNotice, setCatalogNotice] = useState('')
  const isAdmin = profile?.role === 'admin'

  const load = useCallback(async () => {
    const [r, o, a, c] = await Promise.all([
      supabase.from('special_price_requests').select('id, group_id, status, quantity, created_at, source, doctor_name_snapshot, clinic_name_snapshot, phone_snapshot, products(name)').eq('source', 'EXPO2026').order('created_at', { ascending: false }).limit(500),
      supabase.from('message_outbox').select('id, created_at, recipient, purpose, status, attempts, last_error, sent_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_log').select('id, created_at, actor, action, target_type, target_id, details').order('created_at', { ascending: false }).limit(200),
      supabase.from('phone_identity_conflicts').select('phone, profiles'),
    ])
    const failed = [r.error, o.error, a.error, c.error].find(Boolean)
    if (failed) setMessage(/does not exist|schema cache|column/i.test(failed.message) ? MIGRATION_HINT : failed.message)
    setRequests((r.data || []) as unknown as RequestRow[])
    setOutbox((o.data || []) as OutboxRow[])
    setAudit((a.data || []) as AuditRow[])
    setConflicts((c.data || []) as Conflict[])
  }, [])

  const loadCatalog = useCallback(async () => {
    const [products, selection, cats] = await Promise.all([
      supabase.from('products').select('id, slug, name, brand').eq('is_active', true).order('sort_order'),
      supabase.from('expo_catalog_items').select('product_id, sort_order, note').order('sort_order'),
      supabase.from('categories').select('slug, name_ka').order('sort_order'),
    ])
    setCategories((cats.data || []) as Array<{ slug: string; name_ka: string | null }>)
    setCatalog((products.data || []) as CatalogProduct[])
    setPicks((selection.data || []) as Pick[])
    setCatalogError(selection.error ? (/does not exist|schema cache/i.test(selection.error.message) ? CATALOG_HINT : selection.error.message) : products.error?.message || '')
  }, [])

  useEffect(() => { if (isAdmin) { void load(); void loadCatalog() } }, [isAdmin, load, loadCatalog])

  async function persist(action: () => PromiseLike<{ error: { message: string } | null }>, id: string) {
    setSaving(id); setCatalogError('')
    const { error } = await action()
    setSaving('')
    if (error) setCatalogError(error.message)
    await loadCatalog()
  }
  function addPick(productId: string) {
    const next = picks.length ? Math.max(...picks.map((pick) => pick.sort_order)) + 10 : 10
    return persist(() => supabase.from('expo_catalog_items').insert({ product_id: productId, sort_order: next }), productId)
  }
  function removePick(productId: string) {
    return persist(() => supabase.from('expo_catalog_items').delete().eq('product_id', productId), productId)
  }
  // Quick-added products can be withdrawn entirely; catalogue products only
  // leave the expo selection. Deactivating keeps past price requests intact.
  async function withdrawQuickProduct(product: CatalogProduct) {
    if (!window.confirm(`„${product.name}“ საიტიდან მოიხსნას?`)) return
    setSaving(product.id); setCatalogError('')
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', product.id)
    if (!error) await supabase.from('expo_catalog_items').delete().eq('product_id', product.id)
    setSaving('')
    if (error) setCatalogError(error.message)
    else setCatalogNotice(`„${product.name}“ მოიხსნა.`)
    await loadCatalog()
  }
  function saveNote(pick: Pick, note: string) {
    const clean = note.trim().slice(0, 80) || null
    if (clean === (pick.note || null)) return
    return persist(() => supabase.from('expo_catalog_items').update({ note: clean, updated_at: new Date().toISOString() }).eq('product_id', pick.product_id), pick.product_id)
  }
  // Rewrites every position so ties from earlier edits can never block a move.
  async function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= picks.length) return
    const order = [...picks]
    const [item] = order.splice(index, 1)
    order.splice(target, 0, item)
    setSaving(item.product_id); setCatalogError('')
    const results = await Promise.all(order.map((pick, position) => supabase.from('expo_catalog_items').update({ sort_order: (position + 1) * 10 }).eq('product_id', pick.product_id)))
    setSaving('')
    const failed = results.find((result) => result.error)
    if (failed?.error) setCatalogError(failed.error.message)
    await loadCatalog()
  }

  const groups = useMemo(() => {
    const map = new Map<string, RequestRow[]>()
    for (const row of requests) {
      const key = row.group_id || row.id
      map.set(key, [...(map.get(key) || []), row])
    }
    return [...map.values()]
  }, [requests])

  const catalogById = useMemo(() => new Map(catalog.map((product) => [product.id, product])), [catalog])
  const catalogOthers = useMemo(() => {
    const chosen = new Set(picks.map((pick) => pick.product_id))
    const query = catalogSearch.trim().toLowerCase()
    return catalog.filter((product) => !chosen.has(product.id) && (!query || `${product.name} ${product.brand || ''}`.toLowerCase().includes(query)))
  }, [catalog, picks, catalogSearch])

  async function retry(row: OutboxRow) {
    setMessage('')
    const response = await fetch(`/api/admin/outbox/${row.id}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
    const payload = await response.json().catch(() => ({}))
    setMessage(response.ok ? (payload.sent ? 'შეტყობინება გაიგზავნა.' : 'ხელახლა ვერ გაიგზავნა — ნახეთ შეცდომა.') : payload.error || 'შეცდომა.')
    await load()
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (gateError || !profile || !accessToken) return <AuthBlockedView message={gateError || 'წვდომა აკრძალულია.'} />
  if (!isAdmin) return <AuthBlockedView message="ეს გვერდი მხოლოდ ადმინისთვისაა." />

  const failedCount = outbox.filter((row) => row.status === 'failed').length
  const tabs: Array<[typeof tab, string]> = [
    ['catalog', `Expo კატალოგი (${picks.length})`],
    ['requests', `Expo მოთხოვნები (${groups.length})`],
    ['messages', `SMS${failedCount ? ` · ${failedCount} ჩავარდნილი` : ''}`],
    ['audit', 'აუდიტი'],
    ['conflicts', `ნომრის კონფლიქტები (${conflicts.length})`],
  ]

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/admin" className={styles.brand}>MEDICAL LINE <span>GEORGIA</span> · Expo 2026</Link>
          <nav className={styles.topNav}>
            {tabs.map(([key, label]) => (
              <button key={key} type="button" className={styles.linkBtn} style={{ color: tab === key ? '#d72c47' : undefined }} onClick={() => setTab(key)}>{label}</button>
            ))}
            <Link href="/admin/clinic-offers">შეთავაზებები →</Link>
          </nav>
        </div>
      </header>
      <main className={`${styles.wrap} ${styles.main}`}>
        {message ? <p className={styles.error}>{message}</p> : null}

        {tab === 'catalog' ? (
          <>
            {catalogError ? <p className={styles.error}>{catalogError}</p> : null}
            {catalogNotice ? <p className={styles.notice}>{catalogNotice}</p> : null}
            <QuickAddProduct accessToken={accessToken} categories={categories} onAdded={(name) => { setCatalogNotice(`„${name}“ დაემატა Expo კატალოგს. საიტზე დაახლოებით 1 წუთში გამოჩნდება.`); void loadCatalog() }} />
            <p className={styles.muted}>
              აქ ირჩევთ, რომელი პროდუქტები გამოჩნდეს <Link href="/expo2026" target="_blank">/expo2026</Link>-ზე. ფოტო და აღწერა მთავარი კატალოგიდან მოდის, ფასი არსად ჩანს.
              {picks.length ? ' ცვლილება საიტზე დაახლოებით 1 წუთში ჩანს.' : ' სანამ არაფერია არჩეული, გვერდზე სრული კატალოგი ჩანს.'}
            </p>
            <h3 style={{ color: '#102952', margin: '18px 0 8px' }}>Expo-ზე ნაჩვენები ({picks.length})</h3>
            {picks.map((pick, index) => {
              const product = catalogById.get(pick.product_id)
              return (
                <div key={pick.product_id} className={styles.cartRow} style={{ alignItems: 'center', opacity: saving === pick.product_id ? 0.5 : 1 }}>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <button type="button" className={styles.linkBtn} disabled={!index || !!saving} onClick={() => move(index, -1)} aria-label="ზემოთ">▲</button>
                      <button type="button" className={styles.linkBtn} disabled={index === picks.length - 1 || !!saving} onClick={() => move(index, 1)} aria-label="ქვემოთ">▼</button>
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <b>{product?.name || 'პროდუქტი კატალოგში აღარ არის აქტიური'}</b> <small className={styles.muted}>{product?.brand || ''}</small><br />
                      <input key={`${pick.product_id}-${pick.note || ''}`} defaultValue={pick.note || ''} maxLength={80} placeholder="წარწერა (არასავალდებულო), მაგ.: სტენდზე ცოცხლად" onBlur={(event) => saveNote(pick, event.target.value)} style={{ marginTop: 4, padding: '6px 8px', border: '1px solid #dce5ef', borderRadius: 8, width: '100%', maxWidth: 340, font: 'inherit', fontSize: 12, boxSizing: 'border-box' }} />
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <button type="button" className={styles.linkBtn} style={{ color: '#a12238' }} disabled={!!saving} onClick={() => removePick(pick.product_id)}>ამოღება</button>
                    {product?.slug.startsWith('expo-') ? <button type="button" className={styles.linkBtn} style={{ color: '#a12238', fontWeight: 400, fontSize: 12 }} disabled={!!saving} onClick={() => withdrawQuickProduct(product)}>საიტიდან მოხსნა</button> : null}
                  </span>
                </div>
              )
            })}
            {!picks.length ? <p className={styles.muted}>ჯერ არცერთი პროდუქტი არ არის არჩეული.</p> : null}
            <h3 style={{ color: '#102952', margin: '24px 0 8px' }}>დამატება კატალოგიდან</h3>
            <input className={styles.search} value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="ძებნა: პროდუქტი ან ბრენდი" />
            {catalogOthers.map((product) => (
              <div key={product.id} className={styles.cartRow} style={{ alignItems: 'center', opacity: saving === product.id ? 0.5 : 1 }}>
                <span><b>{product.name}</b> <small className={styles.muted}>{product.brand || ''}</small></span>
                <button type="button" className={styles.linkBtn} disabled={!!saving} onClick={() => addPick(product.id)}>+ დამატება</button>
              </div>
            ))}
          </>
        ) : null}

        {tab === 'requests' ? (
          <>
            <p className={styles.muted}>ფასს და შეთავაზებას ადგენთ „შეთავაზებებში“ — იქ ჯგუფის ყველა პროდუქტი ერთ შეთავაზებაში ჩაჯდება და „SMS ბმული“ ღილაკით გაიგზავნება.</p>
            {groups.length ? groups.map((rows) => (
              <div key={rows[0].group_id || rows[0].id} className={styles.step} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <b style={{ color: '#102952', fontSize: 14 }}>{rows[0].doctor_name_snapshot || '—'} · {rows[0].clinic_name_snapshot || 'კლინიკა არ არის მითითებული'}</b>
                  <span className={styles.muted}>{time(rows[0].created_at)} · {STATUS[rows[0].status] || rows[0].status}</span>
                </div>
                <p>{rows.map((row) => `${row.products?.name || 'პროდუქტი'} × ${row.quantity}`).join(', ')}</p>
                <p className={styles.muted}>{rows[0].phone_snapshot}</p>
              </div>
            )) : <p className={styles.muted}>Expo-დან მოთხოვნა ჯერ არ შემოსულა.</p>}
          </>
        ) : null}

        {tab === 'messages' ? (
          <>
            <p className={styles.muted}>შეტყობინების ტექსტი აქ არ ჩანს: ის ბმულს ან კოდს შეიცავს. გაგზავნის შემდეგ ტექსტი იშლება.</p>
            {outbox.map((row) => (
              <div key={row.id} className={styles.cartRow} style={{ alignItems: 'center' }}>
                <span>{PURPOSE[row.purpose] || row.purpose} → {masked(row.recipient)}<br /><small className={styles.muted}>{time(row.created_at)} · ცდა {row.attempts}{row.last_error ? ` · ${row.last_error}` : ''}</small></span>
                <span>
                  <b style={{ color: row.status === 'failed' ? '#a12238' : '#102952' }}>{OUTBOX[row.status] || row.status}</b>
                  {row.status === 'failed' && !['offer_link', 'sms_login'].includes(row.purpose) ? <> · <button type="button" className={styles.linkBtn} onClick={() => retry(row)}>ხელახლა</button></> : null}
                </span>
              </div>
            ))}
            {!outbox.length ? <p className={styles.muted}>შეტყობინებები ჯერ არ არის.</p> : null}
          </>
        ) : null}

        {tab === 'audit' ? (
          audit.length ? audit.map((row) => (
            <div key={row.id} className={styles.cartRow}>
              <span><b>{row.action}</b> · {row.target_type} {row.target_id ? String(row.target_id).slice(0, 13) : ''}<br /><small className={styles.muted}>{row.actor || ''} {Object.keys(row.details || {}).length ? JSON.stringify(row.details) : ''}</small></span>
              <small className={styles.muted}>{time(row.created_at)}</small>
            </div>
          )) : <p className={styles.muted}>ჩანაწერები ჯერ არ არის.</p>
        ) : null}

        {tab === 'conflicts' ? (
          <>
            <p className={styles.muted}>ეს ნომრები რამდენიმე პროფილზეა მიბმული. ამიტომ SMS-ით შესვლა მათთვის დაბლოკილია, რომ სისტემამ სხვისი ანგარიში არ გახსნას. გააერთიანეთ ან შეასწორეთ პროფილები „მომხმარებლებში“; პაროლით შესვლა ჩვეულებრივ მუშაობს.</p>
            {conflicts.map((row) => <div key={row.phone} className={styles.cartRow}><span>{row.phone}</span><b>{row.profiles} პროფილი</b></div>)}
            {!conflicts.length ? <p className={styles.notice}>კონფლიქტი არ არის.</p> : null}
          </>
        ) : null}
      </main>
    </div>
  )
}
