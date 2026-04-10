'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type Screen = 'login' | 'register' | 'catalog' | 'product' | 'service' | 'academy' | 'profile'
type User = { id: string; full_name: string; clinic_name: string; city: string; phone: string; role: string; status: string }
type Product = { id: string; slug: string; name: string; category_slug: string; brand: string; short_desc: string; specs: Record<string,string>; prices: { price_gel: number; price_usd: number; installment_monthly: number; installment_months: number; note: string }[] }
type Request = { id: string; type: string; status: string; created_at: string; products: { name: string } }
type AcademyItem = { id: string; type: string; title: string; description: string; duration_sec: number; webinar_date: string }

const G = '#085041'
const G2 = '#0a6b52'
const GL = '#E1F5EE'
const CITIES = ['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი','ფოთი','სხვა']
const CATS = [
  { slug: '', label: 'ყველა' },
  { slug: 'scan', label: 'სკანერები' },
  { slug: 'radio', label: 'რადიოლოგია' },
  { slug: 'endo', label: 'ენდოდონტია' },
  { slug: 'optics', label: 'ოპტიკა' },
  { slug: 'hygiene', label: 'ჰიგიენა' },
  { slug: 'partner', label: 'პარტნიორი' },
]
const TYPE_LABELS: Record<string,string> = { price: 'ფასი', demo: 'დემო', service: 'სერვისი', info: 'ინფო' }
const STATUS_LABELS: Record<string,string> = { new: 'ახალი', inprogress: 'მიმდინარე', done: 'დასრულდა', cancelled: 'გაუქმდა' }

