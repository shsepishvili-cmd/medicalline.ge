'use client'
import { useEffect, useState, useCallback } from 'react'
import { isSupabaseReady, supabase, supabaseConfigError } from '../lib/supabase'
import { findCatalogProductByAny, findDatabaseProductMatch, inferBrand, localCatalogProducts, mapCategoryToSlug, type LocalCatalogAiFeature, type LocalCatalogProduct, specsArrayToRecord } from '../lib/catalogSync'

type Screen = 'login' | 'register' | 'catalog' | 'product' | 'service' | 'academy' | 'profile' | 'proposal'
type User = { id: string; full_name: string; clinic_name: string; city: string; phone: string; role: string; status: string }
type Product = { id: string; dbId?: string | null; slug: string; name: string; category_slug: string; brand: string; short_desc: string; specs: Record<string,string>; images?: string[]; prices: { price_gel: number; price_usd: number; installment_monthly: number; installment_months: number; note: string }[] }
type Request = { id: string; type: string; status: string; created_at: string; products: { name: string } }
type AcademyItem = { id: string; product_id: string | null; title: string; description: string | null; video_type: string; youtube_video_id: string | null; youtube_url: string | null; thumbnail_url: string | null; channel_title: string | null; duration_iso: string | null; is_featured: boolean; sort_order: number; products?: { id: string; name: string; brand: string | null; slug: string } | null }
type ServiceTicket = { id: string; serial_number: string | null; problem_desc: string; status: string; created_at: string; visit_date: string | null; resolution: string | null; attachments?: string[] | null; products?: { name: string } | null }
type ProposalForm = {
  recipientName: string
  clinicName: string
  phone: string
  email: string
  taxId: string
  address: string
  validDays: number
  paymentTerms: string
  note: string
}
type CatalogAiFeature = LocalCatalogAiFeature
type CatalogProduct = LocalCatalogProduct

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'helios-700': '/images/helios700.png',
  'helios-680': '/images/helios680.png',
  'helios-600': '/images/helios600.png',
  'helios-500': '/images/helios500.png',
  'finscan-f350': '/images/finscan.png',
  'hyperlight': '/images/hyperlightm.png',
  'hyperlight-g': '/images/hyperlightg.png',
  'nanopix-1': '/images/nanopix1.png',
  'e-connect-s-plus': '/images/econnectsplus.png',
  'e-connect-s': '/images/econnects.png',
  'e-xtreme': '/images/extreme.png',
  'e-pex': '/images/epex.png',
  'acuvision-x': '/images/acuvisionx.jpg',
  'brilliance': '/images/brilliance.jpg',
  'ultramint-pro': '/images/ultramint.png',
  'e-sanit': '/images/esanit.png',
  'hager-g4': '/images/hager-g4.jpg',
  'hager-h5': '/images/hager-h5.jpg',
}

function getProductImage(product: Product) {
  return product.images?.[0] || PRODUCT_IMAGE_MAP[product.slug] || ''
}

function getCatalogProduct(product: Product): CatalogProduct | undefined {
  return findCatalogProductByAny(product) as CatalogProduct | undefined
}

function buildInstallmentCode(product: Product) {
  return `ML-${product.slug.replace(/[^a-z0-9]+/gi, '-').toUpperCase()}`
}

function buildAiSalesCopy(product: Product, catalogProduct?: CatalogProduct, monthlyEstimate?: number) {
  const topSpec = catalogProduct?.specs?.[0]
  const summary = catalogProduct?.description || product.short_desc || `${product.name} კლინიკისთვის პრაქტიკული არჩევანია.`
  const monthlyText = monthlyEstimate ? `დაახლოებით ₾${Math.round(monthlyEstimate)}/თვიდან` : 'მოქნილი გადახდის პირობებით'

  return `${summary} განსაკუთრებით გამოგადგებათ, თუ თქვენთვის მნიშვნელოვანია სწრაფი დანერგვა, სანდო შედეგი და ${monthlyText}.${topSpec ? ` მთავარი უპირატესობა: ${topSpec}.` : ''}`
}

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
const VAT_RATE = 0.18
const COMPANY_BILLING = {
  name: 'Medical Line Georgia',
  legalName: 'შპს მედიქალ ლაინ ჯორჯია',
  taxId: '417893569',
  address: 'თბილისი, დ. ჯაბიძის #8',
  phone: '514 011 116',
  bankName: 'საქართველოს ბანკი',
  iban: 'GE50BG0000000103262327GEL',
}

function formatMoney(value: number) {
  return `₾${value.toLocaleString('ka-GE', { maximumFractionDigits: 2 })}`
}

