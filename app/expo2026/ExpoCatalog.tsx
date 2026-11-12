'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import { SmsSignInModal } from '@/app/components/expo/SmsSignIn'
import styles from './expo.module.css'

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

export type ExpoProduct = { id: string; slug: string; name: string; brand: string; category: string; description: string; image: string | null; note?: string | null }

const PENDING_KEY = 'ml-expo2026-request'
const TIMELINES = [['now', 'ახლავე'], ['within_1_month', '1 თვის განმავლობაში'], ['within_1_3_months', '1–3 თვეში'], ['later', 'მოგვიანებით']]
const PAYMENTS = [['full', 'სრული გადახდა'], ['bank_installment', 'საბანკო განვადება'], ['medical_line_installment', 'Medical Line-ის განვადება'], ['advance_and_balance', 'ავანსი + დარჩენილი']]
const ALL = 'ყველა'

type Draft = { cart: Record<string, number>; note: string; timeline: string; payment: string }

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) as Draft : null
  } catch {
    return null
  }
}

function Photo({ product, sizes, priority = false }: { product: ExpoProduct; sizes: string; priority?: boolean }) {
  if (!product.image) return <span className={styles.noPhoto}>ფოტო მალე დაემატება</span>
  return (
    <div className={styles.photoInner}>
      {canOptimize(product.image)
        ? <Image src={product.image} alt={product.name} fill sizes={sizes} quality={80} priority={priority} />
        : <img src={product.image} alt={product.name} loading={priority ? 'eager' : 'lazy'} />}
    </div>
  )
}

