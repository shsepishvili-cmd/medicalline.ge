'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { formatClinicMoney, requestStatusLabels, scheduleStatusLabels, type ClinicOffer, type ClinicProduct, type SpecialPriceRequest } from '@/app/lib/clinic-portal-types'
import { ClinicPageHeader } from './ClinicShell'
import { useClinicPortal } from './ClinicPortalProvider'
import { OfferCard } from './OfferViews'
import { SpecialPriceRequestModal } from './SpecialPriceRequestModal'

const activeOfferStatuses = ['sent', 'viewed', 'accepted', 'partially_paid']

export function DashboardView() {
  const { profile } = useClinicPortal()
  const [offers, setOffers] = useState<ClinicOffer[]>([])
  const [requests, setRequests] = useState<SpecialPriceRequest[]>([])
  const [serviceCount, setServiceCount] = useState(0)
  useEffect(() => {
    void supabase.rpc('refresh_my_clinic_portal_statuses').then(() => Promise.all([
      supabase.from('offers').select('*, payment_schedules(*)').order('created_at', { ascending: false }),
      supabase.from('special_price_requests').select('*, products(name, brand, slug)').order('created_at', { ascending: false }),
      supabase.from('service_tickets').select('id', { count: 'exact', head: true }).neq('status', 'done'),
    ])).then(([offerResult, requestResult, ticketResult]) => {
      setOffers((offerResult.data || []) as ClinicOffer[]); setRequests((requestResult.data || []) as SpecialPriceRequest[]); setServiceCount(ticketResult.count || 0)
    })
  }, [])
  const activeOffers = offers.filter((offer) => activeOfferStatuses.includes(offer.status))
  const activeOrders = offers.filter((offer) => ['accepted', 'partially_paid'].includes(offer.status))
  const nextPayment = offers.flatMap((offer) => (offer.payment_schedules || []).map((row) => ({ ...row, currency: offer.currency }))).filter((row) => row.status === 'available' || row.status === 'overdue').sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
  return <>
    <ClinicPageHeader eyebrow="Medical Line Clinic Portal" title={`გამარჯობა, ${profile?.full_name || 'დოქტორო'}`} description={`${profile?.clinic_name || 'თქვენი კლინიკა'} · ანგარიში ${profile?.status === 'active' ? 'აქტიურია' : profile?.status || ''}`} />
    <div className="clinic-grid clinic-grid-4">
      <div className="clinic-card"><div className="clinic-stat-label">აქტიური შეთავაზებები</div><div className="clinic-stat-value">{activeOffers.length}</div><div className="clinic-stat-meta">ინდივიდუალური პირობები</div></div>
      <div className="clinic-card"><div className="clinic-stat-label">აქტიური შეკვეთები</div><div className="clinic-stat-value">{activeOrders.length}</div><div className="clinic-stat-meta">დადასტურებული შეთავაზებები</div></div>
      <div className="clinic-card"><div className="clinic-stat-label">შემდეგი გადახდა</div><div className="clinic-stat-value">{nextPayment ? formatClinicMoney(nextPayment.amount, nextPayment.currency) : '—'}</div><div className="clinic-stat-meta">{nextPayment ? new Date(nextPayment.due_date).toLocaleDateString('ka-GE') : 'გადასახდელი არ არის'}</div></div>
      <div className="clinic-card"><div className="clinic-stat-label">აქტიური სერვის-ტიკეტები</div><div className="clinic-stat-value">{serviceCount}</div><div className="clinic-stat-meta">ინჟინრის მხარდაჭერა</div></div>
    </div>
    <section className="clinic-banner"><div><h2>კლინიკის სპეციალური პირობები</h2><p>მიიღეთ ინდივიდუალური ფასი, მოქნილი გადახდის გრაფიკი და ონლაინ ავანსის გადახდის შესაძლებლობა.</p><div className="clinic-actions"><Link className="clinic-btn" href="/clinic/catalog">სპეციალური ფასის მოთხოვნა</Link><Link className="clinic-btn clinic-btn-ghost" href="/clinic/offers">ჩემი შეთავაზებები</Link></div></div></section>
    <div className="clinic-grid clinic-grid-2">
      <section><h2 className="clinic-section-title">ბოლო შეთავაზებები</h2><div className="clinic-list">{offers.slice(0, 3).map((offer) => <OfferCard key={offer.id} offer={offer} />)}{offers.length === 0 && <div className="clinic-card clinic-empty"><strong>შეთავაზებები ჯერ არ გაქვთ</strong><p className="clinic-muted">მოითხოვეთ სპეციალური ფასი კატალოგიდან.</p></div>}</div></section>
      <section><h2 className="clinic-section-title">მოთხოვნების სტატუსი</h2><div className="clinic-card clinic-list">{requests.slice(0, 5).map((request) => <div className="clinic-row" key={request.id}><div><strong>{request.products?.name || 'პროდუქტი'}</strong><div className="clinic-muted">{new Date(request.created_at).toLocaleDateString('ka-GE')} · რაოდენობა {request.quantity}</div></div><span className="clinic-badge">{requestStatusLabels[request.status]}</span></div>)}{requests.length === 0 && <div className="clinic-empty"><strong>მოთხოვნები ჯერ არ გაქვთ</strong></div>}</div></section>
    </div>
  </>
}