export default function ClinicApp() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProds, setFilteredProds] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [proposalItems, setProposalItems] = useState<Product[]>([])
  const [proposalQuantities, setProposalQuantities] = useState<Record<string, number>>({})
  const [proposalDiscountPct, setProposalDiscountPct] = useState(0)
  const [proposalVatMode, setProposalVatMode] = useState<'included' | 'excluded'>('included')
  const [proposalInvoiceNo] = useState(() => {
    const now = new Date()
    return `ML-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [proposalForm, setProposalForm] = useState<ProposalForm>({
    recipientName: '',
    clinicName: '',
    phone: '',
    email: '',
    taxId: '',
    address: '',
    validDays: 14,
    paymentTerms: '50% ავანსი, დარჩენილი თანხა მიწოდებამდე',
    note: '',
  })

  const toggleProposalItem = (p: Product) => {
    const exists = proposalItems.some(item => item.id === p.id)

    setProposalItems(prev => {
      if (exists) {
        return prev.filter(item => item.id !== p.id)
      }
      return [...prev, p]
    })
    setProposalQuantities(prev => {
      if (exists) {
        const next = { ...prev }
        delete next[p.id]
        return next
      }
      return { ...prev, [p.id]: prev[p.id] || 1 }
    })
  }
  const [installmentMonths, setInstallmentMonths] = useState(12)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [requests, setRequests] = useState<Request[]>([])
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([])
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
  const [ticketProductId, setTicketProductId] = useState('')
  const [ticketVisitDate, setTicketVisitDate] = useState('')
  const [ticketFiles, setTicketFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showTicket, setShowTicket] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const getFriendlyAuthError = useCallback((error: unknown) => {
    if (supabaseConfigError) {
      return 'რეგისტრაცია დროებით მიუწვდომელია. ავტორიზაციის სერვერის კონფიგურაცია აკლია ან არასწორია.'
    }

    if (error instanceof Error) {
      if (error.message === 'User already registered') {
        return 'ეს ელ.ფოსტა უკვე დარეგისტრირებულია'
      }

      if (error.message === 'Email rate limit exceeded') {
        return 'ამ ელფოსტაზე ზედიზედ ბევრი დადასტურების წერილი გაიგზავნა. გთხოვ, რამდენიმე წუთში სცადო თავიდან ან შეხვიდე უკვე შექმნილი ანგარიშით.'
      }

      const message = error.message.toLowerCase()
      if (
        message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('network request failed') ||
        message.includes('load failed')
      ) {
        return 'რეგისტრაცია ვერ მოხერხდა. ავტორიზაციის სერვერთან კავშირი ვერ დამყარდა.'
      }

      return error.message
    }

    return 'რეგისტრაცია ვერ მოხერხდა. სცადეთ მოგვიანებით.'
  }, [])

  useEffect(() => {
    if (!isSupabaseReady) {
      setAuthErr('რეგისტრაცია დროებით მიუწვდომელია. სერვერის კონფიგურაცია შესამოწმებელია.')
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id)
    }).catch(() => {
      setAuthErr('ავტორიზაციის სერვერთან კავშირი ვერ დამყარდა.')
    })
  }, [])

  useEffect(() => {
    let list = products
    if (cat) list = list.filter(p => p.category_slug === cat)
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
    setFilteredProds(list)
  }, [products, cat, search])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`clinic-live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadRequests(user.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, () => {
        loadServiceTickets(user.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prices' }, () => {
        loadProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!loading && !showTicket && ticketDesc === '' && ticketSerial === '') {
      if (ticketProductId) setTicketProductId('')
      if (ticketVisitDate) setTicketVisitDate('')
      loadServiceTickets(user.id)
    }
  }, [user, loading, showTicket, ticketDesc, ticketSerial, ticketProductId, ticketVisitDate])

  useEffect(() => {
    if (!user) return
    setProposalForm(prev => ({
      ...prev,
      recipientName: prev.recipientName || user.full_name,
      clinicName: prev.clinicName || user.clinic_name,
      phone: prev.phone || user.phone,
    }))
  }, [user])

  async function loadProfile(uid: string) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (error) {
        setAuthErr('პროფილის ჩატვირთვა ვერ მოხერხდა. საჭიროა `profiles` policy-ს შემოწმება.')
        return
      }
      if (data) { setUser(data); setScreen('catalog'); loadProducts(); loadRequests(uid); loadServiceTickets(uid); loadAcademy() }
    } catch {
      setAuthErr('პროფილის ჩატვირთვა ვერ მოხერხდა. ბაზის policy-ს კონფლიქტია.')
    }
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*, prices(*)').eq('is_active', true).order('sort_order')
    const dbProducts = data || []
    const matchedIds = new Set<string>()

    const mergedCatalogProducts: Product[] = localCatalogProducts.map((item) => {
      const dbMatch = findDatabaseProductMatch(dbProducts as Product[], item) as Product | undefined

      if (dbMatch) {
        matchedIds.add(dbMatch.id)
      }

      return {
        id: dbMatch?.id || `catalog-${item.slug}`,
        dbId: dbMatch?.id || null,
        slug: dbMatch?.slug || item.slug,
        name: dbMatch?.name || item.name,
        category_slug: dbMatch?.category_slug || mapCategoryToSlug(item.cat),
        brand: dbMatch?.brand || 'Eighteeth',
        short_desc: dbMatch?.short_desc || item.description,
        specs: Object.keys(dbMatch?.specs || {}).length ? dbMatch!.specs : specsArrayToRecord(item.specs),
        images: dbMatch?.images?.length ? dbMatch.images : [item.img],
        prices: dbMatch?.prices || [],
      }
    })

    const dbOnlyProducts = dbProducts
      .filter((product: Product) => !matchedIds.has(product.id))
      .map((product: Product) => ({ ...product, dbId: product.id }))
    const all = [...mergedCatalogProducts, ...dbOnlyProducts]
    setProducts(all)
    setSelectedProduct(prev => {
      if (!prev) return prev
      return all.find(p => p.id === prev.id || p.slug === prev.slug) || prev
    })
  }

  async function loadRequests(uid: string) {
    const { data } = await supabase.from('requests').select('*, products(name)').eq('user_id', uid).order('created_at', { ascending: false })
    if (data) setRequests(data)
  }

  async function loadAcademy() {
    const { data } = await supabase
      .from('academy_videos')
      .select('*, products(id, name, brand, slug)')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })
    if (data) setAcademy(data as AcademyItem[])
  }

  async function loadServiceTickets(uid: string) {
    const { data } = await supabase
      .from('service_tickets')
      .select('id, serial_number, problem_desc, status, created_at, visit_date, resolution, attachments, products(name)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (data) setServiceTickets(data as unknown as ServiceTicket[])
  }

  async function doLogin() {
    if (!isSupabaseReady) {
      setAuthErr(getFriendlyAuthError(new Error('Supabase configuration error')))
      return
    }
    setAuthErr(''); setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) { setAuthErr('ელ.ფოსტა ან პაროლი არასწორია'); return }
      if (data.user) loadProfile(data.user.id)
    } catch (error) {
      setLoading(false)
      setAuthErr(getFriendlyAuthError(error))
    }
  }

  async function doRegister() {
    if (!isSupabaseReady) {
      setAuthErr(getFriendlyAuthError(new Error('Supabase configuration error')))
      return
    }
    setAuthErr(''); setLoading(true)
    if (!fullName || !clinicName || !city || !phone || !email || !password) {
      setAuthErr('გთხოვთ შეავსოთ ყველა ველი'); setLoading(false); return
    }
    if (password.length < 6) { setAuthErr('პაროლი მინ. 6 სიმბოლო'); setLoading(false); return }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, clinic_name: clinicName, city, phone, role: 'doctor' } }
      })
      if (error) { setAuthErr(getFriendlyAuthError(error)); setLoading(false); return }
      if (!data.user) { setAuthErr('რეგისტრაცია ვერ მოხერხდა'); setLoading(false); return }

      setLoading(false)
      await supabase.auth.signOut()
      setAuthTab('login')
      setPassword('')
      showToast('რეგისტრაცია მიღებულია. სცადე შესვლა ცოტა მოგვიანებით ან დაელოდე ადმინისტრატორის დადასტურებას.')
    } catch (error) {
      setLoading(false)
      setAuthErr(getFriendlyAuthError(error))
    }
  }

  async function doLogout() {
    await supabase.auth.signOut()
    setUser(null); setScreen('login'); setProducts([]); setRequests([]); setServiceTickets([])
  }

  async function ensureClinicProductRecord(productId?: string) {
    if (!productId) return null

    const product = products.find((item) => item.id === productId || item.dbId === productId)
    if (!product) return null
    if (product.dbId) return product.dbId

    const source = findCatalogProductByAny(product)
    if (!source) return null

    const payload = {
      slug: source.slug,
      name: source.name,
      category_slug: mapCategoryToSlug(source.cat),
      brand: inferBrand(source),
      short_desc: source.description,
      specs: specsArrayToRecord(source.specs),
      images: [source.img],
      is_active: true,
      sort_order: source.id,
    }

    const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'slug' }).select('id').single()
    if (error || !data?.id) {
      showToast('პროდუქტის დაკავშირება ვერ მოხერხდა')
      return null
    }

    return data.id
  }

  async function sendRequest(type: string, productId?: string) {
    if (!user) return
    const resolvedProductId = await ensureClinicProductRecord(productId)
    const { error } = await supabase.from('requests').insert({ user_id: user.id, product_id: resolvedProductId, type })
    if (!error) {
      showToast(type === 'price' ? '✓ ფასის მოთხოვნა გაიგზავნა!' : type === 'demo' ? '✓ დემოს მოთხოვნა გაიგზავნა!' : '✓ გაიგზავნა!')
      loadRequests(user.id)
      return
    }
    showToast('მოთხოვნის გაგზავნა ვერ მოხერხდა')
  }

  async function sendTicket() {
    if (!user || !ticketDesc) return
    setLoading(true)

    // upload attachments first
    const uploadedUrls: string[] = []
    for (let i = 0; i < ticketFiles.length; i++) {
      const file = ticketFiles[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${i}.${ext}`
      setUploadProgress(Math.round(((i) / ticketFiles.length) * 80))
      const { data: up } = await supabase.storage.from('service-attachments').upload(path, file, { upsert: true })
      if (up) {
        const { data: pub } = supabase.storage.from('service-attachments').getPublicUrl(up.path)
        uploadedUrls.push(pub.publicUrl)
      }
    }
    setUploadProgress(90)

    const { error } = await supabase.from('service_tickets').insert({
      user_id: user.id,
      product_id: ticketProductId || null,
      problem_desc: ticketDesc,
      serial_number: ticketSerial || null,
      visit_date: ticketVisitDate || null,
      attachments: uploadedUrls.length ? uploadedUrls : null,
    })
    setLoading(false)
    setUploadProgress(0)
    if (!error) {
      showToast('✓ სერვის ტიკეტი გაიგზავნა!')
      setTicketDesc(''); setTicketSerial(''); setTicketFiles([]); setShowTicket(false)
    }
  }

  const ini = user ? user.full_name.split(' ').map((w:string) => w[0]).join('').substring(0,2).toUpperCase() : ''
  const pendingReqs = requests.filter(r => r.status === 'new').length
  const doneReqs = requests.filter(r => r.status === 'done').length
  const activeTickets = serviceTickets.filter(t => t.status !== 'done').length
  const ticketStatusLabel: Record<string, string> = { new: 'ახალი', assigned: 'დაგეგმილი', inprogress: 'მიმდინარე', done: 'დასრულებული' }
  const userStatusTone = user?.status === 'active' ? '#E1F5EE' : user?.status === 'blocked' ? '#FCEBEB' : '#FAEEDA'
  const userStatusText = user?.status === 'active' ? '#085041' : user?.status === 'blocked' ? '#791F1F' : '#633806'
  const proposalRows = proposalItems.map(product => {
    const quantity = Math.max(1, proposalQuantities[product.id] || 1)
    const unitPrice = product.prices[0]?.price_gel || 0
    const lineTotal = quantity * unitPrice

    return {
      product,
      quantity,
      unitPrice,
      lineTotal,
    }
  })
  const proposalSubtotal = proposalRows.reduce((acc, row) => acc + row.lineTotal, 0)
  const proposalDiscountValue = proposalSubtotal * (Math.max(0, proposalDiscountPct) / 100)
  const proposalNetTotal = Math.max(0, proposalSubtotal - proposalDiscountValue)
  const proposalVatValue = proposalVatMode === 'included'
    ? proposalNetTotal - (proposalNetTotal / (1 + VAT_RATE))
    : proposalNetTotal * VAT_RATE
  const proposalGrandTotal = proposalVatMode === 'included'
    ? proposalNetTotal
    : proposalNetTotal + proposalVatValue

  function openInvoicePdf() {
    window.print()
  }

  async function generateInvoicePdfBlob(): Promise<Blob | null> {
    const el = document.getElementById('proposal-print-area')
    if (!el) return null
    setGeneratingPdf(true)
    try {
      // temporarily show print-footer for full capture
      const footer = el.querySelector('.print-footer') as HTMLElement | null
      if (footer) footer.style.display = 'block'
      const noPrintEls = el.querySelectorAll('.no-print') as NodeListOf<HTMLElement>
      noPrintEls.forEach(e => { e.style.display = 'none' })

      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })

      if (footer) footer.style.display = ''
      noPrintEls.forEach(e => { e.style.display = '' })

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const imgW = pageW
      const imgH = (canvas.height * pageW) / canvas.width
      let y = 0
      while (y < imgH) {
        const srcY = (y * canvas.width) / pageW
        const srcH = Math.min((pageH * canvas.width) / pageW, canvas.height - srcY)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = srcH
        const ctx = pageCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
        if (y > 0) pdf.addPage()
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, (srcH * pageW) / canvas.width)
        y += pageH
      }
      return pdf.output('blob')
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function shareInvoiceWA() {
    const blob = await generateInvoicePdfBlob()
    if (!blob) return
    const filename = `invoice-${proposalInvoiceNo}.pdf`
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `ინვოისი ${proposalInvoiceNo}` })
        return
      } catch { /* cancelled */ }
    }
    // fallback: download + open WA
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    const waNum = proposalForm.phone ? proposalForm.phone.replace(/\D/g, '') : ''
    const waText = encodeURIComponent(`📄 ინვოისი ${proposalInvoiceNo} — Medical Line Georgia\nჯამი: ${formatMoney(proposalGrandTotal)}`)
    setTimeout(() => window.open(waNum ? `https://wa.me/995${waNum.replace(/^995/, '')}?text=${waText}` : `https://wa.me/?text=${waText}`, '_blank'), 400)
  }

  async function shareInvoiceEmail() {
    const blob = await generateInvoicePdfBlob()
    if (!blob) return
    const filename = `invoice-${proposalInvoiceNo}.pdf`
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `ინვოისი ${proposalInvoiceNo}`, text: `Medical Line Georgia` })
        return
      } catch { /* cancelled */ }
    }
    // fallback: download + open mailto
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    const subject = encodeURIComponent(`ინვოისი ${proposalInvoiceNo} — Medical Line Georgia`)
    const body = encodeURIComponent(`გამარჯობა,\n\nთანდართულ ფაილში იხილეთ ინვოისი.\n\nMedical Line Georgia · 514 011 116`)
    setTimeout(() => { window.location.href = `mailto:${proposalForm.email || ''}?subject=${subject}&body=${body}` }, 400)
  }

  // ─── STYLES ───────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Georgia', serif", background: '#f7f6f2', minHeight: '100vh', display: isDesktop ? 'flex' : 'block' },
    // desktop sidebar
    sidebar: { width: 230, background: G, minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, flexShrink: 0, position: 'sticky' as const, top: 0, height: '100vh', overflowY: 'auto' as const },
    sideNavBtn: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 24px', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 15, border: 'none', background: 'transparent', width: '100%', textAlign: 'left' as const, fontFamily: 'Georgia, serif', transition: 'background 0.15s' },
    sideNavBtnOn: { background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, borderLeft: '3px solid #9FE1CB', paddingLeft: 21 },
    header: { background: G, padding: '14px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100 },
    headerTitle: { color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: 0.3 },
    headerSub: { color: '#9FE1CB', fontSize: 11, marginTop: 1 },
    content: { paddingBottom: isDesktop ? 24 : 80 },
    // bottom nav (mobile only)
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
    searchRow: { padding: isDesktop ? '14px 28px' : '10px 14px', display: 'flex', gap: 8, background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)' },
    searchInput: { flex: 1, padding: isDesktop ? '10px 16px' : '8px 12px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, fontSize: isDesktop ? 15 : 13, background: '#fafaf8', fontFamily: 'Georgia, serif' },
    catRow: { display: 'flex', gap: isDesktop ? 8 : 6, padding: isDesktop ? '12px 28px' : '10px 14px', overflowX: 'auto' as const, background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)' },
    catPill: { whiteSpace: 'nowrap' as const, padding: isDesktop ? '7px 18px' : '5px 12px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', fontSize: isDesktop ? 14 : 12, cursor: 'pointer', color: '#555', fontFamily: 'Georgia, serif' },
    catPillOn: { background: GL, borderColor: '#5DCAA5', color: G, fontWeight: 600 },
    prodGrid: { display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr 1fr', gap: isDesktop ? 18 : 10, padding: isDesktop ? '24px 28px' : 14 },
    prodCard: { background: '#fff', borderRadius: isDesktop ? 18 : 14, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer', boxShadow: isDesktop ? '0 2px 12px rgba(0,0,0,0.06)' : undefined },
    prodImg: { background: '#f5f5f0', height: isDesktop ? 180 : 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 },
    prodBody: { padding: isDesktop ? '16px' : '10px' },
    prodCat: { fontSize: isDesktop ? 12 : 10, color: G, fontWeight: 600, marginBottom: 2 },
    prodName: { fontSize: isDesktop ? 16 : 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 },
    prodPrice: { fontSize: isDesktop ? 17 : 13, fontWeight: 700, color: G, marginTop: 5 },
    prodPriceLock: { fontSize: isDesktop ? 13 : 11, color: '#bbb', fontStyle: 'italic', marginTop: 5 },
    prodInst: { fontSize: isDesktop ? 12 : 10, color: '#999', marginTop: 1 },
    prodBtn: { marginTop: isDesktop ? 12 : 8, background: G, color: '#fff', border: 'none', borderRadius: isDesktop ? 10 : 8, padding: isDesktop ? '9px 12px' : '6px 8px', width: '100%', fontSize: isDesktop ? 13 : 11, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 600 },
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
    const catalogProduct = getCatalogProduct(p)
    const specs = Object.entries(p.specs || {})
    const siteSpecs = catalogProduct?.specs || []
    const aiFeatures = catalogProduct?.aiFeatures || []
    const imageSrc = getProductImage(p)
    const installmentCode = buildInstallmentCode(p)
    const installmentMessage = encodeURIComponent(`გამარჯობა, მაინტერესებს ${p.name}-ის განვადება. კოდი: ${installmentCode}`)
    const financeBase = price ? Number(price.price_gel || (price.installment_monthly || 0) * (price.installment_months || 12)) : 0
    const monthlyEstimate = financeBase && installmentMonths ? financeBase / installmentMonths : price?.installment_monthly
    const aiSalesCopy = buildAiSalesCopy(p, catalogProduct, monthlyEstimate)
    const catEmojis: Record<string,string> = { scan: '🦷', radio: '📡', endo: '⚙️', optics: '🔬', hygiene: '🧪', partner: '🪑', other: '📦' }
    const inProposal = proposalItems.some(item => item.id === p.id)

    const shareOfferWA = () => {
      const lines = [
        `🦷 *${p.name}* — Medical Line Georgia`,
        price ? `💰 ფასი: ₾${price.price_gel?.toLocaleString()}` : '',
        monthlyEstimate ? `📅 განვადება: ₾${Math.round(monthlyEstimate)}/თვე (${installmentMonths} თვე)` : '',
        ``,
        `📞 514 011 116`,
        `🌐 medicalline.ge`,
      ].filter(Boolean).join('\n')
      window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank')
    }
    const shareOfferEmail = () => {
      const subject = encodeURIComponent(`Medical Line — ${p.name}`)
      const body = encodeURIComponent([
        `გამარჯობა,`,
        ``,
        `გაგიგზავნით ინფორმაციას პროდუქტის შესახებ:`,
        ``,
        `პროდუქტი: ${p.name}`,
        `ბრენდი: ${p.brand}`,
        price ? `ფასი: ₾${price.price_gel?.toLocaleString()}` : '',
        monthlyEstimate ? `განვადება: ₾${Math.round(monthlyEstimate)}/თვე (${installmentMonths} თვე)` : '',
        ``,
        `Medical Line Georgia`,
        `ტელ: 514 011 116`,
        `medicalline.ge`,
      ].filter(l => l !== undefined).join('\n'))
      window.location.href = `mailto:?subject=${subject}&body=${body}`
    }

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
        <div style={s.detImg}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={p.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 18 }}
            />
          ) : (
            catEmojis[p.category_slug] || '🦷'
          )}
        </div>
        <div style={s.detBody}>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, marginBottom: 14 }}>{catalogProduct?.description || p.short_desc}</p>
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
          {price && (
            <div style={{ background: '#eef8ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, letterSpacing: 0.4, margin: 0 }}>განვადება პირდაპირ</p>
                  <p style={{ fontSize: 13, color: '#334155', margin: '4px 0 0' }}>კოდი: <span style={{ fontWeight: 700 }}>{installmentCode}</span></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#1d4ed8', margin: 0 }}>საწყისი შეთავაზება</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                    ₾{Math.round(monthlyEstimate || 0)}<span style={{ fontSize: 12, fontWeight: 400 }}>/თვე</span>
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                {[6, 12, 18, 24].map((months) => (
                  <button
                    key={months}
                    onClick={() => setInstallmentMonths(months)}
                    style={{
                      background: installmentMonths === months ? '#1d4ed8' : '#fff',
                      color: installmentMonths === months ? '#fff' : '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: 10,
                      padding: '8px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {months} თვე
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 10px' }}>
                სავარაუდო გადანაწილება: ₾{financeBase.toLocaleString()} / {installmentMonths} თვე = <span style={{ fontWeight: 700 }}>₾{Math.round(monthlyEstimate || 0)}/თვე</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <a
                  href={`https://wa.me/995514011116?text=${installmentMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: '#0f172a', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '11px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}
                >
                  განვადების მოთხოვნა
                </a>
                <a
                  href="tel:+995514011116"
                  style={{ background: '#fff', color: '#1d4ed8', textDecoration: 'none', borderRadius: 10, padding: '11px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, border: '1px solid #bfdbfe' }}
                >
                  დარეკვა ახლავე
                </a>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <button 
              style={{ ...s.actBtnSec, background: inProposal ? '#FCEBEB' : '#f0fdf8', borderColor: inProposal ? '#E24B4A' : '#5DCAA5', color: inProposal ? '#E24B4A' : G }} 
              onClick={() => toggleProposalItem(p)}
            >
              {inProposal ? '🗑 ამოღება ინვოისიდან' : '➕ ინვოისში დამატება'}
            </button>
            <button style={{ ...s.actBtnSec, background: '#f0fdf4', borderColor: '#22c55e', color: '#15803d' }} onClick={shareOfferWA}>📱 WhatsApp</button>
            <button style={{ ...s.actBtnSec, background: '#eff6ff', borderColor: '#60a5fa', color: '#1d4ed8' }} onClick={shareOfferEmail}>✉️ ელ.ფოსტა</button>
          </div>
          <div style={{ background: '#0f172a', color: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: '#93c5fd', margin: '0 0 8px' }}>AI ADVISOR</p>
            <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>{aiSalesCopy}</p>
          </div>
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
          {siteSpecs.length > 0 && (
            <div style={{ ...s.specsCard, background: '#f8fafc' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>კატალოგის highlights</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {siteSpecs.slice(0, 6).map((item) => (
                  <div key={item} style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, paddingLeft: 14, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, color: '#0f766e' }}>•</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
          {aiFeatures.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px' }}>AI Highlights</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {aiFeatures.map((feature) => (
                  <div key={feature.title} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', padding: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{feature.title}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{feature.desc}</p>
                  </div>
                ))}
              </div>
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

      <style>{`
        @media print {
          header, #app-header, .no-print, nav, button { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          #proposal-print-area { display: block !important; padding: 32px !important; max-width: 794px !important; margin: 0 auto !important; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 2px solid #085041; padding-bottom: 20px; margin-bottom: 30px; }
          .print-footer { display: block !important; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
          .svc-card-print { border: 1px solid #eee !important; margin-bottom: 10px !important; }
        }
        .print-header, .print-footer { display: none; }
        .side-nav-btn:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      {isDesktop && (
        <div style={s.sidebar}>
          <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 3px', letterSpacing: 0.5 }}>Medical Line</p>
            <p style={{ color: '#9FE1CB', fontSize: 12, margin: 0 }}>Pro კაბინეტი</p>
          </div>
          <div style={{ padding: '16px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
            <div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{user.full_name}</p>
              <p style={{ color: '#9FE1CB', fontSize: 11, margin: 0 }}>{user.clinic_name}</p>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '12px 0' }}>
            {[
              { id: 'catalog', ico: '🏪', label: 'კატალოგი' },
              { id: 'proposal', ico: '📄', label: 'ინვოისი', badge: proposalItems.length },
              { id: 'service', ico: '🔧', label: 'სერვისი' },
              { id: 'academy', ico: '🎓', label: 'Academy' },
              { id: 'profile', ico: '👤', label: 'პროფილი' },
            ].map(item => (
              <button key={item.id} className="side-nav-btn" style={{ ...s.sideNavBtn, ...(screen === item.id ? s.sideNavBtnOn : {}) }} onClick={() => setScreen(item.id as Screen)}>
                <span style={{ fontSize: 20 }}>{item.ico}</span>
                <span>{item.label}</span>
                {(item.badge ?? 0) > 0 && <span style={{ marginLeft: 'auto', background: '#E24B4A', color: '#fff', fontSize: 10, borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px' }}>
            <button onClick={doLogout} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia, serif' }}>გამოსვლა</button>
          </div>
        </div>
      )}

      {/* MAIN AREA */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

      {/* HEADER (mobile only) */}
      {!isDesktop && <div style={s.header} id="app-header">
        <div>
          <p style={s.headerTitle}>Medical Line Pro</p>
          <p style={s.headerSub}>{user.clinic_name} · {user.city}</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>{ini}</div>
      </div>}

      <div style={s.content}>
        {/* ── CATALOG ── */}
        {screen === 'catalog' && (
          <>
            <div style={{ padding: '12px 14px 0' }}>
              <div style={{ background: userStatusTone, borderRadius: 14, padding: '12px 14px', border: '0.5px solid rgba(0,0,0,0.06)', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: '0 0 3px' }}>Welcome back, {user.full_name.split(' ')[0]}</p>
                    <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
                      {user.status === 'active'
                        ? 'ფასები, განვადება და მოთხოვნები უკვე აქტიურია შენთვის.'
                        : user.status === 'blocked'
                          ? 'ანგარიში საჭიროებს ხელახლა გააქტიურებას. დაგვიკავშირდი მხარდაჭერასთან.'
                          : 'ანგარიში ელოდება დადასტურებას, თუმცა კატალოგის დათვალიერება უკვე შეგიძლია.'}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#fff', color: userStatusText, fontWeight: 600 }}>{user.status}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                <button onClick={() => setScreen('service')} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 18 }}>🔧</div>
                  <div style={{ fontSize: 11, color: '#1a1a1a', fontWeight: 600, marginTop: 4 }}>Service</div>
                </button>
                <button onClick={() => setScreen('academy')} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 18 }}>🎓</div>
                  <div style={{ fontSize: 11, color: '#1a1a1a', fontWeight: 600, marginTop: 4 }}>Academy</div>
                </button>
                <button onClick={() => setScreen('profile')} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '10px 8px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 18 }}>👤</div>
                  <div style={{ fontSize: 11, color: '#1a1a1a', fontWeight: 600, marginTop: 4 }}>Profile</div>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '10px 12px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: G, margin: 0 }}>{pendingReqs}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>ღია მოთხოვნა</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '10px 12px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: G, margin: 0 }}>{doneReqs}</p>
                  <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>დასრულებული</p>
                </div>
              </div>
            </div>
            <div style={s.searchRow}>
              <input style={s.searchInput} placeholder="🔍 პროდუქტის ძიება..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={() => loadProducts()} style={{ padding: '8px 12px', background: GL, color: G, border: `0.5px solid #5DCAA5`, borderRadius: 10, fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>↻ განახლება</button>
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
                  const catalogProduct = getCatalogProduct(p)
                  const imageSrc = getProductImage(p)
                  return (
                    <div key={p.id} style={s.prodCard} onClick={() => { setInstallmentMonths(12); setSelectedProduct(p); setScreen('product') }}>
                      <div style={s.prodImg}>
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
                          />
                        ) : (
                          catEmojis[p.category_slug] || '🦷'
                        )}
                      </div>
                      <div style={s.prodBody}>
                        <p style={s.prodCat}>{p.brand}</p>
                        <p style={s.prodName}>{p.name}</p>
                        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.45, margin: '6px 0 0' }}>
                          {(catalogProduct?.description || p.short_desc || '').slice(0, 88)}
                          {(catalogProduct?.description || p.short_desc || '').length > 88 ? '...' : ''}
                        </p>
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

        {/* ── PROPOSAL ── */}
        {screen === 'proposal' && (
          <div style={{ padding: 14 }} id="proposal-print-area">
            <div className="print-header">
              <div>
                <h1 style={{ color: '#085041', fontSize: 22, margin: 0 }}>Medical Line Georgia</h1>
                <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>ოფიციალური ინვოისი • {new Date().toLocaleDateString('ka-GE')}</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <p style={{ margin: 0 }}>ინვოისი: {proposalInvoiceNo}</p>
                <p style={{ margin: 0 }}>კლინიკა: {user.clinic_name}</p>
                <p style={{ margin: 2 }}>ექიმი: {user.full_name}</p>
              </div>
            </div>

            <p style={{ fontSize: 18, fontWeight: 600, color: G, marginBottom: 14 }}>ჩემი ინვოისი ({proposalItems.length})</p>
            {proposalItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 20 }}>
                <p style={{ fontSize: 40 }}>📄</p>
                <p style={{ fontSize: 14, color: '#888' }}>ინვოისი ცარიელია. დაამატეთ პროდუქტები კატალოგიდან.</p>
                <button style={{ ...s.btn, marginTop: 10 }} onClick={() => setScreen('catalog')}>კატალოგში დაბრუნება</button>
              </div>
            ) : (
              <>
                <div style={{ ...s.formCard, marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ინვოისის ფორმა</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={s.field}>
                      <label style={s.label}>მიმღები პირი</label>
                      <input style={s.input} value={proposalForm.recipientName} onChange={e => setProposalForm(prev => ({ ...prev, recipientName: e.target.value }))} placeholder="ექიმის სახელი" />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>კლინიკა</label>
                      <input style={s.input} value={proposalForm.clinicName} onChange={e => setProposalForm(prev => ({ ...prev, clinicName: e.target.value }))} placeholder="კლინიკის დასახელება" />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>ტელეფონი</label>
                      <input style={s.input} value={proposalForm.phone} onChange={e => setProposalForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="5XX XX XX XX" />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>ელფოსტა</label>
                      <input style={s.input} value={proposalForm.email} onChange={e => setProposalForm(prev => ({ ...prev, email: e.target.value }))} placeholder="clinic@example.com" />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>საიდენტიფიკაციო კოდი</label>
                      <input style={s.input} value={proposalForm.taxId} onChange={e => setProposalForm(prev => ({ ...prev, taxId: e.target.value }))} placeholder="კლინიკის კოდი" />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>მოქმედების ვადა (დღე)</label>
                      <input style={s.input} type="number" min={1} value={proposalForm.validDays} onChange={e => setProposalForm(prev => ({ ...prev, validDays: Math.max(1, Number(e.target.value) || 1) }))} />
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>მისამართი</label>
                    <input style={s.input} value={proposalForm.address} onChange={e => setProposalForm(prev => ({ ...prev, address: e.target.value }))} placeholder="ქალაქი, ქუჩა, ოფისი" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={s.field}>
                      <label style={s.label}>გადახდის პირობა</label>
                      <input style={s.input} value={proposalForm.paymentTerms} onChange={e => setProposalForm(prev => ({ ...prev, paymentTerms: e.target.value }))} placeholder="მაგ. 100% გადარიცხვა" />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>ფასდაკლება (%)</label>
                      <input style={s.input} type="number" min={0} max={100} value={proposalDiscountPct} onChange={e => setProposalDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={s.field}>
                      <label style={s.label}>დღგ</label>
                      <select style={s.select} value={proposalVatMode} onChange={e => setProposalVatMode(e.target.value as 'included' | 'excluded')}>
                        <option value="included">ფასი შეიცავს დღგ-ს</option>
                        <option value="excluded">ფასი დღგ-ს გარეშეა</option>
                      </select>
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>შენიშვნა</label>
                      <input style={s.input} value={proposalForm.note} onChange={e => setProposalForm(prev => ({ ...prev, note: e.target.value }))} placeholder="მონტაჟი, ტრენინგი, ვადა..." />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {proposalRows.map(({ product: p, quantity, unitPrice, lineTotal }) => (
                    <div key={p.id} style={{ ...s.svcCard, padding: 10 }} className="svc-card-print">
                      <div style={{ width: 40, height: 40, background: '#f5f5f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getProductImage(p) ? <img src={getProductImage(p)} style={{ width: '80%', height: '80%', objectFit: 'contain' }} /> : '🦷'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: G, margin: 0 }}>{unitPrice ? `${formatMoney(unitPrice)} / ერთეული` : 'ფასი მოთხოვნით'}</p>
                        <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}>ჯამი: {formatMoney(lineTotal)}</p>
                      </div>
                      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                          <button
                            onClick={() => setProposalQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }))}
                            style={{ border: 'none', background: '#f3f4f6', width: 28, height: 28, cursor: 'pointer', color: '#1f2937' }}
                          >
                            −
                          </button>
                          <span style={{ minWidth: 28, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>{quantity}</span>
                          <button
                            onClick={() => setProposalQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) + 1) }))}
                            style={{ border: 'none', background: '#f3f4f6', width: 28, height: 28, cursor: 'pointer', color: '#1f2937' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button className="no-print" onClick={() => toggleProposalItem(p)} style={{ background: 'none', border: 'none', color: '#E24B4A', fontSize: 18 }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>ინვოისი / ჯამური ინფორმაცია</p>
                  <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>ინვოისი №</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{proposalInvoiceNo}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>მიმღები</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{proposalForm.recipientName || user.full_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>კლინიკა</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{proposalForm.clinicName || user.clinic_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>კომპანიის საიდენტიფიკაციო</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{COMPANY_BILLING.taxId}</span>
                    </div>
                    {proposalForm.taxId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>საიდენტიფიკაციო</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{proposalForm.taxId}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>პროდუქტების რაოდენობა:</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{proposalItems.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>ქვეჯამი:</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatMoney(proposalSubtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>ფასდაკლება:</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>-{formatMoney(proposalDiscountValue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>{proposalVatMode === 'included' ? 'დღგ (ჩაშენებული):' : 'დღგ 18%:'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatMoney(proposalVatValue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, paddingTop: 10, borderTop: '0.5px solid #eee' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>საბოლოო ჯამი:</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: G }}>
                      {formatMoney(proposalGrandTotal)}
                    </span>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#f9fafb', fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 12 }}>
                    <div>გადახდის პირობა: {proposalForm.paymentTerms}</div>
                    <div>მოქმედების ვადა: {proposalForm.validDays} დღე</div>
                    {proposalForm.note && <div>შენიშვნა: {proposalForm.note}</div>}
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#eef7f4', border: '1px solid #c7eadf', fontSize: 12, color: '#0f3f35', lineHeight: 1.7, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>კომპანიის საბანკო რეკვიზიტები</div>
                    <div>კომპანია: {COMPANY_BILLING.legalName}</div>
                    <div>საიდენტიფიკაციო კოდი: {COMPANY_BILLING.taxId}</div>
                    <div>მისამართი: {COMPANY_BILLING.address}</div>
                    <div>ტელეფონი: {COMPANY_BILLING.phone}</div>
                    <div>ბანკი: {COMPANY_BILLING.bankName}</div>
                    <div>IBAN: {COMPANY_BILLING.iban}</div>
                  </div>
                  <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src="/images/invoice-stamp.jpg"
                        alt="Medical Line stamp"
                        style={{ width: 140, height: 140, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                      />
                      <div style={{ marginTop: -8, fontSize: 12, fontWeight: 600, color: '#0f3f35' }}>დირექტორი: შ. სეფიშვილი</div>
                    </div>
                  </div>
                  <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button style={{ ...s.btn, background: '#15803d', marginTop: 0, opacity: generatingPdf ? 0.6 : 1 }} onClick={shareInvoiceWA} disabled={generatingPdf}>
                      {generatingPdf ? '⏳ მზადდება...' : '📱 WhatsApp'}
                    </button>
                    <button style={{ ...s.btn, background: '#1d4ed8', marginTop: 0, opacity: generatingPdf ? 0.6 : 1 }} onClick={shareInvoiceEmail} disabled={generatingPdf}>
                      {generatingPdf ? '⏳ მზადდება...' : '✉️ ელ.ფოსტა'}
                    </button>
                    <button style={{ ...s.btn, background: '#1e293b', marginTop: 0 }} onClick={openInvoicePdf}>
                      🖨️ PDF / ბეჭდვა
                    </button>
                  </div>
                </div>

                <div className="print-footer">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0 }}>ინვოისი ძალაშია {proposalForm.validDays} კალენდარული დღის განმავლობაში.</p>
                      <p style={{ margin: '6px 0 0' }}>გადახდა: {proposalForm.paymentTerms}</p>
                    </div>
                    <p style={{ textAlign: 'right' }}>შოურუმი: {COMPANY_BILLING.address}<br/>ტელ: {COMPANY_BILLING.phone}</p>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: 0 }}>კომპანია: {COMPANY_BILLING.legalName}</p>
                    <p style={{ margin: '6px 0 0' }}>საიდენტიფიკაციო კოდი: {COMPANY_BILLING.taxId}</p>
                    <p style={{ margin: '6px 0 0' }}>ბანკი: {COMPANY_BILLING.bankName} · IBAN: {COMPANY_BILLING.iban}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src="/images/invoice-stamp.jpg"
                        alt="Medical Line stamp"
                        style={{ width: 150, height: 150, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                      />
                      <p style={{ margin: '-8px 0 0', fontSize: 12, fontWeight: 600, color: '#0f3f35' }}>დირექტორი: შ. სეფიშვილი</p>
                    </div>
                  </div>
                  <p style={{ textAlign: 'center', marginTop: 20, fontSize: 10 }}>გმადლობთ, რომ ირჩევთ Medical Line-ს!</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SERVICE ── */}
        {screen === 'service' && (
          <div style={s.svcList}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: G, margin: 0 }}>{serviceTickets.length}</p>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Service tickets</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: G, margin: 0 }}>{activeTickets}</p>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>Open cases</p>
              </div>
            </div>
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
                <div style={s.field}>
                  <label style={s.label}>პროდუქტი</label>
                  <select style={s.select} value={ticketProductId} onChange={e => setTicketProductId(e.target.value)}>
                    <option value="">აირჩიე პროდუქტი...</option>
                    {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </div>
                <div style={s.field}><label style={s.label}>სერიული ნომერი (სურვილისამებრ)</label><input style={s.input} value={ticketSerial} onChange={e => setTicketSerial(e.target.value)} placeholder="SN-XXXXXXX" /></div>
                <div style={s.field}><label style={s.label}>პრობლემის აღწერა *</label><textarea style={s.textarea} value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="მოკლედ აღწერე..." /></div>
                <div style={s.field}><label style={s.label}>სასურველი ვიზიტის თარიღი</label><input style={s.input} type="date" value={ticketVisitDate} onChange={e => setTicketVisitDate(e.target.value)} /></div>
                <div style={s.field}>
                  <label style={s.label}>ფოტო / ვიდეო (სურვილისამებრ)</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: `1.5px dashed ${G}`, borderRadius: 10, padding: '10px 14px', background: GL }}>
                    <span style={{ fontSize: 18 }}>📎</span>
                    <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>
                      {ticketFiles.length > 0 ? `${ticketFiles.length} ფაილი შერჩეული` : 'ფაილის არჩევა (jpg, png, mp4, mov)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => setTicketFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {ticketFiles.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ticketFiles.map((f, i) => (
                        <span key={i} style={{ fontSize: 11, background: '#fff', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 8px', color: '#444' }}>
                          {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {uploadProgress > 0 && (
                  <div style={{ height: 6, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: G, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                )}
                <button style={s.btn} onClick={sendTicket} disabled={loading}>{loading ? `⏳ იტვირთება... ${uploadProgress > 0 ? uploadProgress + '%' : ''}` : '📨 ტიკეტის გაგზავნა'}</button>
              </div>
            )}
            <div style={s.formCard}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent service activity</p>
              {serviceTickets.length === 0 ? (
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>No tickets yet. Create your first service case for engineer follow-up.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {serviceTickets.slice(0, 4).map(ticket => (
                    <div key={ticket.id} style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 12, background: '#fafaf8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{ticket.products?.name || 'General service case'}</p>
                          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{new Date(ticket.created_at).toLocaleDateString('ka-GE')}</p>
                        </div>
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: ticket.status === 'done' ? '#E1F5EE' : ticket.status === 'inprogress' ? '#E6F1FB' : '#FAEEDA', color: ticket.status === 'done' ? '#085041' : ticket.status === 'inprogress' ? '#0C447C' : '#633806', fontWeight: 600 }}>
                          {ticketStatusLabel[ticket.status] || ticket.status}
                        </span>
                      </div>
                      {ticket.serial_number && <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>SN: {ticket.serial_number}</p>}
                      <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5, margin: '8px 0 0' }}>{ticket.problem_desc}</p>
                      {ticket.visit_date && <p style={{ fontSize: 11, color: '#0C447C', margin: '8px 0 0' }}>Visit: {new Date(ticket.visit_date).toLocaleDateString('ka-GE')}</p>}
                      {ticket.resolution && <p style={{ fontSize: 11, color: '#085041', margin: '8px 0 0' }}>Update: {ticket.resolution}</p>}
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {ticket.attachments.map((url, i) => {
                            const isVideo = url.match(/\.(mp4|mov|webm|avi)(\?|$)/i)
                            return isVideo ? (
                              <video key={i} src={url} controls style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover', background: '#000' }} />
                            ) : (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`attachment-${i}`} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '0.5px solid #ddd' }} />
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACADEMY ── */}
        {screen === 'academy' && (() => {
          const VIDEO_TYPE_KA: Record<string, string> = {
            training: 'ტრენინგი', setup: 'გამართვა',
            troubleshooting: 'პრობლემის გადაჭრა', demo: 'დემო', marketing: 'მარკეტინგი',
          }
          const TYPE_COLOR: Record<string, string> = {
            training: '#1D4ED8', setup: '#15803D',
            troubleshooting: '#C2410C', demo: '#7C3AED', marketing: '#BE123C',
          }
          function fmtDuration(iso: string | null | undefined) {
            if (!iso) return ''
            const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
            if (!m) return ''
            const h = parseInt(m[1]||'0'), min = parseInt(m[2]||'0'), sec = parseInt(m[3]||'0')
            if (h > 0) return `${h}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
            return `${min}:${String(sec).padStart(2,'0')}`
          }

          // Group by product_id → product name
          const groups: { productName: string; productSlug: string | null; items: AcademyItem[] }[] = []
          const seen = new Map<string | null, number>()
          for (const v of academy) {
            const key = v.product_id ?? '__none__'
            if (!seen.has(key)) {
              seen.set(key, groups.length)
              groups.push({
                productName: (v.products as any)?.name ?? (v.product_id ? 'პროდუქტი' : 'ზოგადი სასწავლო მასალა'),
                productSlug: (v.products as any)?.slug ?? null,
                items: [],
              })
            }
            groups[seen.get(key)!].items.push(v)
          }

          return (
            <>
              {/* Header */}
              <div style={{ background: '#1E3A8A', padding: '16px 14px 14px' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#93C5FD', fontWeight: 700, letterSpacing: 0.5 }}>MEDICAL LINE</p>
                <p style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 700, color: '#fff' }}>🎓 აკადემია</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#BFDBFE' }}>სასწავლო ვიდეოები თქვენი პროდუქტებისთვის</p>
              </div>

              {academy.length === 0 ? (
                <div style={{ padding: '32px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎓</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>ვიდეოები მალე დაემატება</p>
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>სასწავლო მასალები მომზადდება</p>
                </div>
              ) : (
                groups.map((group, gi) => (
                  <div key={gi}>
                    <div style={{ padding: '14px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ ...s.sectionTitle, padding: 0, margin: 0 }}>{group.productName}</p>
                      {group.productSlug && (
                        <a href={`/academy/${group.productSlug}`} style={{ fontSize: 10, color: '#1D4ED8', textDecoration: 'none', fontWeight: 700 }}>
                          ყველა →
                        </a>
                      )}
                    </div>
                    {group.items.map(v => {
                      const thumb = v.thumbnail_url || (v.youtube_video_id ? `https://img.youtube.com/vi/${v.youtube_video_id}/hqdefault.jpg` : null)
                      const href = v.youtube_video_id ? `https://youtu.be/${v.youtube_video_id}` : (v.youtube_url ?? '#')
                      const dur = fmtDuration(v.duration_iso)
                      const typeColor = TYPE_COLOR[v.video_type] || G
                      return (
                        <a key={v.id} href={href} target="_blank" rel="noreferrer" style={{ ...s.vcard, textDecoration: 'none', alignItems: 'stretch' }}>
                          {/* Thumbnail */}
                          <div style={{ ...s.vthumb, position: 'relative', width: 90, height: 64, overflow: 'hidden', flexShrink: 0 }}>
                            {thumb
                              ? <img src={thumb} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ borderLeft: '10px solid #fff', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 3 }} />
                                </div>
                            }
                            {/* Play overlay */}
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ borderLeft: '7px solid #1a1a1a', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', marginLeft: 2 }} />
                              </div>
                            </div>
                            {dur && <span style={{ position: 'absolute', bottom: 3, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 9, padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace' }}>{dur}</span>}
                          </div>
                          {/* Info */}
                          <div style={{ ...s.vinfo, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: typeColor, background: `${typeColor}18`, padding: '1px 6px', borderRadius: 20 }}>
                                {VIDEO_TYPE_KA[v.video_type] || v.video_type}
                              </span>
                              {v.is_featured && <span style={{ fontSize: 9, color: '#92400E', background: '#FEF3C7', padding: '1px 5px', borderRadius: 20, fontWeight: 700 }}>★</span>}
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</p>
                            {v.channel_title && <p style={{ fontSize: 10, color: '#aaa', margin: '3px 0 0' }}>{v.channel_title}</p>}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                ))
              )}

              {/* Full Academy link */}
              <div style={{ padding: 14 }}>
                <a href="/academy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '11px 14px', textDecoration: 'none', color: '#1D4ED8', fontSize: 13, fontWeight: 700 }}>
                  🎓 სრული Academy გვერდი →
                </a>
              </div>
              <div style={{ height: 10 }} />
            </>
          )
        })()}

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
              <div style={s.statCard}>
                <p style={{ fontSize: 26, fontWeight: 700, color: G, margin: 0 }}>{serviceTickets.length}</p>
                <p style={{ fontSize: 12, color: '#888', margin: '3px 0 0' }}>Service active</p>
              </div>
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
            {serviceTickets.length > 0 && (
              <>
                <p style={s.sectionTitle}>Service timeline</p>
                <div style={s.histCard}>
                  {serviceTickets.slice(0, 4).map(ticket => (
                    <div key={ticket.id} style={s.histRow}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: ticket.status === 'done' ? '#1D9E75' : ticket.status === 'inprogress' ? '#185FA5' : '#BA7517', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{ticket.products?.name || 'General service case'}</p>
                        <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{new Date(ticket.created_at).toLocaleDateString('ka-GE')}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: ticket.status === 'done' ? '#1D9E75' : ticket.status === 'inprogress' ? '#185FA5' : '#BA7517' }}>{ticketStatusLabel[ticket.status] || ticket.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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

      {/* BOTTOM NAV (mobile only) */}
      {!isDesktop && (
        <div style={s.bnav}>
          {[
            { id: 'catalog', ico: '🏪', label: 'კატალოგი' },
            { id: 'proposal', ico: '📄', label: 'ინვოისი', badge: proposalItems.length },
            { id: 'service', ico: '🔧', label: 'სერვისი' },
            { id: 'profile', ico: '👤', label: 'პროფილი' },
          ].map(item => (
            <button key={item.id} style={s.bn} onClick={() => setScreen(item.id as Screen)}>
              <span style={{ ...s.bnIcon, position: 'relative' }}>
                {item.ico}
                {(item.badge ?? 0) > 0 && <span style={{ position: 'absolute', top: -5, right: -10, background: '#E24B4A', color: '#fff', fontSize: 9, borderRadius: 10, padding: '2px 5px', fontWeight: 700 }}>{item.badge}</span>}
              </span>
              <span style={screen === item.id ? s.bnLabelOn : s.bnLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
      </div>{/* end MAIN AREA */}
    </div>
  )
}