export default function ClinicApp() {
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProds, setFilteredProds] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [academy, setAcademy] = useState<AcademyItem[]>([])
  const [cat, setCat] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [authTab, setAuthTab] = useState<'login'|'register'>('login')

  // auth fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [authErr, setAuthErr] = useState('')

  // service ticket
  const [ticketDesc, setTicketDesc] = useState('')
  const [ticketSerial, setTicketSerial] = useState('')
  const [showTicket, setShowTicket] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id)
    })
  }, [])

  useEffect(() => {
    let list = products
    if (cat) list = list.filter(p => p.category_slug === cat)
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
    setFilteredProds(list)
  }, [products, cat, search])

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) { setUser(data); setScreen('catalog'); loadProducts(); loadRequests(uid); loadAcademy() }
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*, prices(*)').eq('is_active', true).order('sort_order')
    if (data) setProducts(data)
  }

  async function loadRequests(uid: string) {
    const { data } = await supabase.from('requests').select('*, products(name)').eq('user_id', uid).order('created_at', { ascending: false })
    if (data) setRequests(data)
  }

  async function loadAcademy() {
    const { data } = await supabase.from('academy_items').select('*').eq('is_active', true).order('sort_order')
    if (data) setAcademy(data)
  }

  async function doLogin() {
    setAuthErr(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setAuthErr('ელ.ფოსტა ან პაროლი არასწორია'); return }
    if (data.user) loadProfile(data.user.id)
  }

  async function doRegister() {
    setAuthErr(''); setLoading(true)
    if (!fullName || !clinicName || !city || !phone || !email || !password) {
      setAuthErr('გთხოვთ შეავსოთ ყველა ველი'); setLoading(false); return
    }
    if (password.length < 6) { setAuthErr('პაროლი მინ. 6 სიმბოლო'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, clinic_name: clinicName, city, phone, role: 'doctor' } }
    })
    if (error) { setAuthErr(error.message === 'User already registered' ? 'ეს ელ.ფოსტა უკვე დარეგისტრირებულია' : 'რეგისტრაცია ვერ მოხერხდა: ' + error.message); setLoading(false); return }
    if (!data.user) { setAuthErr('რეგისტრაცია ვერ მოხერხდა'); setLoading(false); return }

    // Create profile record (in case DB trigger doesn't exist)
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      clinic_name: clinicName,
      city,
      phone,
      email,
      role: 'doctor',
      status: 'pending',
    })
    setLoading(false)
    if (profErr) { setAuthErr('პროფილი ვერ შეიქმნა: ' + profErr.message); return }
    loadProfile(data.user.id)
  }

  async function doLogout() {
    await supabase.auth.signOut()
    setUser(null); setScreen('login'); setProducts([]); setRequests([])
  }

  async function sendRequest(type: string, productId?: string) {
    if (!user) return
    const { error } = await supabase.from('requests').insert({ user_id: user.id, product_id: productId, type })
    if (!error) {
      showToast(type === 'price' ? '✓ ფასის მოთხოვნა გაიგზავნა!' : type === 'demo' ? '✓ დემოს მოთხოვნა გაიგზავნა!' : '✓ გაიგზავნა!')
      loadRequests(user.id)
    }
  }

  async function sendTicket() {
    if (!user || !ticketDesc) return
    setLoading(true)
    const { error } = await supabase.from('service_tickets').insert({ user_id: user.id, problem_desc: ticketDesc, serial_number: ticketSerial })
    setLoading(false)
    if (!error) { showToast('✓ სერვის ტიკეტი გაიგზავნა!'); setTicketDesc(''); setTicketSerial(''); setShowTicket(false) }
  }

  const ini = user ? user.full_name.split(' ').map((w:string) => w[0]).join('').substring(0,2).toUpperCase() : ''

  // ─── STYLES ───────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Georgia', serif", background: '#f7f6f2', minHeight: '100vh' },
    header: { background: G, padding: '14px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100 },
    headerTitle: { color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: 0.3 },
    headerSub: { color: '#9FE1CB', fontSize: 11, marginTop: 1 },
    content: { paddingBottom: 80 },
    // bottom nav
    bnav: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', zIndex: 100 },
    bn: { flex: 1, padding: '10px 4px 12px', textAlign: 'center' as const, cursor: 'pointer', border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3 },
    bnIcon: { fontSize: 18 },
    bnLabel: { fontSize: 10, color: '#888' },
    bnLabelOn: { fontSize: 10, color: G, fontWeight: 600 },
    // auth
    authWrap: { minHeight: '100vh', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    authCard: { background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, border: '0.5px solid rgba(0,0,0,0.08)' },
    authLogo: { textAlign: 'center' as const, marginBottom: 22 },
    authLogoCircle: { width: 60, height: 60, background: G, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 26 },
    authTabs: { display: 'flex', background: '#f5f5f0', borderRadius: 10, padding: 3, marginBottom: 18 },
    authTab: { flex: 1, padding: '8px', textAlign: 'center' as const, fontSize: 13, cursor: 'pointer', borderRadius: 8, border: 'none', background: 'transparent', color: '#888', fontFamily: 'Georgia, serif' },
    authTabOn: { background: '#fff', color: G, fontWeight: 600, border: '0.5px solid rgba(0,0,0,0.1)' },
    field: { marginBottom: 10 },
    label: { fontSize: 11, color: '#888', display: 'block', marginBottom: 3 },
    input: { width: '100%', padding: '10px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 10, fontSize: 13, background: '#fafaf8', color: '#1a1a1a', boxSizing: 'border-box' as const, fontFamily: 'Georgia, serif' },
    select: { width: '100%', padding: '10px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 10, fontSize: 13, background: '#fafaf8', color: '#1a1a1a', boxSizing: 'border-box' as const, fontFamily: 'Georgia, serif' },
    btn: { width: '100%', background: G, color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontSize: 14, cursor: 'pointer', fontWeight: 600, fontFamily: 'Georgia, serif', marginTop: 4 },
    errMsg: { fontSize: 12, color: '#E24B4A', textAlign: 'center' as const, marginTop: 8 },
    // catalog
    searchRow: { padding: '10px 14px', display: 'flex', gap: 8, background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)' },
    searchInput: { flex: 1, padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, fontSize: 13, background: '#fafaf8', fontFamily: 'Georgia, serif' },
    catRow: { display: 'flex', gap: 6, padding: '10px 14px', overflowX: 'auto' as const, background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)' },
    catPill: { whiteSpace: 'nowrap' as const, padding: '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555', fontFamily: 'Georgia, serif' },
    catPillOn: { background: GL, borderColor: '#5DCAA5', color: G, fontWeight: 600 },
    prodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 14 },
    prodCard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer' },
    prodImg: { background: '#f5f5f0', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 },
    prodBody: { padding: '10px' },
    prodCat: { fontSize: 10, color: G, fontWeight: 600, marginBottom: 2 },
    prodName: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 },
    prodPrice: { fontSize: 13, fontWeight: 600, color: G, marginTop: 5 },
    prodPriceLock: { fontSize: 11, color: '#bbb', fontStyle: 'italic', marginTop: 5 },
    prodInst: { fontSize: 10, color: '#999', marginTop: 1 },
    prodBtn: { marginTop: 8, background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 8px', width: '100%', fontSize: 11, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 600 },
    // product detail
    detHeader: { background: G, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 },
    backBtn: { background: 'none', border: 'none', color: '#9FE1CB', fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1 },
    detImg: { background: '#f5f5f0', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 },
    detBody: { padding: 16 },
    priceBox: { background: GL, border: '0.5px solid #5DCAA5', borderRadius: 14, padding: 14, marginBottom: 14 },
    lockBox: { background: '#f8f8f6', borderRadius: 14, padding: 18, textAlign: 'center' as const, border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 14 },
    specsCard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', padding: 14, marginBottom: 14 },
    specRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' },
    actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 },
    actBtnPri: { background: G, color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'Georgia, serif' },
    actBtnSec: { background: '#f0fdf8', color: G, border: '0.5px solid #5DCAA5', borderRadius: 12, padding: 12, fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'Georgia, serif' },
    // service
    svcList: { padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 8 },
    svcCard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
    svcIco: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
    svcInfo: { flex: 1 },
    svcTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
    svcSub: { fontSize: 12, color: '#888', marginTop: 2 },
    svcArr: { fontSize: 20, color: '#ccc' },
    formCard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', padding: 16, margin: '0 14px' },
    textarea: { width: '100%', padding: '9px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 10, fontSize: 13, background: '#fafaf8', fontFamily: 'Georgia, serif', resize: 'none' as const, height: 80, boxSizing: 'border-box' as const },
    // academy
    wcard: { background: GL, border: '0.5px solid #5DCAA5', borderRadius: 14, padding: 14, margin: '14px 14px 0' },
    vcard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', margin: '8px 14px 0', cursor: 'pointer' },
    vthumb: { width: 80, height: 60, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    vinfo: { padding: '8px 10px', flex: 1 },
    // profile
    profileHero: { background: G, paddingTop: 24, paddingBottom: 20, paddingLeft: 20, paddingRight: 20, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 30, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 10 },
    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '14px 14px 0' },
    statCard: { background: '#fff', borderRadius: 12, padding: 12, border: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center' as const },
    histCard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', margin: '14px 14px 0' },
    histRow: { padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 },
    infoCard: { background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', margin: '14px 14px 0' },
    infoRow: { padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' },
    logoutBtn: { margin: '14px', background: '#f5f5f0', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 12, width: 'calc(100% - 28px)', fontSize: 13, color: '#888', cursor: 'pointer', fontFamily: 'Georgia, serif' },
    sectionTitle: { fontSize: 11, color: '#aaa', fontWeight: 600, letterSpacing: 0.8, padding: '12px 14px 0' },
    // toast
    toastBox: { position: 'fixed' as const, top: 20, left: '50%', transform: 'translateX(-50%)', background: G, color: '#fff', padding: '10px 20px', borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: 'nowrap' as const },
  }

  // ─── AUTH SCREEN ────────────────────────────────────────
  if (!user) return (
    <div style={s.authWrap}>
      {toast && <div style={s.toastBox}>{toast}</div>}
      <div style={s.authCard}>
        <div style={s.authLogo}>
          <div style={s.authLogoCircle}>🦷</div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Medical Line Pro</h1>
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Eighteeth ექსკლუზიური დისტრიბუტორი</p>
        </div>
        <div style={s.authTabs}>
          <button style={{ ...s.authTab, ...(authTab === 'login' ? s.authTabOn : {}) }} onClick={() => { setAuthTab('login'); setAuthErr('') }}>შესვლა</button>
          <button style={{ ...s.authTab, ...(authTab === 'register' ? s.authTabOn : {}) }} onClick={() => { setAuthTab('register'); setAuthErr('') }}>რეგისტრაცია</button>
        </div>

        {authTab === 'login' ? (
          <>
            <div style={s.field}><label style={s.label}>ელ.ფოსტა</label><input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@clinic.ge" /></div>
            <div style={s.field}><label style={s.label}>პაროლი</label><input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            <button style={s.btn} onClick={doLogin} disabled={loading}>{loading ? 'იტვირთება...' : 'შესვლა'}</button>
          </>
        ) : (
          <>
            <div style={s.field}><label style={s.label}>სახელი და გვარი</label><input style={s.input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="დავით ბერიძე" /></div>
            <div style={s.field}><label style={s.label}>კლინიკის სახელი</label><input style={s.input} value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Dental Smile" /></div>
            <div style={s.field}><label style={s.label}>ქალაქი</label>
              <select style={s.select} value={city} onChange={e => setCity(e.target.value)}>
                <option value="">აირჩიე...</option>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>ტელეფონი</label><input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="555 000 000" /></div>
            <div style={s.field}><label style={s.label}>ელ.ფოსტა</label><input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@clinic.ge" /></div>
            <div style={s.field}><label style={s.label}>პაროლი</label><input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="მინ. 6 სიმბოლო" /></div>
            <button style={s.btn} onClick={doRegister} disabled={loading}>{loading ? 'იტვირთება...' : 'დარეგისტრირება და ფასების ნახვა'}</button>
            <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 8 }}>რეგისტრაციის შემდეგ ყველა ფასი ხილვადი გახდება</p>
          </>
        )}
        {authErr && <p style={s.errMsg}>{authErr}</p>}
      </div>
    </div>
  )

  // ─── PRODUCT DETAIL ─────────────────────────────────────
  if (screen === 'product' && selectedProduct) {
    const p = selectedProduct
    const price = p.prices?.[0]
    const specs = Object.entries(p.specs || {})
    const catEmojis: Record<string,string> = { scan: '🦷', radio: '📡', endo: '⚙️', optics: '🔬', hygiene: '🧪', partner: '🪑', other: '📦' }
    return (
      <div style={s.wrap}>
        {toast && <div style={s.toastBox}>{toast}</div>}
        <div style={s.detHeader}>
          <button style={s.backBtn} onClick={() => setScreen('catalog')}>‹</button>
          <div>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>{p.name}</p>
            <p style={{ color: '#9FE1CB', fontSize: 11, margin: 0 }}>{p.brand}</p>
          </div>
        </div>
        <div style={s.detImg}>{catEmojis[p.category_slug] || '🦷'}</div>
        <div style={s.detBody}>
          {p.short_desc && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>{p.short_desc}</p>}
          {price ? (
            <div style={s.priceBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 11, color: '#0F6E56', margin: 0 }}>ფასი (დღგ-ს გარეშე)</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#04342C', margin: '2px 0 0' }}>₾{price.price_gel?.toLocaleString()}</p>
                  {price.price_usd && <p style={{ fontSize: 12, color: '#0F6E56', margin: 0 }}>${price.price_usd?.toLocaleString()}</p>}
                </div>
                {price.installment_monthly && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: '#0F6E56', margin: 0 }}>განვადება</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#04342C', margin: '2px 0 0' }}>₾{Math.round(price.installment_monthly)}<span style={{ fontSize: 12, fontWeight: 400 }}>/თვე</span></p>
                    <p style={{ fontSize: 11, color: '#0F6E56', margin: 0 }}>{price.installment_months} თვე · Credo</p>
                  </div>
                )}
              </div>
              {price.note && <p style={{ fontSize: 12, color: '#0F6E56', marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #9FE1CB' }}>✓ {price.note}</p>}
            </div>
          ) : (
            <div style={s.lockBox}>
              <p style={{ fontSize: 24, margin: '0 0 8px' }}>🔒</p>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>ფასი ხილვადია დარეგისტრირებულთათვის</p>
            </div>
          )}
          {specs.length > 0 && (
            <div style={s.specsCard}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>ტექნიკური მახასიათებლები</p>
              {specs.map(([k, v]) => (
                <div key={k} style={s.specRow}>
                  <span style={{ fontSize: 13, color: '#888' }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 600 }}>{v as string}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 4px' }}>📞 514 011 116</p>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 4px' }}>✉️ ltdmedicalline@gmail.com</p>
            <p style={{ fontSize: 13, color: '#555', margin: 0 }}>📍 თბილისი, დ. ჯაბიძის #8</p>
          </div>
          <div style={s.actionRow}>
            <button style={s.actBtnSec} onClick={() => sendRequest('demo', p.id)}>დემოს ჯავშნა</button>
            <button style={s.actBtnPri} onClick={() => sendRequest('price', p.id)}>ფასის მოთხოვნა</button>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </div>
    )
  }

  const catEmojis: Record<string,string> = { scan: '🦷', radio: '📡', endo: '⚙️', optics: '🔬', hygiene: '🧪', partner: '🪑', other: '📦' }

  return (
    <div style={s.wrap}>
      {toast && <div style={s.toastBox}>{toast}</div>}

      {/* HEADER */}
      <div style={s.header}>
        <div>
          <p style={s.headerTitle}>Medical Line Pro</p>
          <p style={s.headerSub}>{user.clinic_name} · {user.city}</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>{ini}</div>
      </div>

      <div style={s.content}>
        {/* ── CATALOG ── */}
        {screen === 'catalog' && (
          <>
            <div style={s.searchRow}>
              <input style={s.searchInput} placeholder="🔍 პროდუქტის ძიება..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ ...s.catRow, msOverflowStyle: 'none' }}>
              {CATS.map(c => (
                <button key={c.slug} style={{ ...s.catPill, ...(cat === c.slug ? s.catPillOn : {}) }} onClick={() => setCat(c.slug)}>{c.label}</button>
              ))}
            </div>
            {filteredProds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 14 }}>პროდუქტი ვერ მოიძებნა</div>
            ) : (
              <div style={s.prodGrid}>
                {filteredProds.map(p => {
                  const price = p.prices?.[0]
                  return (
                    <div key={p.id} style={s.prodCard} onClick={() => { setSelectedProduct(p); setScreen('product') }}>
                      <div style={s.prodImg}>{catEmojis[p.category_slug] || '🦷'}</div>
                      <div style={s.prodBody}>
                        <p style={s.prodCat}>{p.brand}</p>
                        <p style={s.prodName}>{p.name}</p>
                        {price ? (
                          <>
                            <p style={s.prodPrice}>₾{price.price_gel?.toLocaleString()}</p>
                            {price.installment_monthly && <p style={s.prodInst}>₾{Math.round(price.installment_monthly)}/თვე</p>}
                          </>
                        ) : <p style={s.prodPriceLock}>🔒 შედი ფასის სანახავად</p>}
                        <button style={s.prodBtn}>დეტალები</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── SERVICE ── */}
        {screen === 'service' && (
          <div style={s.svcList}>
            {[
              { ico: '🛠️', title: 'სერვის ტიკეტი', sub: 'ინჟინერის გამოძახება', bg: GL, action: () => setShowTicket(v => !v) },
              { ico: '🛡️', title: 'გარანტიის სტატუსი', sub: 'სერიული ნომრით', bg: '#FAEEDA', action: () => {} },
              { ico: '📋', title: 'Manuals / FAQ', sub: 'ინსტრუქციები', bg: '#E6F1FB', action: () => {} },
              { ico: '📦', title: 'ნაწილების შეკვეთა', sub: 'სათადარიგო კომპლექტები', bg: GL, action: () => {} },
            ].map(item => (
              <div key={item.title} style={s.svcCard} onClick={item.action}>
                <div style={{ ...s.svcIco, background: item.bg }}>{item.ico}</div>
                <div style={s.svcInfo}>
                  <p style={{ ...s.svcTitle, margin: 0 }}>{item.title}</p>
                  <p style={{ ...s.svcSub, margin: 0 }}>{item.sub}</p>
                </div>
                <span style={s.svcArr}>›</span>
              </div>
            ))}
            {showTicket && (
              <div style={s.formCard}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ახალი სერვის ტიკეტი</p>
                <div style={s.field}><label style={s.label}>სერიული ნომერი (სურვილისამებრ)</label><input style={s.input} value={ticketSerial} onChange={e => setTicketSerial(e.target.value)} placeholder="SN-XXXXXXX" /></div>
                <div style={s.field}><label style={s.label}>პრობლემის აღწერა *</label><textarea style={s.textarea} value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="მოკლედ აღწერე..." /></div>
                <button style={s.btn} onClick={sendTicket} disabled={loading}>{loading ? 'იგზავნება...' : '📨 ტიკეტის გაგზავნა'}</button>
              </div>
            )}
          </div>
        )}

        {/* ── ACADEMY ── */}
        {screen === 'academy' && (
          <>
            {academy.filter(a => a.type === 'webinar').map(w => (
              <div key={w.id} style={s.wcard}>
                <p style={{ fontSize: 11, color: '#085041', fontWeight: 600, margin: '0 0 3px' }}>📅 {w.webinar_date ? new Date(w.webinar_date).toLocaleDateString('ka-GE') : 'მალე'}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#04342C', margin: '0 0 8px' }}>{w.title}</p>
                <button style={{ fontSize: 12, background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>დარეგისტრირება</button>
              </div>
            ))}
            <p style={s.sectionTitle}>ტრენინგ ვიდეოები</p>
            {academy.filter(a => a.type === 'video').map(v => (
              <div key={v.id} style={s.vcard}>
                <div style={s.vthumb}><div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ borderLeft: '8px solid #fff', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} /></div></div>
                <div style={s.vinfo}>
                  <p style={{ fontSize: 10, color: G, fontWeight: 600, margin: '0 0 2px' }}>ვიდეო</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: '0 0 3px', lineHeight: 1.3 }}>{v.title}</p>
                  {v.duration_sec && <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>▶ {Math.floor(v.duration_sec/60)}:{String(v.duration_sec%60).padStart(2,'0')}</p>}
                </div>
              </div>
            ))}
            <p style={s.sectionTitle}>მანუალები</p>
            {academy.filter(a => a.type === 'manual').map(m => (
              <div key={m.id} style={{ ...s.vcard, alignItems: 'center' }}>
                <div style={{ ...s.vthumb, background: '#3C3489' }}><span style={{ fontSize: 20 }}>📄</span></div>
                <div style={s.vinfo}>
                  <p style={{ fontSize: 10, color: '#534AB7', fontWeight: 600, margin: '0 0 2px' }}>მანუალი</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.3 }}>{m.title}</p>
                </div>
              </div>
            ))}
            <div style={{ height: 20 }} />
          </>
        )}

        {/* ── PROFILE ── */}
        {screen === 'profile' && (
          <>
            <div style={s.profileHero}>
              <div style={s.avatar}>{ini}</div>
              <p style={{ color: '#fff', fontSize: 17, fontWeight: 600, margin: 0 }}>{user.full_name}</p>
              <p style={{ color: '#9FE1CB', fontSize: 13, margin: '3px 0 10px' }}>{user.clinic_name}</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ background: '#1D9E75', color: '#E1F5EE', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>✓ ვერიფიცირებული</span>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#9FE1CB', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{user.city}</span>
              </div>
            </div>
            <div style={s.statGrid}>
              {[
                { val: requests.length, lab: 'მოთხოვნა' },
                { val: requests.filter(r => r.status === 'new').length, lab: 'მიმდინარე' },
                { val: requests.filter(r => r.status === 'done').length, lab: 'დასრულებული' },
                { val: 0, lab: 'სერვის ტიკეტი' },
              ].map(st => (
                <div key={st.lab} style={s.statCard}>
                  <p style={{ fontSize: 26, fontWeight: 700, color: G, margin: 0 }}>{st.val}</p>
                  <p style={{ fontSize: 12, color: '#888', margin: '3px 0 0' }}>{st.lab}</p>
                </div>
              ))}
            </div>
            {requests.length > 0 && (
              <>
                <p style={s.sectionTitle}>ბოლო მოთხოვნები</p>
                <div style={s.histCard}>
                  {requests.slice(0, 6).map(r => (
                    <div key={r.id} style={s.histRow}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: r.status === 'done' ? '#1D9E75' : r.status === 'new' ? '#185FA5' : '#BA7517', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{r.products?.name || '—'} — {TYPE_LABELS[r.type] || r.type}</p>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{new Date(r.created_at).toLocaleDateString('ka-GE')}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: r.status === 'done' ? '#1D9E75' : r.status === 'new' ? '#185FA5' : '#BA7517' }}>{STATUS_LABELS[r.status] || r.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p style={s.sectionTitle}>ანგარიშის ინფო</p>
            <div style={s.infoCard}>
              {[['სახელი', user.full_name], ['კლინიკა', user.clinic_name], ['ტელეფონი', user.phone], ['ქალაქი', user.city]].map(([k, v]) => (
                <div key={k} style={s.infoRow}>
                  <span style={{ fontSize: 13, color: '#888' }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <button style={s.logoutBtn} onClick={doLogout}>გამოსვლა</button>
            <div style={{ height: 20 }} />
          </>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={s.bnav}>
        {[
          { id: 'catalog', ico: '🏪', label: 'კატალოგი' },
          { id: 'service', ico: '🔧', label: 'სერვისი' },
          { id: 'academy', ico: '🎓', label: 'Academy' },
          { id: 'profile', ico: '👤', label: 'პროფილი' },
        ].map(item => (
          <button key={item.id} style={s.bn} onClick={() => setScreen(item.id as Screen)}>
            <span style={s.bnIcon}>{item.ico}</span>
            <span style={screen === item.id ? s.bnLabelOn : s.bnLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}