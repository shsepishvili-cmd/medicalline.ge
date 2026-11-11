'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Copy, ExternalLink, MessageCircle, Phone, Plus, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  collapseDatabaseProducts,
  findDatabaseProductMatch,
  inferBrand,
  localCatalogProducts,
  mapCategoryToSlug,
  specsArrayToRecord,
} from '../../lib/catalogSync'

type Offer = {
  id: string
  token: string
  product_name: string
  client_name: string | null
  client_phone: string | null
  price_gel: number | null
  status: string
  views_count: number
  expires_at: string | null
  created_at: string
}

function dedupeProductList<T extends { slug?: string; name?: string }>(list: T[]) {
  const seen = new Set<string>()
  return list.filter((item) => {
    const key = (item.slug || item.name || '').toString().trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function offerUrl(token: string) {
  if (typeof window === 'undefined') return `/offer/${token}`
  return `${window.location.origin}/offer/${token}`
}

function money(value: unknown) {
  const amount = Number(value || 0)
  return amount > 0 ? `₾${amount.toLocaleString('ka-GE')}` : 'ფასი შეთანხმებით'
}

function offerBrand(product: { slug?: string; name?: string }) {
  const key = `${product.slug || ''} ${product.name || ''}`.toLowerCase()
  if (key.includes('finscan')) return 'FinScan'
  return inferBrand(product)
}

export default function AdminOffersPage() {
  const [products, setProducts] = useState<any[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [selectedProductKey, setSelectedProductKey] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCatalog, setShowCatalog] = useState(true)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [priceGel, setPriceGel] = useState('')
  const [installmentMonths, setInstallmentMonths] = useState('12')
  const [warrantyNote, setWarrantyNote] = useState('გარანტია: 12 თვე ოფიციალური სერვისით')
  const [deliveryNote, setDeliveryNote] = useState('მიწოდება/მონტაჟი შეთანხმებით')
  const [customNote, setCustomNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiedToken, setCopiedToken] = useState('')
  const [smsBusyId, setSmsBusyId] = useState('')
  const [whatsAppBusyId, setWhatsAppBusyId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const selectedProduct = useMemo(
    () => products.find((product) => (product.dbId || product.id) === selectedProductKey) || null,
    [products, selectedProductKey],
  )

  const categories = useMemo(() => Array.from(new Set(products.map((p) => String(p.category_label || p.category_slug || 'სხვა')))).sort((a, b) => a.localeCompare(b, 'ka')), [products])

  const filteredProducts = useMemo(() => {
    const normalize = (value: unknown) => String(value || '').toLocaleLowerCase().normalize('NFKC').replace(/[\\s_–—-]+/g, '')
    const terms = search.trim().toLocaleLowerCase().split(/\\s+/).filter(Boolean).map(normalize)
    return products.filter((product) => {
      if (categoryFilter !== 'all' && String(product.category_label || product.category_slug || 'სხვა') !== categoryFilter) return false
      const haystack = normalize([product.name, product.slug, product.brand, product.category_label, product.category_slug, product.sku, product.code, product.model, product.short_desc].filter(Boolean).join(' '))
      return terms.every((term) => haystack.includes(term))
    })
  }, [products, search, categoryFilter])

  async function authHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Admin session ვერ მოიძებნა. თავიდან შედი /admin გვერდზე.')
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    }
  }

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [dbProducts, headers] = await Promise.all([
        supabase.from('products').select('*, prices(*)').order('sort_order'),
        authHeaders(),
      ])

      if (dbProducts.error) throw dbProducts.error

      const canonicalDbProducts = collapseDatabaseProducts(dbProducts.data || [])
      const matchedIds = new Set<string>()
      const mergedProducts = localCatalogProducts.map((item) => {
        const dbMatch = findDatabaseProductMatch(canonicalDbProducts, item)
        if (dbMatch?.id) matchedIds.add(dbMatch.id)
        return {
          id: dbMatch?.id || `catalog-${item.slug}`,
          dbId: dbMatch?.id || null,
          slug: item.slug,
          name: item.name,
          category_slug: mapCategoryToSlug(item.cat),
          category_label: item.cat,
          brand: offerBrand(item),
          short_desc: item.description,
          specs: specsArrayToRecord(item.specs),
          images: [item.img],
          prices: dbMatch?.prices || [],
          sort_order: item.id,
        }
      })
      const dbOnlyProducts = canonicalDbProducts.filter((item: any) => !matchedIds.has(item.id))
      const nextProducts = dedupeProductList([...mergedProducts, ...dbOnlyProducts])
      setProducts(nextProducts)
      const requestedProductSlug = new URLSearchParams(window.location.search).get('product') || ''
      const requestedProduct = requestedProductSlug
        ? nextProducts.find((product: any) => (
          product.slug === requestedProductSlug ||
          String(product.slug || '').toLowerCase() === requestedProductSlug.toLowerCase()
        ))
        : null
      const defaultProduct = requestedProduct || nextProducts[0]
      if (requestedProduct) {
        setSelectedProductKey(requestedProduct.dbId || requestedProduct.id)
        setPriceGel(String(requestedProduct.prices?.[0]?.price_gel || ''))
        setSearch('')
      } else if (!selectedProductKey && defaultProduct) {
        setSelectedProductKey(defaultProduct.dbId || defaultProduct.id)
        setPriceGel(String(defaultProduct.prices?.[0]?.price_gel || ''))
      }

      const response = await fetch('/api/admin/offers', { headers, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'შეთავაზებები ვერ ჩაიტვირთა.')
      setOffers(payload.offers || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'ჩატვირთვის შეცდომა')
    } finally {
      setLoading(false)
    }
  }

  async function createOffer() {
    if (!selectedProduct) {
      setError('აირჩიე პროდუქტი.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const headers = await authHeaders()
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product: selectedProduct,
          clientName,
          clientPhone,
          priceGel: priceGel ? Number(priceGel) : null,
          installmentMonths: Number(installmentMonths || 12),
          warrantyNote,
          deliveryNote,
          customNote,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'შეთავაზება ვერ შეიქმნა.')

      setOffers((prev) => [payload.offer, ...prev])
      setMessage('შეთავაზება შენახულია. გაგზავნისთვის აირჩიე SMS ან WhatsApp.')
      setCustomNote('')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'შენახვის შეცდომა')
    } finally {
      setSaving(false)
    }
  }

  async function copyOffer(token: string) {
    const url = offerUrl(token)
    await navigator.clipboard?.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(''), 1800)
  }

  async function updateStatus(id: string, status: string) {
    try {
      const headers = await authHeaders()
      const response = await fetch('/api/admin/offers', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, status }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'სტატუსი ვერ შეიცვალა.')
      setOffers((prev) => prev.map((offer) => offer.id === id ? payload.offer : offer))
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'სტატუსის შეცდომა')
    }
  }

  async function sendOfferSms(offer: Offer, options?: { quiet?: boolean }) {
    setSmsBusyId(offer.id)
    if (!options?.quiet) {
      setError('')
      setMessage('')
    }
    try {
      const headers = await authHeaders()
      const response = await fetch(`/api/admin/offers/${offer.id}/sms`, {
        method: 'POST',
        headers,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'SMS ვერ გაიგზავნა.')

      if (payload.smsSent) {
        setMessage(`SMS გაიგზავნა: ${offer.client_phone || ''}${payload.smsMessageId ? ` · ID ${payload.smsMessageId}` : ''}`)
        setOffers((prev) => prev.map((item) => item.id === offer.id ? { ...item, status: item.status === 'draft' ? 'sent' : item.status, expires_at: item.expires_at || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() } : item))
        return
      }

      if (payload.smsText) {
        await navigator.clipboard?.writeText(payload.smsText)
      }
      setMessage('GOSMS ჯერ არ არის ჩართული. SMS ტექსტი დაკოპირდა ხელით გასაგზავნად.')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'SMS გაგზავნის შეცდომა')
    } finally {
      setSmsBusyId('')
    }
  }

  async function sendOfferWhatsApp(offer: Offer) {
    if (!offer.client_phone) { setError('მიუთითე კლიენტის ტელეფონი.'); return }
    setWhatsAppBusyId(offer.id)
    setError('')
    try {
      // Open the window immediately on the click to avoid popup blockers.
      const popup = window.open('about:blank', '_blank')
      const headers = await authHeaders()
      const response = await fetch('/api/admin/offers', {
        method: 'PATCH', headers, body: JSON.stringify({ id: offer.id, action: 'send_whatsapp' }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'WhatsApp-ის გაგზავნა ვერ მომზადდა.')
      const phone = (offer.client_phone || '').replace(/\\D/g, '').replace(/^0/, '995')
      const url = `https://wa.me/${phone}?text=${messageText(offer)}`
      if (popup) popup.location.href = url
      else window.location.href = url
      setOffers((prev) => prev.map((item) => item.id === offer.id ? payload.offer : item))
      setMessage('WhatsApp გაიხსნა. შეტყობინების გაგზავნა დაადასტურე WhatsApp-ში. 72 საათი ითვლება გახსნის მომენტიდან.')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'WhatsApp-ის შეცდომა')
    } finally {
      setWhatsAppBusyId('')
    }
  }

  function messageText(offer: Offer) {
    return encodeURIComponent(
      `გამარჯობა${offer.client_name ? `, ${offer.client_name}` : ''}. გიგზავნით Medical Line-ის შეთავაზებას ${offer.product_name}-ზე: ${offerUrl(offer.token)}`,
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f7f4', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Link href="/admin" style={{ color: '#085041', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>← Admin</Link>
            <h1 style={{ margin: '8px 0 4px', fontSize: 28, color: '#101828' }}>შეთავაზებები</h1>
            <p style={{ margin: 0, color: '#667085', fontSize: 14 }}>პროდუქტის ლინკი კლიენტისთვის: SMS, WhatsApp ან კოპირება.</p>
          </div>
          <button onClick={loadData} style={{ border: '1px solid #d0d5dd', background: '#fff', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
            განახლება
          </button>
        </div>

        {error && <div style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: 8, padding: 12, marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 8, padding: 12, marginBottom: 12 }}>{message}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, .85fr) 1.15fr', gap: 14, alignItems: 'start' }}>
          <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#e2f4ed', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>ახალი შეთავაზება</h2>
                <p style={{ margin: '3px 0 0', color: '#667085', fontSize: 12 }}>აირჩიე აპარატი და შეავსე პირობა.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <input aria-label="პროდუქტის ძებნა" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="მოძებნე დასახელებით, მოდელით ან ბრენდით..." style={{ flex: '1 1 220px', minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd' }} />
              <button type="button" onClick={() => { setSearch(''); setCategoryFilter('all') }} style={{ border: '1px solid #d0d5dd', borderRadius: 8, background: '#fff', padding: '8px 10px', cursor: 'pointer' }}>გასუფთავება</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <select aria-label="კატეგორია" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ flex: 1, minWidth: 0, padding: '10px', borderRadius: 8, border: '1px solid #d0d5dd' }}>
                <option value="all">ყველა კატეგორია</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <button type="button" onClick={() => setShowCatalog((value) => !value)} style={{ border: '1px solid #d0d5dd', background: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer' }}>{showCatalog ? 'სიის დამალვა' : 'კატალოგის ნახვა'}</button>
            </div>
            <p style={{ fontSize: 12, color: '#667085', margin: '0 0 8px' }}>ნაპოვნია {filteredProducts.length} / {products.length} პროდუქტი</p>
            {showCatalog && <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #e4e7ec', borderRadius: 10, marginBottom: 12 }}>
              {filteredProducts.length === 0 && <p style={{ padding: 12, fontSize: 13, color: '#667085' }}>პროდუქტი ვერ მოიძებნა. სცადე სხვა დასახელება ან გაასუფთავე ფილტრები.</p>}
              {filteredProducts.map((product) => {
                const key = product.dbId || product.id
                const imageUrl = product.images?.[0] || product.image || product.img
                return <button type="button" key={key} onClick={() => {
                  setSelectedProductKey(key)
                  setPriceGel(String(product.prices?.[0]?.price_gel || ''))
                }} style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center', padding: 9, cursor: 'pointer', border: 'none', borderBottom: '1px solid #eef2f0', background: selectedProductKey === key ? '#eaf5f1' : '#fff' }}>
                  <div style={{ width: 58, height: 58, flexShrink: 0, background: '#f2f4f7', borderRadius: 8, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                    {imageUrl ? <img src={imageUrl} alt={product.name || 'პროდუქტი'} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 10, color: '#667085' }}>ფოტო არ არის</span>}
                  </div>
                  <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, color: '#101828' }}>{product.name}</strong><span style={{ display: 'block', fontSize: 11, color: '#667085', marginTop: 3 }}>{product.brand || ''} · {product.category_label || product.category_slug || ''}</span></span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#085041' }}>{selectedProductKey === key ? '✓ არჩეულია' : 'არჩევა'}</span>
                </button>
              })}
            </div>}

            {selectedProduct && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f8faf9', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} alt="" style={{ width: 58, height: 58, objectFit: 'contain', background: '#fff', borderRadius: 8 }} />}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{selectedProduct.name}</p>
                  <p style={{ margin: '4px 0 0', color: '#667085', fontSize: 12 }}>{selectedProduct.brand} · {selectedProduct.category_slug}</p>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="კლიენტის სახელი" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd' }} />
              <input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="ტელეფონი" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd' }} />
              <input type="number" value={priceGel} onChange={(event) => setPriceGel(event.target.value)} placeholder="ფასი ₾" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd' }} />
              <input type="number" value={installmentMonths} onChange={(event) => setInstallmentMonths(event.target.value)} placeholder="თვე" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd' }} />
              <input value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} placeholder="მიწოდება" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd' }} />
            </div>
            <input value={warrantyNote} onChange={(event) => setWarrantyNote(event.target.value)} placeholder="გარანტია" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd', marginTop: 8 }} />
            <textarea value={customNote} onChange={(event) => setCustomNote(event.target.value)} placeholder="ინდივიდუალური შენიშვნა..." rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d5dd', marginTop: 8, resize: 'vertical' }} />

            <button onClick={createOffer} disabled={saving || loading} style={{ marginTop: 12, width: '100%', border: 'none', borderRadius: 8, padding: '13px 14px', background: '#085041', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Send size={17} /> {saving ? 'იქმნება...' : 'შეთავაზების მომზადება'}
            </button>
          </section>

          <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eef2f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>ბოლო შეთავაზებები</h2>
              <span style={{ color: '#667085', fontSize: 12 }}>{offers.length} ჩანაწერი</span>
            </div>

            {loading ? (
              <p style={{ padding: 20, color: '#667085' }}>იტვირთება...</p>
            ) : offers.length === 0 ? (
              <p style={{ padding: 20, color: '#667085' }}>ჯერ შეთავაზება არ არის.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {offers.map((offer) => (
                  <div key={offer.id} style={{ padding: 14, borderTop: '1px solid #f2f4f2', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontWeight: 800, color: '#101828' }}>{offer.product_name}</p>
                        <span style={{ borderRadius: 999, padding: '3px 8px', background: offer.status === 'viewed' ? '#e2f4ed' : offer.status === 'accepted' ? '#ecfdf5' : '#f2f4f7', color: offer.status === 'accepted' ? '#047857' : '#344054', fontSize: 11, fontWeight: 800 }}>
                          {offer.status}
                        </span>
                      </div>
                      <p style={{ margin: '5px 0 0', color: '#667085', fontSize: 12 }}>
                        {offer.client_name || 'კლიენტი'} · {offer.client_phone || 'ტელეფონის გარეშე'} · {money(offer.price_gel)} · ნახვა: {offer.views_count || 0}
                      </p>
                      <p style={{ margin: '4px 0 0', color: '#98a2b3', fontSize: 11 }}>
                        {new Date(offer.created_at).toLocaleString('ka-GE')}
                        {offer.expires_at ? ` · ვადა ${new Date(offer.expires_at).toLocaleDateString('ka-GE')}` : ''}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button title="ლინკის კოპირება" onClick={() => copyOffer(offer.token)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #d0d5dd', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                        {copiedToken === offer.token ? <CheckCircle2 size={16} color="#047857" /> : <Copy size={16} />}
                      </button>
                      <a title="გახსნა" href={offerUrl(offer.token)} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #d0d5dd', background: '#fff', color: '#101828', display: 'grid', placeItems: 'center' }}>
                        <ExternalLink size={16} />
                      </a>
                      <button type="button" title="WhatsApp-ით გაგზავნა" onClick={() => sendOfferWhatsApp(offer)} disabled={whatsAppBusyId === offer.id || offer.status === 'archived' || offer.status === 'expired'} style={{ minHeight: 34, borderRadius: 8, border: '1px solid #b7ead9', background: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
                        <MessageCircle size={16} /> {whatsAppBusyId === offer.id ? 'მზადდება...' : 'WhatsApp გაგზავნა'}
                      </button>
                      <button title="GOSMS SMS" onClick={() => sendOfferSms(offer)} disabled={smsBusyId === offer.id || offer.status === 'archived' || offer.status === 'expired'} style={{ minHeight: 34, borderRadius: 8, border: '1px solid #d0d5dd', background: smsBusyId === offer.id ? '#f2f4f7' : '#f9fafb', color: '#344054', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
                        <Phone size={14} /> {smsBusyId === offer.id ? 'იგზავნება...' : 'SMS გაგზავნა'}
                      </button>
                      {offer.status !== 'accepted' && (
                        <button onClick={() => updateStatus(offer.id, 'accepted')} style={{ border: 'none', borderRadius: 8, padding: '9px 10px', background: '#085041', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>
                          მიიღო
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
