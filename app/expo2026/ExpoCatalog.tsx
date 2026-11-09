'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { SmsSignInModal } from '@/app/components/expo/SmsSignIn'
import styles from './expo.module.css'
import Image from 'next/image'

// Site photos and admin uploads (Supabase Storage) go through Next image
// optimisation: some originals are 8000px wide, far too heavy for expo Wi-Fi.
// Any other host falls back to a plain <img>, which next/image would reject.
const STORAGE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host } catch { return '' }
})()
function canOptimize(src: string) {
  if (src.startsWith('/')) return true
  try { return !!STORAGE_HOST && new URL(src).host === STORAGE_HOST } catch { return false }
}

export type ExpoProduct = { id: string; name: string; brand: string; category: string; description: string; image: string | null; note?: string | null }

const PENDING_KEY = 'ml-expo2026-request'
const TIMELINES = [['now', 'ახლავე'], ['within_1_month', '1 თვის განმავლობაში'], ['within_1_3_months', '1–3 თვეში'], ['later', 'მოგვიანებით']]
const PAYMENTS = [['full', 'სრული გადახდა'], ['bank_installment', 'საბანკო განვადება'], ['medical_line_installment', 'Medical Line-ის განვადება'], ['advance_and_balance', 'ავანსი + დარჩენილი']]

type Draft = { cart: Record<string, number>; note: string; timeline: string; payment: string }

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) as Draft : null
  } catch {
    return null
  }
}

// Open catalogue: anyone can browse; asking for a price needs an SMS-verified
// account, and no price is ever shown here.
export function ExpoCatalog({ products }: { products: ExpoProduct[] }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [timeline, setTimeline] = useState('within_1_month')
  const [payment, setPayment] = useState('full')
  const [filter, setFilter] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const draft = readDraft()
    if (!draft) return
    setCart(Object.fromEntries(Object.entries(draft.cart).filter(([id]) => products.some((product) => product.id === id))))
    setNote(draft.note); setTimeline(draft.timeline); setPayment(draft.payment)
  }, [products])

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return query ? products.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query)) : products
  }, [filter, products])

  const lines = Object.entries(cart).filter(([, quantity]) => quantity > 0)
  const total = lines.reduce((sum, [, quantity]) => sum + quantity, 0)

  function change(id: string, delta: number) {
    setDone(false)
    setCart((current) => ({ ...current, [id]: Math.max(0, Math.min(50, (current[id] || 0) + delta)) }))
  }

  async function submit() {
    setError('')
    if (!lines.length) { setError('აირჩიეთ მინიმუმ ერთი პროდუქტი.'); return }
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ cart, note, timeline, payment }))
      setSignIn(true)
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/price-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ items: lines.map(([productId, quantity]) => ({ productId, quantity })), note, source: 'EXPO2026', purchaseTimeline: timeline, paymentMethod: payment }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 403) {
        // Signed in with a password account whose phone was never confirmed.
        setError(payload.error || 'საჭიროა ტელეფონის დადასტურება.')
        setSignIn(true)
        return
      }
      if (!response.ok) { setError(payload.error || 'მოთხოვნა ვერ გაიგზავნა.'); return }
      window.sessionStorage.removeItem(PENDING_KEY)
      setCart({}); setNote(''); setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.layout}>
      <div>
        <input className={styles.search} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="მოძებნეთ პროდუქტი, ბრენდი ან კატეგორია" aria-label="ძებნა" />
        <div className={styles.grid}>
          {visible.map((product) => {
            const quantity = cart[product.id] || 0
            return (
              <article key={product.id} className={`${styles.card} ${quantity ? styles.cardSelected : ''}`}>
                <div className={styles.photo}>
                  {product.image ? (
                    <div className={styles.photoInner}>
                      {canOptimize(product.image)
                        ? <Image src={product.image} alt={product.name} fill sizes="(max-width: 520px) 90vw, 280px" quality={80} />
                        : <img src={product.image} alt={product.name} loading="lazy" />}
                    </div>
                  ) : <span className={styles.noPhoto}>ფოტო მალე დაემატება</span>}
                </div>
                <div className={styles.cardBody}>
                  <small>{product.brand} · {product.category}</small>
                  {product.note ? <span className={styles.badge}>{product.note}</span> : null}
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  {quantity ? (
                    <div className={styles.qty}>
                      <button type="button" aria-label="შემცირება" onClick={() => change(product.id, -1)}>−</button>
                      <span>{quantity}</span>
                      <button type="button" aria-label="გაზრდა" onClick={() => change(product.id, 1)}>+</button>
                    </div>
                  ) : (
                    <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={() => change(product.id, 1)}>+ ფასის მოთხოვნაში</button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
        {!visible.length ? <p className={styles.muted}>ვერაფერი მოიძებნა.</p> : null}
      </div>

      <aside className={styles.cart} aria-label="ფასის მოთხოვნა">
        <h3>ფასის მოთხოვნა · {total} ც.</h3>
        {lines.length ? lines.map(([id, quantity]) => (
          <div key={id} className={styles.cartRow}><span>{products.find((product) => product.id === id)?.name}</span><b>× {quantity}</b></div>
        )) : <p className={styles.muted}>აირჩიეთ პროდუქტები კატალოგიდან.</p>}
        <label className={styles.field}>შეძენის სავარაუდო ვადა
          <select value={timeline} onChange={(event) => setTimeline(event.target.value)}>{TIMELINES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        <label className={styles.field}>სასურველი გადახდა
          <select value={payment} onChange={(event) => setPayment(event.target.value)}>{PAYMENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        <label className={styles.field}>შენიშვნა
          <textarea rows={3} maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="კომპლექტაცია, მიწოდება, სხვა დეტალები" />
        </label>
        <div className={styles.row}><button type="button" className={styles.btn} disabled={busy || !lines.length} onClick={submit}>{busy ? 'იგზავნება...' : 'მოითხოვე სპეციალური ფასი'}</button></div>
        <p className={styles.muted} style={{ marginTop: 10 }}>ფასს მენეჯერი ინდივიდუალურად ამტკიცებს. შეთავაზებას მიიღებთ SMS-ით, ერთჯერადი დაცული ბმულით.</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {done ? <p className={styles.notice}>მოთხოვნა მიღებულია. მენეჯერი განიხილავს და შეთავაზებას გამოგიგზავნით. სტატუსი ჩანს <Link href="/clinic">კაბინეტში</Link>.</p> : null}
      </aside>

      {signIn ? (
        <SmsSignInModal
          intro="ფასის მოთხოვნისთვის დაადასტურეთ ნომერი. დარეგისტრირებული ექიმი შევა თავის არსებულ კაბინეტში."
          onCancel={() => setSignIn(false)}
          onSignedIn={() => { setSignIn(false); void submit() }}
        />
      ) : null}
    </div>
  )
}