export function CatalogView() {
  const [products, setProducts] = useState<ClinicProduct[]>([])
  const [selected, setSelected] = useState<ClinicProduct | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { void supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, images, prices(price_gel, installment_monthly, installment_months, note)').eq('is_active', true).order('sort_order').then(({ data }) => setProducts((data || []) as ClinicProduct[])) }, [])
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category_slug).filter(Boolean))) as string[], [products])
  const visible = products.filter((product) => (!category || product.category_slug === category) && (!search || `${product.name} ${product.brand}`.toLowerCase().includes(search.toLowerCase())))
  return <>
    <ClinicPageHeader eyebrow="B2B კატალოგი" title="პროდუქტების კატალოგი" description="ძვირადღირებული დანადგარებისთვის მიიღეთ ინდივიდუალური შეთავაზება და გადახდის გრაფიკი." />
    <div className="clinic-card clinic-form-grid" style={{ marginBottom: 18 }}><div className="clinic-field"><label htmlFor="catalog-search">ძებნა</label><input id="catalog-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="პროდუქტი ან ბრენდი" /></div><div className="clinic-field"><label htmlFor="catalog-category">კატეგორია</label><select id="catalog-category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">ყველა კატეგორია</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></div></div>
    {notice && <p className="clinic-alert">{notice}</p>}
    <div className="clinic-products">{visible.map((product) => { const price = product.prices?.[0]; return <article className="clinic-card clinic-product" key={product.id}><div className="clinic-product-img">{product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <span className="clinic-muted">Medical Line</span>}</div><div className="clinic-product-body"><div className="clinic-product-brand">{product.brand || product.category_slug}</div><h3>{product.name}</h3><p>{product.short_desc || 'პროფესიონალური სტომატოლოგიური მოწყობილობა.'}</p>{price?.price_gel ? <><div className="clinic-product-price">{formatClinicMoney(price.price_gel)}</div><div className="clinic-product-note">კლინიკის სპეციალური ფასი — მოთხოვნით</div></> : <div className="clinic-product-price">ფასი მოთხოვნით</div>}<div className="clinic-product-note">ეტაპობრივი გადახდა ხელმისაწვდომია</div><div className="clinic-actions"><button className="clinic-btn" onClick={() => setSelected(product)}>მიიღე სპეციალური ფასი</button><Link className="clinic-btn clinic-btn-ghost" href={`/catalog/${product.slug}`}>დეტალები</Link></div></div></article> })}</div>
    {selected && <SpecialPriceRequestModal product={selected} onClose={() => setSelected(null)} onCreated={() => setNotice('თქვენი მოთხოვნა მიღებულია. სტატუსს „სპეციალური შეთავაზებების“ გვერდზე ნახავთ.')} />}
  </>
}

export function OffersView() {
  const [offers, setOffers] = useState<ClinicOffer[]>([])
  const [requests, setRequests] = useState<SpecialPriceRequest[]>([])
  useEffect(() => { void supabase.rpc('refresh_my_clinic_portal_statuses').then(() => Promise.all([supabase.from('offers').select('*, payment_schedules(*)').order('created_at', { ascending: false }), supabase.from('special_price_requests').select('*, products(name, brand, slug)').order('created_at', { ascending: false })])).then(([offerResult, requestResult]) => { setOffers((offerResult.data || []) as ClinicOffer[]); setRequests((requestResult.data || []) as SpecialPriceRequest[]) }) }, [])
  return <><ClinicPageHeader eyebrow="ინდივიდუალური პირობები" title="სპეციალური შეთავაზებები" description="აქ ჩანს მოთხოვნები, დამტკიცებული ფასები, მოქმედების ვადა და გადახდის გრაფიკი." action={<Link className="clinic-btn" href="/clinic/catalog">ახალი მოთხოვნა</Link>} />
    <div className="clinic-list">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}{offers.length === 0 && <div className="clinic-card clinic-empty"><strong>დამტკიცებული შეთავაზება ჯერ არ არის</strong><p className="clinic-muted">ადმინისტრატორი თქვენს მოთხოვნას განიხილავს და შეთავაზებას აქ გამოგიგზავნით.</p></div>}</div>
    <h2 className="clinic-section-title">ჩემი მოთხოვნები</h2><div className="clinic-card clinic-list">{requests.map((request) => <div className="clinic-row" key={request.id}><div><strong>{request.products?.name || 'პროდუქტი'}</strong><div className="clinic-muted">რაოდენობა {request.quantity} · {new Date(request.created_at).toLocaleDateString('ka-GE')}</div></div><span className="clinic-badge">{requestStatusLabels[request.status]}</span></div>)}{requests.length === 0 && <div className="clinic-empty"><strong>მოთხოვნები ჯერ არ გაქვთ</strong></div>}</div>
  </>
}

