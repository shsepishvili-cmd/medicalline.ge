'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { formatClinicMoney, makeSchedule, offerStatusLabels, requestStatusLabels, type ClinicOffer, type ClinicProduct, type SpecialPriceRequest } from '@/app/lib/clinic-portal-types'

type ProductWithPrices = ClinicProduct & { prices?: Array<{ price_gel: number }> }
type BuilderState = {
  unitPrice: number; discount: number; validUntil: string; advancePercent: number; template: string; installments: number;
  currency: 'GEL' | 'USD' | 'EUR'; paymentTerms: string; deliveryTerms: string; warrantyTerms: string; notes: string; internalNote: string; vatIncluded: boolean; sendNow: boolean
}
type ExtraLine = { productId: string; quantity: number; unitPrice: number; discount: number }
type AdminRequest = SpecialPriceRequest & { legacySource?: boolean }
type LegacyPriceRequest = {
  id: string; user_id: string; product_id: string; status: 'new' | 'inprogress' | 'done' | 'cancelled'; message: string | null;
  admin_note: string | null; created_at: string; updated_at: string; products?: ProductWithPrices | null;
  profiles?: { full_name?: string; clinic_name?: string; city?: string; phone?: string } | null
}

const initialBuilder = (): BuilderState => ({
  unitPrice: 0, discount: 0, validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  advancePercent: 30, template: '30_70', installments: 1, currency: 'GEL', paymentTerms: '30% ავანსი, დარჩენილი თანხა მიწოდებამდე.',
  deliveryTerms: 'მიწოდების ვადა და მონტაჟის დეტალები შეთანხმდება შეკვეთის დადასტურების შემდეგ.', warrantyTerms: 'გარანტიის ვადა და პირობები განისაზღვრება პროდუქტის საგარანტიო დოკუმენტაციით.', notes: '', internalNote: '', vatIncluded: true, sendNow: true,
})

function templateToTerms(template: string) {
  if (template === 'full') return { advance: 0, installments: 1, text: 'სრული გადახდა.' }
  if (template === '30_70') return { advance: 30, installments: 1, text: '30% ავანსი + 70% მიწოდებამდე.' }
  if (template === '30_2') return { advance: 30, installments: 2, text: '30% ავანსი + 2 თვიური გადახდა.' }
  if (template === '30_3') return { advance: 30, installments: 3, text: '30% ავანსი + 3 თვიური გადახდა.' }
  return null
}