// Horizontal swipe slider: native scroll-snap (smooth on iPhone and Android),
// dots that follow the swipe, arrows on larger screens.
function Slider({ children, count, label, className = '' }: { children: ReactNode; count: number; label: string; className?: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const onScroll = useCallback(() => {
    const el = track.current
    if (!el || !el.firstElementChild) return
    const width = (el.firstElementChild as HTMLElement).offsetWidth + 14
    setIndex(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / width))))
  }, [count])
  const go = (next: number) => {
    const el = track.current
    const target = el?.children[Math.max(0, Math.min(count - 1, next))] as HTMLElement | undefined
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }
  return (
    <div className={`${styles.slider} ${className}`} aria-roledescription="carousel" aria-label={label}>
      <div ref={track} className={styles.track} onScroll={onScroll}>{children}</div>
      {count > 1 ? (
        <>
          <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} aria-label="წინა" disabled={index === 0} onClick={() => go(index - 1)}>‹</button>
          <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} aria-label="შემდეგი" disabled={index >= count - 1} onClick={() => go(index + 1)}>›</button>
          <div className={styles.dots}>
            {Array.from({ length: count }, (_, i) => (
              <button key={i} type="button" aria-label={`სლაიდი ${i + 1}`} className={`${styles.dot} ${i === index ? styles.dotActive : ''}`} onClick={() => go(i)} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

// Open catalogue: anyone can browse; asking for a price needs an SMS-verified
// account, and no price is ever shown here.
export function ExpoCatalog({ products, curated = false }: { products: ExpoProduct[]; curated?: boolean }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [timeline, setTimeline] = useState('within_1_month')
  const [payment, setPayment] = useState('full')
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState(ALL)
  const [detail, setDetail] = useState<ExpoProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [signIn, setSignIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [bump, setBump] = useState(0)

  useEffect(() => {
    const draft = readDraft()
    const requestedSlug = new URLSearchParams(window.location.search).get('product')
    const selectedProduct = requestedSlug ? products.find((product) => product.slug === requestedSlug) : undefined

    // Preserve an existing Expo draft and preselect the product opened from
    // its permanent catalogue/QR page. Never add a product not in Expo.
    const nextCart: Record<string, number> = draft
      ? Object.fromEntries(Object.entries(draft.cart).filter(([id]) => products.some((product) => product.id === id)))
      : {}
    if (selectedProduct) nextCart[selectedProduct.id] = Math.max(1, nextCart[selectedProduct.id] || 0)
    if (draft || selectedProduct) setCart(nextCart)
    if (draft) {
      setNote(draft.note); setTimeline(draft.timeline); setPayment(draft.payment)
    }
    if (selectedProduct) setCartOpen(true)
  }, [products])

  // No background scrolling behind an open sheet (iPhone included).
  useEffect(() => {
    const open = !!detail || cartOpen
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [detail, cartOpen])

  const categories = useMemo(() => [ALL, ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))], [products])
  const featured = useMemo(() => {
    const marked = products.filter((product) => product.note)
    return (marked.length ? marked : products).slice(0, 6)
  }, [products])

  const searching = filter.trim() !== '' || category !== ALL
  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return products.filter((product) => (category === ALL || product.category === category)
      && (!query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query)))
  }, [filter, category, products])
  const sections = useMemo(() => categories.filter((name) => name !== ALL)
    .map((name) => ({ name, items: products.filter((product) => product.category === name) }))
    .filter((section) => section.items.length), [categories, products])

  const lines = Object.entries(cart).filter(([, quantity]) => quantity > 0)
  const total = lines.reduce((sum, [, quantity]) => sum + quantity, 0)

  function change(id: string, delta: number) {
    setDone(false)
    if (delta > 0) setBump((value) => value + 1)
    setCart((current) => ({ ...current, [id]: Math.max(0, Math.min(50, (current[id] || 0) + delta)) }))
  }

  async function submit(accessToken?: string) {
    setError('')
    if (!lines.length) { setError('აირჩიეთ მინიმუმ ერთი პროდუქტი.'); return }
    // Keep the visitor's selection and show verification even if reading the
    // locally cached auth session fails (for example, blocked browser storage).
    let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null
    try {
      const result = await supabase.auth.getSession()
      session = result.data.session
    } catch (cause) {
      console.error('[expo2026] session read failed', cause)
    }
    // Only a real string token counts; never trust whatever a caller passed in.
    const selectedToken = (typeof accessToken === 'string' && accessToken) || session?.access_token || ''
    // A stale or corrupted local session must never be sent to the server.
    // Preserve the requested products and offer a fresh SMS verification.
    if (selectedToken.split('.').length !== 3) {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ cart, note, timeline, payment }))
      if (session) await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      setCartOpen(false)
      setSignIn(true)
      setError('საჭიროა SMS-ით ხელახლა შესვლა. არჩეული პროდუქტები შენახულია.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/price-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${selectedToken}` },
        body: JSON.stringify({ items: lines.map(([productId, quantity]) => ({ productId, quantity })), note, source: 'EXPO2026', purchaseTimeline: timeline, paymentMethod: payment }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ cart, note, timeline, payment }))
        setCartOpen(false)
        setSignIn(true)
        setError(payload.error || 'ხელახლა გაიარეთ SMS-ით შესვლა.')
        return
      }
      if (response.status === 403) {
        // Signed in with a password account whose phone was never confirmed.
        setError(payload.error || 'საჭიროა ტელეფონის დადასტურება.')
        setSignIn(true)
        return
      }
      if (!response.ok) { setError(payload.error || 'მოთხოვნა ვერ გაიგზავნა.'); return }
      window.sessionStorage.removeItem(PENDING_KEY)
      setCart({}); setNote(''); setDone(true); setCartOpen(true)
    } catch (cause) {
      console.error('[expo2026] price request failed', cause)
      setError('კავშირის შეცდომა. სცადეთ თავიდან.')
    } finally {
      setBusy(false)
    }
  }

  const addButton = (product: ExpoProduct, large = false) => {
    const quantity = cart[product.id] || 0
    return quantity ? (
      <div className={`${styles.qty} ${large ? styles.qtyLarge : ''}`}>
        <button type="button" aria-label="შემცირება" onClick={() => change(product.id, -1)}>−</button>
        <span>{quantity}</span>
        <button type="button" aria-label="გაზრდა" onClick={() => change(product.id, 1)}>+</button>
      </div>
    ) : (
      <button type="button" className={`${styles.btn} ${large ? '' : styles.btnLight}`} onClick={() => change(product.id, 1)}>+ ფასის მოთხოვნაში</button>
    )
  }

  const card = (product: ExpoProduct) => {
    const quantity = cart[product.id] || 0
    return (
      <article key={product.id} className={`${styles.card} ${quantity ? styles.cardSelected : ''}`}>
        <button type="button" className={styles.photo} onClick={() => setDetail(product)} aria-label={`${product.name} — დეტალები`}>
          <Photo product={product} sizes="(max-width: 760px) 75vw, 280px" />
          {quantity ? <span className={styles.inCart}>✓ {quantity}</span> : null}
        </button>
        <div className={styles.cardBody}>
          <small>{product.brand} · {product.category}</small>
          {product.note ? <span className={styles.badge}>{product.note}</span> : null}
          <h3><button type="button" className={styles.titleBtn} onClick={() => setDetail(product)}>{product.name}</button></h3>
          <p>{product.description}</p>
          {addButton(product)}
        </div>
      </article>
    )
  }

  return (
    <div className={styles.layout}>
      <div style={{ minWidth: 0 }}>
        {!searching && featured.length > 1 ? (
          <>
            <h3 className={styles.railTitle}>{curated ? 'გამორჩეული Expo-ზე' : 'გამორჩეული'}</h3>
            <Slider count={featured.length} label="გამორჩეული პროდუქტები" className={styles.featured}>
              {featured.map((product, index) => (
                <div key={product.id} className={styles.slide}>
                  <button type="button" className={styles.slidePhoto} onClick={() => setDetail(product)} aria-label={`${product.name} — დეტალები`}>
                    <Photo product={product} sizes="(max-width: 760px) 92vw, 420px" priority={index === 0} />
                  </button>
                  <div className={styles.slideBody}>
                    <small>{product.brand} · {product.category}</small>
                    {product.note ? <span className={styles.badge}>{product.note}</span> : null}
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className={styles.slideActions}>
                      {addButton(product)}
                      <button type="button" className={styles.linkBtn} onClick={() => setDetail(product)}>დეტალურად →</button>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </>
        ) : null}

        <input className={styles.search} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="მოძებნეთ პროდუქტი, ბრენდი ან კატეგორია" aria-label="ძებნა" enterKeyHint="search" />
        {categories.length > 2 ? (
          <div className={styles.chips} role="tablist" aria-label="კატეგორიები">
            {categories.map((name) => (
              <button key={name} type="button" role="tab" aria-selected={category === name} className={`${styles.chip} ${category === name ? styles.chipActive : ''}`} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>
        ) : null}

        {searching || sections.length < 2 ? (
          <>
            <div className={`${styles.grid} ${styles.gridResults}`}>{visible.map(card)}</div>
            {!visible.length ? <p className={styles.muted}>ვერაფერი მოიძებნა.</p> : null}
          </>
        ) : sections.map((section) => (
          <section key={section.name} className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.railTitle}>{section.name} <span>{section.items.length}</span></h3>
              <button type="button" className={styles.linkBtn} onClick={() => setCategory(section.name)}>ყველა →</button>
            </div>
            <div className={styles.rail}>{section.items.map(card)}</div>
          </section>
        ))}
      </div>

      {cartOpen ? <div className={styles.sheetBackdropMobile} onClick={() => setCartOpen(false)} aria-hidden="true" /> : null}
      <aside className={`${styles.cart} ${cartOpen ? styles.cartOpen : ''}`} aria-label="ფასის მოთხოვნა">
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.cartHead}>
          <h3>ფასის მოთხოვნა · {total} ც.</h3>
          <button type="button" className={styles.sheetClose} onClick={() => setCartOpen(false)} aria-label="დახურვა">✕</button>
        </div>
        {lines.length ? lines.map(([id, quantity]) => (
          <div key={id} className={styles.cartRow}>
            <span>{products.find((product) => product.id === id)?.name}</span>
            <span className={styles.qty}>
              <button type="button" aria-label="შემცირება" onClick={() => change(id, -1)}>−</button>
              <span>{quantity}</span>
              <button type="button" aria-label="გაზრდა" onClick={() => change(id, 1)}>+</button>
            </span>
          </div>
        )) : done ? null : <p className={styles.muted}>აირჩიეთ პროდუქტები კატალოგიდან.</p>}
        {done ? <p className={styles.notice}>მოთხოვნა მიღებულია. მენეჯერი განიხილავს და შეთავაზებას გამოგიგზავნით SMS-ით. სტატუსი ჩანს <Link href="/clinic">კაბინეტში</Link>.</p> : null}
        {lines.length ? (
          <>
            <label className={styles.field}>შეძენის სავარაუდო ვადა
              <select value={timeline} onChange={(event) => setTimeline(event.target.value)}>{TIMELINES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className={styles.field}>სასურველი გადახდა
              <select value={payment} onChange={(event) => setPayment(event.target.value)}>{PAYMENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className={styles.field}>შენიშვნა
              <textarea rows={3} maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="კომპლექტაცია, მიწოდება, სხვა დეტალები" />
            </label>
          </>
        ) : null}
        <div className={styles.row}><button type="button" className={styles.btn} disabled={busy || !lines.length} onClick={() => void submit()}>{busy ? 'იგზავნება...' : 'მოითხოვე სპეციალური ფასი'}</button></div>
        <p className={styles.muted} style={{ marginTop: 10 }}>ფასს მენეჯერი ინდივიდუალურად ამტკიცებს. შეთავაზებას მიიღებთ SMS-ით, ერთჯერადი დაცული ბმულით.</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </aside>

      {total > 0 && !cartOpen ? (
        <button key={bump} type="button" className={styles.bottomBar} onClick={() => setCartOpen(true)}>
          <span className={styles.bottomCount}>{total}</span>
          <span>ფასის მოთხოვნა</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : null}

      {detail ? (
        <div className={styles.sheetBackdrop} onClick={() => setDetail(null)}>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={detail.name} onClick={(event) => event.stopPropagation()}>
            <div className={styles.grabber} aria-hidden="true" />
            <button type="button" className={styles.sheetClose} onClick={() => setDetail(null)} aria-label="დახურვა">✕</button>
            <div className={styles.sheetPhoto}><Photo product={detail} sizes="(max-width: 760px) 100vw, 520px" priority /></div>
            <small className={styles.muted}>{detail.brand} · {detail.category}</small>
            {detail.note ? <div><span className={styles.badge}>{detail.note}</span></div> : null}
            <h2 className={styles.sheetTitle}>{detail.name}</h2>
            {detail.description ? <p className={styles.sheetText}>{detail.description}</p> : null}
            <p className={styles.muted}>ფასი ინდივიდუალურია — დაამატეთ მოთხოვნაში და მენეჯერი გამოგიგზავნით სპეციალურ შეთავაზებას.</p>
            <div className={styles.sheetActions}>
              {addButton(detail, true)}
              {(cart[detail.id] || 0) > 0 ? <button type="button" className={`${styles.btn} ${styles.btnLight}`} onClick={() => setDetail(null)}>კატალოგში დაბრუნება</button> : null}
            </div>
          </div>
        </div>
      ) : null}

      {signIn ? (
        <SmsSignInModal
          intro="ფასის მოთხოვნისთვის დაადასტურეთ ნომერი. დარეგისტრირებული ექიმი შევა თავის არსებულ კაბინეტში."
          onCancel={() => setSignIn(false)}
          onSignedIn={(accessToken) => { setSignIn(false); void submit(accessToken) }}
        />
      ) : null}
    </div>
  )
}