export function PaymentsView({ ordersOnly = false }: { ordersOnly?: boolean }) {
  const router = useRouter()
  const { session } = useClinicPortal()
  const [offers, setOffers] = useState<ClinicOffer[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  useEffect(() => { void supabase.rpc('refresh_my_clinic_portal_statuses').then(() => supabase.from('offers').select('*, payment_schedules(*)').in('status', ['accepted', 'partially_paid', 'paid']).order('created_at', { ascending: false })).then(({ data }) => setOffers((data || []) as ClinicOffer[])) }, [])
  const schedules = offers.flatMap((offer) => (offer.payment_schedules || []).map((row) => ({ ...row, offer }))).sort((a, b) => a.due_date.localeCompare(b.due_date))
  async function createBogTestOffer() {
    if (!session?.access_token) return
    setTestLoading(true); setTestMessage('')
    const response = await fetch('/api/payments/bog/test-offer', { method: 'POST', headers: { authorization: `Bearer ${session.access_token}` } })
    const payload = await response.json().catch(() => ({})); setTestLoading(false)
    if (!response.ok) { setTestMessage(payload.error || 'სატესტო შეთავაზება ვერ შეიქმნა.'); return }
    router.push(`/clinic/offers/${payload.offerId}`)
  }
  if (ordersOnly) return <><ClinicPageHeader eyebrow="შეკვეთები" title="შეკვეთები და გადახდები" description="დადასტურებული შეთავაზებების შესრულება და ფინანსური მდგომარეობა." /><div className="clinic-list">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}{offers.length === 0 && <div className="clinic-card clinic-empty"><strong>აქტიური შეკვეთა ჯერ არ გაქვთ</strong></div>}</div></>
  return <><ClinicPageHeader eyebrow="გადახდები" title="ჩემი გადახდები" description="გადასახდელ ეტაპთან დააჭირეთ მწვანე „გადახდა“ ღილაკს." />{process.env.NEXT_PUBLIC_BOG_TEST_MODE === 'true' && <div className="clinic-card clinic-accept" style={{ marginBottom: 18 }}><strong>BOG რეალური 1 GEL ტესტი</strong><p className="clinic-muted">Preview-only რეჟიმი. ჩამოიჭრება რეალური 1 ლარი; ნამდვილ შეთავაზებებსა და გრაფიკებს არ შეეხება.</p>{testMessage && <p className="clinic-alert clinic-alert-error">{testMessage}</p>}<button className="clinic-btn" disabled={testLoading} onClick={createBogTestOffer}>{testLoading ? 'მზადდება...' : '1 GEL სატესტო შეთავაზების შექმნა'}</button></div>}<div className="clinic-card">{schedules.length ? <div className="clinic-table-wrap"><table className="clinic-table"><thead><tr><th>შეთავაზება</th><th>ეტაპი</th><th>თარიღი</th><th>თანხა</th><th>სტატუსი</th><th>მოქმედება</th></tr></thead><tbody>{schedules.map((row) => <tr key={row.id}><td><Link href={`/clinic/offers/${row.offer.id}`}>{row.offer.offer_number}</Link></td><td>{row.title}</td><td>{new Date(row.due_date).toLocaleDateString('ka-GE')}</td><td><strong>{formatClinicMoney(row.amount, row.offer.currency)}</strong></td><td><span className="clinic-badge">{scheduleStatusLabels[row.status]}</span></td><td>{row.status === 'available' || row.status === 'overdue' ? <Link className="clinic-btn" href={`/clinic/offers/${row.offer.id}`}>გადახდა</Link> : '—'}</td></tr>)}</tbody></table></div> : <div className="clinic-empty"><strong>გადახდის გრაფიკი ჯერ არ გაქვთ</strong></div>}</div></>
}