export function AdminClinicOffers() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<AdminRequest[]>([])
  const [offers, setOffers] = useState<ClinicOffer[]>([])
  const [products, setProducts] = useState<ProductWithPrices[]>([])
  const [selected, setSelected] = useState<SpecialPriceRequest | null>(null)
  const [builder, setBuilder] = useState<BuilderState>(initialBuilder)
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([])
  const [productToAdd, setProductToAdd] = useState('')
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({})
  const [scheduleAmounts, setScheduleAmounts] = useState<Record<number, number>>({})
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [linkBusy, setLinkBusy] = useState<string | null>(null)

  async function load() {
    const session = (await supabase.auth.getSession()).data.session
    if (!session?.user?.id) { setAllowed(false); setMessage('ადმინის Supabase სესია არ არსებობს. თავიდან შედით ადმინში.'); return }
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', session.user.id).single()
    if (profile?.role !== 'admin' || profile.status !== 'active') { setAllowed(false); setMessage(`მიმდინარე ანგარიში არ არის აქტიური ადმინისტრატორი (role: ${profile?.role || 'უცნობი'}).`); return }
    setAllowed(true)
    const [requestResult, legacyRequestResult, offerResult, productResult] = await Promise.all([
      supabase.from('special_price_requests').select('*, products(id, slug, name, brand, category_slug, short_desc, images, prices(price_gel))').order('created_at', { ascending: false }),
      supabase.from('requests').select('id,user_id,product_id,status,message,admin_note,created_at,updated_at,products(id,slug,name,brand,category_slug,short_desc,images,prices(price_gel)),profiles!requests_user_id_fkey(full_name,clinic_name,city,phone)').eq('type', 'price').order('created_at', { ascending: false }),
      supabase.from('offers').select('*, offer_items(*), payment_schedules(*), payment_transactions(id,status,provider,provider_order_id,provider_transaction_id)').order('created_at', { ascending: false }),
      supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, images, prices(price_gel)').eq('is_active', true).order('name'),
    ])
    const loadError = requestResult.error || legacyRequestResult.error || offerResult.error || productResult.error
    if (loadError) {
      console.error('[admin-clinic-offers] load failed', { code: loadError.code, message: loadError.message })
      setMessage(`მონაცემები სრულად ვერ ჩაიტვირთა: ${loadError.message}`)
    }
    // Expo 2026 requests and their offers are handled only in /admin/expo2026.
    const allRequests = (requestResult.data || []) as AdminRequest[]
    const expoIds = new Set(allRequests.filter((request) => request.source === 'EXPO2026').map((request) => request.id))
    const currentRequests = allRequests.filter((request) => !expoIds.has(request.id))
    const currentIds = new Set(allRequests.map((request) => request.id))
    const legacyRequests = ((legacyRequestResult.data || []) as unknown as LegacyPriceRequest[])
      .filter((request) => !currentIds.has(request.id) && request.user_id && request.product_id)
      .map((request): AdminRequest => ({
        id: request.id, user_id: request.user_id, product_id: request.product_id, quantity: 1,
        purchase_timeline: 'now', preferred_payment_method: 'advance_and_balance', note: request.message,
        status: request.status === 'new' ? 'received' : request.status === 'inprogress' ? 'reviewing' : request.status === 'done' ? 'offer_received' : 'cancelled',
        admin_note: request.admin_note, doctor_name_snapshot: request.profiles?.full_name || '',
        clinic_name_snapshot: request.profiles?.clinic_name || '', city_snapshot: request.profiles?.city || '',
        phone_snapshot: request.profiles?.phone || '', email_snapshot: '', created_at: request.created_at,
        updated_at: request.updated_at, products: request.products || null, legacySource: true,
      }))
    setRequests([...currentRequests, ...legacyRequests].sort((a, b) => b.created_at.localeCompare(a.created_at)))
    setOffers(((offerResult.data || []) as ClinicOffer[]).filter((offer) => !offer.request_id || !expoIds.has(offer.request_id))); setProducts((productResult.data || []) as ProductWithPrices[])
  }
  useEffect(() => { void load() }, [])

  const visibleRequests = useMemo(() => requests.filter((request) => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const haystack = `${request.clinic_name_snapshot} ${request.doctor_name_snapshot} ${request.products?.name || ''}`.toLowerCase()
    const matchesDate = !dateFrom || request.created_at.slice(0, 10) >= dateFrom
    return matchesStatus && matchesDate && (!search || haystack.includes(search.toLowerCase()))
  }), [requests, statusFilter, search, dateFrom])

  async function setOfferStatus(offer: ClinicOffer, status: 'sent' | 'cancelled' | 'expired') {
    setMessage('')
    const { error } = await supabase.from('offers').update({ status }).eq('id', offer.id)
    if (error) { setMessage(error.message); return }
    if (offer.request_id) {
      const requestStatus = status === 'sent' ? 'offer_ready' : status
      await supabase.from('special_price_requests').update({ status: requestStatus }).eq('id', offer.request_id)
    }
    setMessage(`შეთავაზების სტატუსი განახლდა: ${offerStatusLabels[status]}.`)
    await load()
  }

  async function ensureCurrentRequest(request: AdminRequest) {
    if (!request.legacySource) return true
    const { error } = await supabase.from('special_price_requests').upsert({
      id: request.id, user_id: request.user_id, product_id: request.product_id, quantity: request.quantity,
      purchase_timeline: request.purchase_timeline, preferred_payment_method: request.preferred_payment_method,
      note: request.note, status: request.status, admin_note: request.admin_note,
      doctor_name_snapshot: request.doctor_name_snapshot, clinic_name_snapshot: request.clinic_name_snapshot,
      city_snapshot: request.city_snapshot, phone_snapshot: request.phone_snapshot, email_snapshot: request.email_snapshot,
      created_at: request.created_at, updated_at: request.updated_at,
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) { setMessage(`ძველი მოთხოვნის გადატანა ვერ მოხერხდა: ${error.message}`); return false }
    return true
  }

  function groupSize(request: AdminRequest) {
    return request.group_id ? requests.filter((item) => item.group_id === request.group_id).length : 1
  }

  // Other products the doctor asked about in the same request start as extra
  // lines with the list price; the admin still sets and approves every price.
  function groupLines(request: AdminRequest): ExtraLine[] {
    if (!request.group_id) return []
    return requests
      .filter((item) => item.group_id === request.group_id && item.id !== request.id)
      .map((item) => ({ productId: item.product_id, quantity: item.quantity, unitPrice: Number(products.find((product) => product.id === item.product_id)?.prices?.[0]?.price_gel || 0), discount: 0 }))
  }

  async function sendSecureLink(offer: ClinicOffer) {
    if (!window.confirm(`${offer.offer_number}: ექიმს გაეგზავნოს ერთჯერადი SMS ბმული? ამით შეთავაზება დამტკიცდება და ექიმისთვის ხილული გახდება.`)) return
    setLinkBusy(offer.id); setMessage('')
    try {
      const session = (await supabase.auth.getSession()).data.session
      const response = await fetch(`/api/admin/offers/${offer.id}/secure-link`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) setMessage(payload?.error || 'ბმული ვერ გაიგზავნა.')
      else setMessage(payload?.delivered ? `${offer.offer_number}: ბმული გაიგზავნა (მოქმედებს 14 დღე).` : payload?.warning || 'ბმული შეიქმნა, მაგრამ SMS ვერ გაიგზავნა.')
      await load()
    } finally {
      setLinkBusy(null)
    }
  }

  async function openBuilder(request: AdminRequest) {
    if (!await ensureCurrentRequest(request)) return
    const product = products.find((item) => item.id === request.product_id)
    const next = initialBuilder()
    next.unitPrice = Number(product?.prices?.[0]?.price_gel || 0)
    setBuilder(next); setExtraLines(groupLines(request)); setProductToAdd(''); setScheduleDates({}); setScheduleAmounts({}); setSelected({ ...request, legacySource: undefined } as SpecialPriceRequest); setMessage('')
    if (request.status === 'received') void supabase.from('special_price_requests').update({ status: 'reviewing' }).eq('id', request.id).then(() => load())
  }

  function applyTemplate(value: string) {
    const preset = templateToTerms(value)
    setScheduleAmounts({})
    setBuilder((current) => preset ? { ...current, template: value, advancePercent: preset.advance, installments: preset.installments, paymentTerms: preset.text } : { ...current, template: value })
  }

  async function updateRequest(request: AdminRequest, updates: Partial<Pick<SpecialPriceRequest, 'status' | 'admin_note'>>) {
    if (!await ensureCurrentRequest(request)) return
    const { error } = await supabase.from('special_price_requests').update(updates).eq('id', request.id)
    if (error) setMessage(error.message)
    else await load()
  }

  async function createOffer() {
    if (!selected) return
    const product = products.find((item) => item.id === selected.product_id)
    if (!product || builder.unitPrice <= 0) { setMessage('მიუთითეთ პროდუქტის ფასი.'); return }
    setSaving(true); setMessage('')
    const lines = [
      { productId: product.id, quantity: selected.quantity, unitPrice: builder.unitPrice, discount: builder.discount },
      ...extraLines,
    ]
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) * 100) / 100
    const discountAmount = Math.round(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity * Math.min(100, Math.max(0, line.discount)) / 100, 0) * 100) / 100
    const total = Math.round((subtotal - discountAmount) * 100) / 100
    const advance = Math.round(total * Math.min(100, Math.max(0, builder.advancePercent)) / 100 * 100) / 100
    const baseSchedules = makeSchedule(total, advance, builder.installments, new Date().toISOString().slice(0, 10))
    const editedSchedules = baseSchedules.map((row) => ({ ...row, amount: scheduleAmounts[row.installment_number] ?? row.amount }))
    const editedTotal = Math.round(editedSchedules.reduce((sum, row) => sum + Number(row.amount), 0) * 100) / 100
    if (Math.abs(editedTotal - total) > 0.009) { setSaving(false); setMessage(`გრაფიკის ჯამი უნდა უდრიდეს საბოლოო ფასს: ${formatClinicMoney(total, builder.currency)}.`); return }
    const session = (await supabase.auth.getSession()).data.session
    const offerNumber = `ML-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`
    const { data: offer, error: offerError } = await supabase.from('offers').insert({
      request_id: selected.id, user_id: selected.user_id, clinic_name_snapshot: selected.clinic_name_snapshot,
      offer_number: offerNumber, status: builder.sendNow ? 'sent' : 'draft', currency: builder.currency, subtotal_amount: subtotal,
      discount_amount: discountAmount, total_amount: total, advance_amount: advance, vat_included: builder.vatIncluded,
      valid_until: builder.validUntil, payment_terms: builder.paymentTerms, delivery_terms: builder.deliveryTerms, warranty_terms: builder.warrantyTerms,
      notes: builder.notes || null, internal_note: builder.internalNote || null, created_by: session?.user?.id || null,
    }).select('id').single()
    if (offerError || !offer) { setSaving(false); setMessage(offerError?.message || 'შეთავაზება ვერ შეიქმნა.'); return }
    const itemRows = lines.map((line) => {
      const lineProduct = products.find((item) => item.id === line.productId)!
      return {
        offer_id: offer.id, product_id: lineProduct.id, product_name_snapshot: lineProduct.name,
        sku_snapshot: lineProduct.slug, product_image_snapshot: lineProduct.images?.[0] || null,
        quantity: line.quantity, unit_price: line.unitPrice, discount_percent: line.discount,
        total_price: Math.round(line.unitPrice * line.quantity * (1 - line.discount / 100) * 100) / 100,
      }
    })
    const schedules = editedSchedules.map((row) => ({ ...row, due_date: scheduleDates[row.installment_number] || row.due_date, offer_id: offer.id }))
    const [itemResult, scheduleResult] = await Promise.all([
      supabase.from('offer_items').insert(itemRows),
      supabase.from('payment_schedules').insert(schedules),
    ])
    if (itemResult.error || scheduleResult.error) {
      await supabase.from('offers').delete().eq('id', offer.id)
      setSaving(false); setMessage(itemResult.error?.message || scheduleResult.error?.message || 'შეთავაზების დეტალები ვერ შეინახა.'); return
    }
    const requestUpdate = supabase.from('special_price_requests').update({ status: builder.sendNow ? 'offer_ready' : 'reviewing' })
    await (selected.group_id ? requestUpdate.eq('group_id', selected.group_id) : requestUpdate.eq('id', selected.id))
    setSaving(false); setSelected(null); setMessage(`შეთავაზება ${offerNumber} შეიქმნა${builder.sendNow ? ' და პორტალში გაიგზავნა' : ''}.`); await load()
  }

  if (allowed === null) return <div style={{ padding: 30 }}>იტვირთება...</div>
  if (!allowed) return <div className="clinic-portal clinic-login-gate"><div className="clinic-card clinic-empty"><strong>ადმინისტრატორის ავტორიზაცია საჭიროა</strong><p className="clinic-muted">{message || 'შედით აქტიური ადმინისტრატორის ანგარიშით.'}</p><Link className="clinic-btn" href="/admin">ადმინის შესვლის გვერდი</Link></div></div>
  const subtotal = selected ? builder.unitPrice * selected.quantity + extraLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) : 0
  const discountAmount = selected ? builder.unitPrice * selected.quantity * builder.discount / 100 + extraLines.reduce((sum, line) => sum + line.unitPrice * line.quantity * line.discount / 100, 0) : 0
  const total = subtotal - discountAmount
  const advance = total * builder.advancePercent / 100
  const preview = makeSchedule(total, advance, builder.installments, new Date().toISOString().slice(0, 10))
  return <div className="clinic-portal"><div className="clinic-main" style={{ maxWidth: 1380, margin: '0 auto' }}>
    <header className="clinic-page-head"><div><p className="clinic-eyebrow">Admin / B2B Sales</p><h1>სპეციალური შეთავაზებები</h1><p>მოთხოვნების განხილვა, ინდივიდუალური ფასი და გადახდის გრაფიკი.</p></div><Link className="clinic-btn clinic-btn-ghost" href="/admin">ადმინში დაბრუნება</Link></header>
    {message && <p className="clinic-alert">{message}</p>}
    <div className="clinic-grid clinic-grid-4"><div className="clinic-card"><div className="clinic-stat-label">ახალი მოთხოვნები</div><div className="clinic-stat-value">{requests.filter((item) => item.status === 'received').length}</div></div><div className="clinic-card"><div className="clinic-stat-label">განხილვაში</div><div className="clinic-stat-value">{requests.filter((item) => item.status === 'reviewing').length}</div></div><div className="clinic-card"><div className="clinic-stat-label">აქტიური შეთავაზებები</div><div className="clinic-stat-value">{offers.filter((item) => ['sent', 'viewed', 'accepted', 'partially_paid'].includes(item.status)).length}</div></div><div className="clinic-card"><div className="clinic-stat-label">გადახდილი</div><div className="clinic-stat-value">{offers.filter((item) => item.status === 'paid').length}</div></div></div>
    <div className="clinic-card clinic-grid clinic-grid-3" style={{ margin: '18px 0' }}><div className="clinic-field"><label htmlFor="admin-offer-search">ძებნა</label><input id="admin-offer-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="კლინიკა, ექიმი ან პროდუქტი" /></div><div className="clinic-field"><label htmlFor="admin-offer-status">სტატუსი</label><select id="admin-offer-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ყველა</option>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="clinic-field"><label htmlFor="admin-offer-date">თარიღიდან</label><input id="admin-offer-date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div></div>
    <div className="clinic-grid clinic-grid-2"><section><h2 className="clinic-section-title">შემოსული მოთხოვნები</h2><div className="clinic-list">{visibleRequests.map((request) => <div className="clinic-card" key={request.id}><div className="clinic-row"><div><span className="clinic-badge">{requestStatusLabels[request.status]}</span>{request.source === 'EXPO2026' && <span className="clinic-badge clinic-badge-warn" style={{ marginLeft: 6 }}>EXPO 2026</span>}{request.group_id && groupSize(request) > 1 && <span className="clinic-badge" style={{ marginLeft: 6 }}>ჯგუფი · {groupSize(request)} პროდუქტი</span>}{request.legacySource && <span className="clinic-badge clinic-badge-warn" style={{ marginLeft: 6 }}>ძველი მოთხოვნა</span>}<h3 style={{ margin: '10px 0 4px' }}>{request.products?.name || 'პროდუქტი'}</h3><p className="clinic-muted">{request.clinic_name_snapshot} · {request.doctor_name_snapshot}<br />{request.phone_snapshot} · {request.email_snapshot}</p></div><button className="clinic-btn" onClick={() => void openBuilder(request)}>შეთავაზების შექმნა</button></div><div className="clinic-muted">რაოდენობა: {request.quantity} · მოთხოვნა: {new Date(request.created_at).toLocaleDateString('ka-GE')}</div>{request.note && <p className="clinic-alert" style={{ marginBottom: 0 }}>{request.note}</p>}<div className="clinic-form-grid" style={{ marginTop: 12 }}><div className="clinic-field"><label>მოთხოვნის სტატუსი</label><select value={request.status} onChange={(event) => void updateRequest(request, { status: event.target.value as SpecialPriceRequest['status'] })}>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="clinic-field"><label>შიდა შენიშვნა</label><input defaultValue={request.admin_note || ''} placeholder="ჩანს მხოლოდ ადმინისტრატორისთვის" onBlur={(event) => { if (event.target.value !== (request.admin_note || '')) void updateRequest(request, { admin_note: event.target.value || null }) }} /></div></div></div>)}{visibleRequests.length === 0 && <div className="clinic-card clinic-empty"><strong>მოთხოვნები ვერ მოიძებნა</strong></div>}</div></section>
      <section><h2 className="clinic-section-title">ბოლო შეთავაზებები</h2><div className="clinic-card clinic-list">{offers.slice(0, 10).map((offer) => <div className="clinic-row" key={offer.id}><div><strong>{offer.offer_number}</strong><div className="clinic-muted">{offer.clinic_name_snapshot} · {formatClinicMoney(offer.total_amount, offer.currency)}</div>{offer.accepted_at && <div className="clinic-muted">პირობები დადასტურებულია: {new Date(offer.accepted_at).toLocaleString('ka-GE')}</div>}{offer.payment_transactions?.map((transaction) => <div className="clinic-muted" key={transaction.id}>ტრანზაქცია: {transaction.status} · {transaction.provider_transaction_id || transaction.provider_order_id || 'რეფერენსი ჯერ არ არის'}</div>)}</div><div style={{ textAlign: 'right' }}><span className="clinic-badge">{offerStatusLabels[offer.status]}</span><div className="clinic-actions" style={{ marginTop: 6 }}>{offer.status === 'draft' && <button className="clinic-btn clinic-btn-light" onClick={() => setOfferStatus(offer, 'sent')}>გაგზავნა</button>}{['draft', 'sent', 'viewed'].includes(offer.status) && <button className="clinic-btn clinic-btn-light" disabled={linkBusy === offer.id} title="14-დღიანი ბმული ექიმის ნომერზე" onClick={() => sendSecureLink(offer)}>{linkBusy === offer.id ? 'იგზავნება...' : 'SMS ბმული'}</button>}{['draft', 'sent', 'viewed', 'accepted', 'partially_paid'].includes(offer.status) && <button className="clinic-btn clinic-btn-ghost" onClick={() => setOfferStatus(offer, 'cancelled')}>გაუქმება</button>}{['sent', 'viewed'].includes(offer.status) && <button className="clinic-btn clinic-btn-ghost" onClick={() => setOfferStatus(offer, 'expired')}>ვადის გასვლა</button>}</div></div></div>)}</div></section></div>
    {selected && <div className="clinic-modal-backdrop"><div className="clinic-modal" style={{ width: 'min(860px, 100%)' }}><div className="clinic-row"><div><p className="clinic-eyebrow">{selected.clinic_name_snapshot}</p><h2>შეთავაზების შექმნა</h2></div><button className="clinic-btn clinic-btn-ghost" onClick={() => setSelected(null)}>დახურვა</button></div>
      <div className="clinic-form-grid" style={{ marginTop: 18 }}>
        <div className="clinic-field"><label htmlFor="offer-price">ერთეულის სტანდარტული ფასი</label><input id="offer-price" type="number" min={0} step="0.01" value={builder.unitPrice} onChange={(event) => setBuilder({ ...builder, unitPrice: Number(event.target.value) })} /></div>
        <div className="clinic-field"><label htmlFor="offer-discount">ფასდაკლება %</label><input id="offer-discount" type="number" min={0} max={100} value={builder.discount} onChange={(event) => setBuilder({ ...builder, discount: Number(event.target.value) })} /></div>
        <div className="clinic-field clinic-field-full"><label htmlFor="offer-add-product">დამატებითი პროდუქტი</label><div className="clinic-row"><select id="offer-add-product" value={productToAdd} onChange={(event) => setProductToAdd(event.target.value)}><option value="">აირჩიეთ პროდუქტი</option>{products.filter((item) => item.id !== selected.product_id && !extraLines.some((line) => line.productId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="clinic-btn clinic-btn-ghost" type="button" disabled={!productToAdd} onClick={() => { const item = products.find((product) => product.id === productToAdd); if (!item) return; setExtraLines((current) => [...current, { productId: item.id, quantity: 1, unitPrice: Number(item.prices?.[0]?.price_gel || 0), discount: 0 }]); setProductToAdd('') }}>დამატება</button></div></div>
        {extraLines.map((line, index) => { const item = products.find((product) => product.id === line.productId); return <div className="clinic-card clinic-field-full" key={line.productId}><div className="clinic-row"><strong>{item?.name}</strong><button className="clinic-btn clinic-btn-ghost" type="button" onClick={() => setExtraLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>წაშლა</button></div><div className="clinic-form-grid" style={{ marginTop: 10 }}><div className="clinic-field"><label>რაოდენობა</label><input type="number" min={1} value={line.quantity} onChange={(event) => setExtraLines((current) => current.map((value, lineIndex) => lineIndex === index ? { ...value, quantity: Math.max(1, Number(event.target.value)) } : value))} /></div><div className="clinic-field"><label>ერთეულის ფასი</label><input type="number" min={0} step="0.01" value={line.unitPrice} onChange={(event) => setExtraLines((current) => current.map((value, lineIndex) => lineIndex === index ? { ...value, unitPrice: Number(event.target.value) } : value))} /></div><div className="clinic-field"><label>ფასდაკლება %</label><input type="number" min={0} max={100} value={line.discount} onChange={(event) => setExtraLines((current) => current.map((value, lineIndex) => lineIndex === index ? { ...value, discount: Number(event.target.value) } : value))} /></div></div></div> })}
        <div className="clinic-field"><label htmlFor="offer-valid">მოქმედების ბოლო დღე</label><input id="offer-valid" type="date" value={builder.validUntil} onChange={(event) => setBuilder({ ...builder, validUntil: event.target.value })} /></div>
        <div className="clinic-field"><label htmlFor="offer-currency">ვალუტა</label><select id="offer-currency" value={builder.currency} onChange={(event) => setBuilder({ ...builder, currency: event.target.value as BuilderState['currency'] })}><option value="GEL">GEL — ლარი</option><option value="USD">USD — დოლარი</option><option value="EUR">EUR — ევრო</option></select></div>
        <div className="clinic-field"><label htmlFor="offer-template">გრაფიკის შაბლონი</label><select id="offer-template" value={builder.template} onChange={(event) => applyTemplate(event.target.value)}><option value="full">სრული გადახდა</option><option value="30_70">30% ავანსი + 70% მიწოდებამდე</option><option value="30_2">30% ავანსი + 2 თვიური გადახდა</option><option value="30_3">30% ავანსი + 3 თვიური გადახდა</option><option value="custom">ინდივიდუალური გრაფიკი</option></select></div>
        <div className="clinic-field"><label htmlFor="offer-advance">ავანსი %</label><input id="offer-advance" type="number" min={0} max={100} value={builder.advancePercent} onChange={(event) => setBuilder({ ...builder, advancePercent: Number(event.target.value), template: 'custom' })} /></div>
        <div className="clinic-field"><label htmlFor="offer-installments">დარჩენილი გადახდების რაოდენობა</label><input id="offer-installments" type="number" min={1} max={24} value={builder.installments} onChange={(event) => setBuilder({ ...builder, installments: Math.max(1, Number(event.target.value)), template: 'custom' })} /></div>
        <div className="clinic-field clinic-field-full"><label htmlFor="offer-payment-terms">გადახდის პირობები</label><textarea id="offer-payment-terms" value={builder.paymentTerms} onChange={(event) => setBuilder({ ...builder, paymentTerms: event.target.value })} /></div>
        <div className="clinic-field clinic-field-full"><label htmlFor="offer-delivery-terms">მიწოდების პირობები</label><textarea id="offer-delivery-terms" value={builder.deliveryTerms} onChange={(event) => setBuilder({ ...builder, deliveryTerms: event.target.value })} /></div>
        <div className="clinic-field clinic-field-full"><label htmlFor="offer-warranty-terms">საგარანტიო პირობები</label><textarea id="offer-warranty-terms" value={builder.warrantyTerms} onChange={(event) => setBuilder({ ...builder, warrantyTerms: event.target.value })} /></div>
        <div className="clinic-field"><label htmlFor="offer-notes">შენიშვნა ექიმისთვის</label><textarea id="offer-notes" value={builder.notes} onChange={(event) => setBuilder({ ...builder, notes: event.target.value })} /></div>
        <div className="clinic-field"><label htmlFor="offer-internal">შიდა შენიშვნა</label><textarea id="offer-internal" value={builder.internalNote} onChange={(event) => setBuilder({ ...builder, internalNote: event.target.value })} /></div>
      </div>
      <div className="clinic-grid clinic-grid-4" style={{ margin: '16px 0' }}><div className="clinic-card"><div className="clinic-stat-label">საწყისი ჯამი</div><strong>{formatClinicMoney(subtotal, builder.currency)}</strong></div><div className="clinic-card"><div className="clinic-stat-label">ფასდაკლება</div><strong>{formatClinicMoney(subtotal - total, builder.currency)}</strong></div><div className="clinic-card"><div className="clinic-stat-label">საბოლოო ფასი</div><strong>{formatClinicMoney(total, builder.currency)}</strong></div><div className="clinic-card"><div className="clinic-stat-label">ავანსი</div><strong>{formatClinicMoney(advance, builder.currency)}</strong></div></div>
      <div className="clinic-card"><PaymentSchedulePreview rows={preview} dates={scheduleDates} amounts={scheduleAmounts} currency={builder.currency} onDateChange={(installment, value) => setScheduleDates((current) => ({ ...current, [installment]: value }))} onAmountChange={(installment, value) => setScheduleAmounts((current) => ({ ...current, [installment]: value }))} /></div>
      <div className="clinic-actions"><label className="clinic-check"><input type="checkbox" checked={builder.vatIncluded} onChange={(event) => setBuilder({ ...builder, vatIncluded: event.target.checked })} />დღგ ჩათვლილია</label><label className="clinic-check"><input type="checkbox" checked={builder.sendNow} onChange={(event) => setBuilder({ ...builder, sendNow: event.target.checked })} />პორტალში დაუყოვნებლივ გაგზავნა</label></div>
      {message && <p className="clinic-alert clinic-alert-error">{message}</p>}<div className="clinic-actions"><button className="clinic-btn" disabled={saving || total <= 0} onClick={createOffer}>{saving ? 'ინახება...' : builder.sendNow ? 'შექმნა და გაგზავნა' : 'მონახაზის შენახვა'}</button></div>
    </div></div>}
  </div></div>
}

function PaymentSchedulePreview({ rows, dates, amounts, currency, onDateChange, onAmountChange }: { rows: ReturnType<typeof makeSchedule>; dates: Record<number, string>; amounts: Record<number, number>; currency: string; onDateChange: (installment: number, value: string) => void; onAmountChange: (installment: number, value: number) => void }) {
  const total = rows.reduce((sum, row) => sum + (amounts[row.installment_number] ?? row.amount), 0)
  return <><div className="clinic-row"><strong>გადახდის გრაფიკი</strong><span className="clinic-badge">ჯამი {formatClinicMoney(total, currency)}</span></div><div className="clinic-table-wrap"><table className="clinic-table"><thead><tr><th>ეტაპი</th><th>თარიღი (რედაქტირებადი)</th><th>თანხა (რედაქტირებადი)</th></tr></thead><tbody>{rows.map((row) => <tr key={row.installment_number}><td>{row.title}</td><td><input type="date" value={dates[row.installment_number] || row.due_date} onChange={(event) => onDateChange(row.installment_number, event.target.value)} /></td><td><input type="number" min={0.01} step="0.01" value={amounts[row.installment_number] ?? row.amount} onChange={(event) => onAmountChange(row.installment_number, Number(event.target.value))} /> <small>{currency}</small></td></tr>)}</tbody></table></div><p className="clinic-muted">გრაფიკის ჯამი ზუსტად უნდა ემთხვეოდეს შეთავაზების საბოლოო ფასს; დამრგვალების სხვაობა შეიტანეთ ბოლო ეტაპში.</p></>
}