type Ticket = { id: string; problem_desc: string; serial_number: string | null; status: string; created_at: string; products?: { name: string } | null }
export function ServiceView() {
  const { profile } = useClinicPortal()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [products, setProducts] = useState<ClinicProduct[]>([])
  const [productId, setProductId] = useState('')
  const [serial, setSerial] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  async function load() { const [ticketResult, productResult] = await Promise.all([supabase.from('service_tickets').select('id, problem_desc, serial_number, status, created_at, products(name)').order('created_at', { ascending: false }), supabase.from('products').select('id, slug, name, brand, category_slug, short_desc, images').eq('is_active', true).order('name')]); const normalizedTickets = (ticketResult.data || []).map((ticket) => ({ ...ticket, products: Array.isArray(ticket.products) ? ticket.products[0] || null : ticket.products })) as Ticket[]; setTickets(normalizedTickets); setProducts((productResult.data || []) as ClinicProduct[]) }
  useEffect(() => { void load() }, [])
  async function createTicket() { if (!description.trim() || !profile) return; const { error } = await supabase.from('service_tickets').insert({ user_id: profile.id, product_id: productId || null, serial_number: serial || null, problem_desc: description.trim() }); if (error) { setMessage(error.message); return } setDescription(''); setSerial(''); setProductId(''); setMessage('სერვის-ტიკეტი მიღებულია.'); await load() }
  return <><ClinicPageHeader eyebrow="ინჟინრის მხარდაჭერა" title="სერვისი" description="შექმენით ახალი ტიკეტი და აკონტროლეთ მიმდინარე ვიზიტები." />
    <div className="clinic-grid clinic-grid-2"><div className="clinic-card"><h2 style={{ marginTop: 0 }}>ახალი ტიკეტი</h2><div className="clinic-form-grid"><div className="clinic-field clinic-field-full"><label htmlFor="service-product">პროდუქტი</label><select id="service-product" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">ზოგადი შემთხვევა</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div className="clinic-field clinic-field-full"><label htmlFor="service-serial">სერიული ნომერი</label><input id="service-serial" value={serial} onChange={(event) => setSerial(event.target.value)} /></div><div className="clinic-field clinic-field-full"><label htmlFor="service-description">პრობლემის აღწერა</label><textarea id="service-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div></div>{message && <p className="clinic-alert">{message}</p>}<button className="clinic-btn" disabled={!description.trim()} onClick={createTicket}>ტიკეტის გაგზავნა</button></div>
      <div className="clinic-list">{tickets.map((ticket) => <div className="clinic-card" key={ticket.id}><div className="clinic-row"><strong>{ticket.products?.name || 'ზოგადი სერვისი'}</strong><span className="clinic-badge">{ticket.status}</span></div><p className="clinic-muted">{ticket.problem_desc}</p><div className="clinic-muted">{new Date(ticket.created_at).toLocaleDateString('ka-GE')} {ticket.serial_number ? `· SN ${ticket.serial_number}` : ''}</div></div>)}{tickets.length === 0 && <div className="clinic-card clinic-empty"><strong>ტიკეტები ჯერ არ გაქვთ</strong></div>}</div></div>
  </>
}

export function ProfileView() {
  const { profile, session } = useClinicPortal()
  return <><ClinicPageHeader eyebrow="ანგარიში" title="პროფილი" description="კლინიკის საკონტაქტო და ავტორიზაციის ინფორმაცია." /><div className="clinic-grid clinic-grid-2"><div className="clinic-card"><h2 style={{ marginTop: 0 }}>{profile?.full_name}</h2><p className="clinic-muted">{profile?.clinic_name || 'კლინიკა არ არის მითითებული'}</p><span className="clinic-badge">{profile?.status === 'active' ? 'აქტიური ანგარიში' : profile?.status}</span></div><div className="clinic-card clinic-list">{[['ელფოსტა', session?.user?.email || '—'], ['ტელეფონი', profile?.phone || '—'], ['ქალაქი', profile?.city || '—'], ['როლი', profile?.role || '—']].map(([label, value]) => <div className="clinic-row" key={label}><span className="clinic-muted">{label}</span><strong>{value}</strong></div>)}</div></div></>
}

export function AcademyView() {
  const [videos, setVideos] = useState<Array<{ id: string; title: string; description: string | null; thumbnail_url: string | null; youtube_url: string | null }>>([])
  useEffect(() => { void supabase.from('academy_videos').select('id, title, description, thumbnail_url, youtube_url').eq('is_active', true).order('sort_order').then(({ data }) => setVideos(data || [])) }, [])
  return <><ClinicPageHeader eyebrow="Medical Line Academy" title="სასწავლო მასალები" description="პროდუქტის გამოყენება, ინსტალაცია და ტექნიკური მხარდაჭერა." action={<Link className="clinic-btn clinic-btn-ghost" href="/academy">სრული Academy</Link>} /><div className="clinic-grid clinic-grid-3">{videos.slice(0, 12).map((video) => <a key={video.id} className="clinic-card clinic-offer-card" href={video.youtube_url || '/academy'} target={video.youtube_url ? '_blank' : undefined} rel="noreferrer">{video.thumbnail_url && <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12 }} />}<h3>{video.title}</h3><p className="clinic-muted">{video.description || 'სასწავლო ვიდეო'}</p></a>)}</div></>
}
