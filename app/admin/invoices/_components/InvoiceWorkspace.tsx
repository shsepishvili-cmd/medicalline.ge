'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileText, Loader2, Plus, ScanLine, Send, Sparkles, Trash2, Upload } from 'lucide-react'
import { calculateInvoice } from '@/app/lib/ai-invoice-money'
import type { InvoiceDraft, InvoiceDraftItem } from '@/app/lib/ai-invoice-types'
import { aiInvoiceSupabase } from '@/app/lib/ai-invoice-browser'
import styles from './invoice-workspace.module.css'

type SavedInvoice = {
  id: string; invoice_number: string; customer_name: string; customer_email?: string | null
  invoice_date: string; currency: 'GEL' | 'USD' | 'EUR'; vat_mode: string; status: string
  grand_total: number; clean_pdf_path?: string | null; scanned_pdf_path?: string | null
}

type ProductOption = {
  id: string
  source: 'erp' | 'catalog'
  code: string
  name: string
  unit: string
  price: number
  vat_rate: number
}

const sample = `გთხოვ, გამიკეთე ინვოისი სს ვიანზე.
E-Connect PRO — 1 ცალი, 1050 ლარი.
EFLEX BLUE — 50 ანაწყობი, თითო 45 ლარი.
დღგ-ის გარეშე.
თარიღი 19/06/2026.`

function money(value: number, currency: string) {
  return new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ` ${currency}`
}
function headers(token: string, json = true) {
  return { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }
}

export default function InvoiceWorkspace({ historyOnly = false }: { historyOnly?: boolean }) {
  const [gate, setGate] = useState<{ loading: boolean; error: string; accessToken: string; isAdmin: boolean }>({
    loading: true, error: '', accessToken: '', isAdmin: false,
  })
  const [prompt, setPrompt] = useState(sample)
  const [draft, setDraft] = useState<InvoiceDraft | null>(null)
  const [invoices, setInvoices] = useState<SavedInvoice[]>([])
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [products, setProducts] = useState<ProductOption[]>([])

  useEffect(() => {
    let mounted = true
    async function verify() {
      const { data: { session } } = await aiInvoiceSupabase.auth.getSession()
      if (!session?.user?.id || !session.access_token) {
        if (mounted) setGate({ loading: false, error: 'ადმინისტრატორის სესია ვერ მოიძებნა.', accessToken: '', isAdmin: false })
        return
      }
      const { data: profile } = await aiInvoiceSupabase.from('profiles').select('role, status').eq('id', session.user.id).single()
      const isAdmin = profile?.role === 'admin' && (!profile.status || profile.status === 'active')
      if (mounted) setGate({
        loading: false,
        error: isAdmin ? '' : 'მოდული ხელმისაწვდომია მხოლოდ აქტიური ადმინისტრატორისთვის.',
        accessToken: isAdmin ? session.access_token : '',
        isAdmin,
      })
    }
    void verify()
    const { data: { subscription } } = aiInvoiceSupabase.auth.onAuthStateChange(() => { void verify() })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const loadInvoices = useCallback(async () => {
    if (!gate.accessToken) return
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const response = await fetch(`/api/admin/invoices?${params}`, { headers: headers(gate.accessToken, false), cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error || 'ინვოისები ვერ ჩაიტვირთა.')
    setInvoices(payload.invoices || [])
  }, [gate.accessToken, search, status])

  useEffect(() => {
    if (gate.accessToken) void loadInvoices().catch((cause) => setError(cause instanceof Error ? cause.message : 'ინვოისები ვერ ჩაიტვირთა.'))
  }, [gate.accessToken, loadInvoices])

  useEffect(() => {
    if (!gate.accessToken || historyOnly) return
    const controller = new AbortController()
    void fetch('/api/admin/invoices/products', {
      headers: headers(gate.accessToken, false),
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'პროდუქციის ბაზა ვერ ჩაიტვირთა.')
      setProducts(payload.products || [])
    }).catch((cause) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : 'პროდუქციის ბაზა ვერ ჩაიტვირთა.')
    })
    return () => controller.abort()
  }, [gate.accessToken, historyOnly])

  const totals = useMemo(() => {
    if (!draft || draft.vat_mode === 'unknown') return null
    return calculateInvoice(draft.items, draft.vat_mode)
  }, [draft])

  async function parsePrompt() {
    if (!gate.accessToken) return
    setBusy('parse'); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/invoices/parse', { method: 'POST', headers: headers(gate.accessToken), body: JSON.stringify({ prompt }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'ტექსტი ვერ დამუშავდა.')
      setDraft(payload.draft); setSourcePath('')
      setNotice('მონახაზი მზადაა — გადაამოწმეთ ყველა ველი საბოლოო შექმნამდე.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ტექსტი ვერ დამუშავდა.') }
    finally { setBusy('') }
  }

  async function uploadFile(file: File) {
    if (!gate.accessToken) return
    setBusy('upload'); setError(''); setNotice('')
    try {
      const data = new FormData(); data.append('file', file)
      const response = await fetch('/api/admin/invoices/upload', { method: 'POST', headers: headers(gate.accessToken, false), body: data })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'ფაილი ვერ დამუშავდა.')
      setDraft(payload.draft); setSourcePath(payload.source_file_path || '')
      setNotice('ფაილიდან ამოცნობილი მონახაზი მზადაა — გადაამოწმეთ მონაცემები.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ფაილი ვერ დამუშავდა.') }
    finally { setBusy('') }
  }

  function patchDraft(patch: Partial<InvoiceDraft>) {
    setDraft((current) => current ? { ...current, ...patch } : current)
  }
  function patchItem(index: number, patch: Partial<InvoiceDraftItem>) {
    setDraft((current) => current ? { ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) } : current)
  }

  function startManualDraft() {
    const today = new Date().toISOString().slice(0, 10)
    setSourcePath('')
    setDraft({
      customer_query: 'ხელით შეყვანილი კლიენტი',
      customer_name: '',
      customer_tax_id: '',
      customer_address: '',
      customer_email: '',
      customer_phone: '',
      invoice_date: today,
      delivery_date: null,
      due_date: null,
      currency: 'GEL',
      vat_mode: 'without_vat',
      items: [{
        product_query: 'ხელით შეყვანილი პროდუქტი',
        product_name: '',
        description: '',
        product_code: null,
        unit: 'ცალი',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        line_total: 0,
      }],
      notes: '',
      payment_terms: '',
      requested_scanned_version: false,
      stamp_applied: false,
      signature_applied: false,
      warnings: [],
      questions: [],
    })
    setNotice('ხელით შესავსები ინვოისის მონახაზი მზადაა.')
    setError('')
  }

  function selectProduct(index: number, typedValue: string) {
    const normalized = typedValue.trim().toLocaleLowerCase('ka-GE')
    const selected = products.find((product) =>
      product.id === typedValue ||
      product.name.toLocaleLowerCase('ka-GE') === normalized ||
      product.code.toLocaleLowerCase('ka-GE') === normalized ||
      `${product.code} — ${product.name}`.toLocaleLowerCase('ka-GE') === normalized
    )
    if (!selected) {
      patchItem(index, {
        product_id: null,
        product_name: typedValue,
        product_query: typedValue || 'ხელით შეყვანილი პროდუქტი',
        match_warning: typedValue ? 'ხელით შეყვანილი პოზიცია — პროდუქციის ბაზას არ არის მიბმული.' : null,
      })
      return
    }
    patchItem(index, {
      product_id: selected.id,
      product_name: selected.name,
      product_query: selected.name,
      product_code: selected.code || null,
      unit: selected.unit || 'ცალი',
      unit_price: selected.price || 0,
      standard_price: selected.price || null,
      match_warning: null,
    })
  }

  async function createInvoice() {
    if (!gate.accessToken || !draft) return
    if (draft.vat_mode === 'unknown') { setError('აირჩიეთ დღგ-ის რეჟიმი.'); return }
    if (draft.questions.length) { setError('ჯერ მოაგვარეთ ყველა დამაზუსტებელი კითხვა.'); return }
    setBusy('create'); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/invoices', {
        method: 'POST', headers: headers(gate.accessToken),
        body: JSON.stringify({ draft, prompt, source_type: sourcePath ? 'file' : 'prompt', source_file_path: sourcePath || null }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'ინვოისი ვერ შეიქმნა.')
      setNotice(`ინვოისი ${payload.invoice.invoice_number} წარმატებით შეიქმნა.`); setDraft(null)
      await loadInvoices()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ინვოისი ვერ შეიქმნა.') }
    finally { setBusy('') }
  }

  async function pdf(invoice: SavedInvoice, kind: 'clean' | 'scanned') {
    if (!gate.accessToken) return
    setBusy(`${invoice.id}-${kind}`); setError('')
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/pdf`, { method: 'POST', headers: headers(gate.accessToken), body: JSON.stringify({ kind }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'PDF ვერ შეიქმნა.')
      window.open(payload.url, '_blank', 'noopener,noreferrer'); await loadInvoices()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PDF ვერ შეიქმნა.') }
    finally { setBusy('') }
  }

  async function cancel(invoice: SavedInvoice) {
    if (!gate.accessToken || !confirm(`გაუქმდეს ${invoice.invoice_number}? ჩანაწერი არ წაიშლება.`)) return
    const response = await fetch(`/api/admin/invoices/${invoice.id}`, { method: 'PATCH', headers: headers(gate.accessToken), body: JSON.stringify({ status: 'cancelled' }) })
    const payload = await response.json()
    if (!response.ok) { setError(payload?.error || 'გაუქმება ვერ მოხერხდა.'); return }
    await loadInvoices()
  }

  if (gate.loading) return <main className={styles.centerState}><Loader2 className={styles.spin} size={28}/><p>ინვოისის მოდული იტვირთება...</p></main>
  if (gate.error || !gate.accessToken || !gate.isAdmin) return <main className={styles.centerState}><AlertTriangle size={30}/><p>{gate.error}</p><Link href="/admin">ადმინში დაბრუნება</Link></main>

  return <main className={styles.page}><div className={styles.wrap}>
    <header className={styles.hero}><div><p>ადმინი / ფინანსები</p><h1>{historyOnly ? 'ინვოისები' : 'AI ინვოისის გენერატორი'}</h1><span>{historyOnly ? 'ინვოისების დაცული ისტორია და PDF ვერსიები' : 'ტექსტიდან ან დოკუმენტიდან — კონტროლირებად მონახაზამდე'}</span></div>
      <nav><Link href="/admin">ადმინი</Link><Link href="/admin/invoices">ისტორია</Link><Link href="/admin/invoices/suppliers">მომწოდებლები / ერთიანი ბაზა</Link><Link href="/admin/invoices/ai-generator" className={styles.primaryLink}><Sparkles size={16}/>ახალი მონახაზი</Link></nav>
    </header>
    {error && <div className={styles.error}><AlertTriangle size={18}/>{error}</div>}
    {notice && <div className={styles.notice}>{notice}</div>}

    {!historyOnly && <div className={styles.workspace}>
      <section className={styles.composerCard}>
        <div className={styles.sectionTitle}><Sparkles size={18}/><div><h2>მოთხოვნა</h2><p>AI საბოლოო ინვოისს ავტომატურად არ შექმნის.</p></div></div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={12} maxLength={20000}/>
        <div className={styles.composerActions}>
          <label className={styles.uploadButton}><Upload size={16}/>{busy === 'upload' ? 'იტვირთება...' : 'PDF, JPG, PNG ან XLSX'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx" disabled={Boolean(busy)} onChange={(e) => { const file=e.target.files?.[0]; if(file) void uploadFile(file); e.currentTarget.value='' }}/></label>
          <button type="button" className={styles.manualButton} onClick={startManualDraft} disabled={Boolean(busy)}><Plus size={17}/>ხელით შევსება</button>
          <button onClick={parsePrompt} disabled={Boolean(busy) || prompt.trim().length < 10}>{busy === 'parse' ? <Loader2 className={styles.spin} size={17}/> : <Sparkles size={17}/>}ინვოისის მონახაზის შექმნა</button>
        </div>
        {sourcePath && <small>წყარო დაცულად აიტვირთა: {sourcePath.split('/').pop()}</small>}
      </section>

      <section className={styles.previewCard}>
        {!draft ? <div className={styles.empty}><FileText size={36}/><h2>მონახაზი აქ გამოჩნდება</h2><p>შეიყვანეთ მოთხოვნა ან ატვირთეთ დოკუმენტი.</p></div> : <>
          <div className={styles.sectionTitle}><FileText size={18}/><div><h2>რედაქტირებადი მონახაზი</h2><p>საბოლოო ნომერი მიენიჭება მხოლოდ შექმნისას.</p></div></div>
          {draft.questions.map((question,index)=><div className={styles.question} key={`${question}-${index}`}><span>{question}</span><button onClick={()=>patchDraft({questions:draft.questions.filter((_,i)=>i!==index)})}>მოგვარებულია</button></div>)}
          {draft.warnings.map((warning)=><div className={styles.warning} key={warning}><AlertTriangle size={15}/>{warning}</div>)}
          <div className={styles.formGrid}>
            <label>ინვოისის თარიღი<input type="date" value={draft.invoice_date} onChange={(e)=>patchDraft({invoice_date:e.target.value})}/></label>
            <label>მიწოდების თარიღი<input type="date" value={draft.delivery_date||''} onChange={(e)=>patchDraft({delivery_date:e.target.value||null})}/></label>
            <label>ვალუტა<select value={draft.currency} onChange={(e)=>patchDraft({currency:e.target.value as InvoiceDraft['currency']})}><option>GEL</option><option>USD</option><option>EUR</option></select></label>
            <label>დღგ-ის რეჟიმი<select value={draft.vat_mode} onChange={(e)=>patchDraft({vat_mode:e.target.value as InvoiceDraft['vat_mode'],questions:draft.questions.filter(q=>!q.includes('დღგ'))})}><option value="unknown">დასაზუსტებელი</option><option value="without_vat">დღგ-ის გარეშე</option><option value="vat_included">დღგ-ის ჩათვლით</option><option value="vat_excluded_add_vat">დღგ-ის დამატებით</option></select></label>
            <label className={styles.span2}>მყიდველი<input value={draft.customer_name} onChange={(e)=>patchDraft({customer_name:e.target.value})}/></label>
            <label>საიდენტიფიკაციო კოდი<input value={draft.customer_tax_id} onChange={(e)=>patchDraft({customer_tax_id:e.target.value})}/></label>
            <label>ელფოსტა<input type="email" value={draft.customer_email} onChange={(e)=>patchDraft({customer_email:e.target.value})}/></label>
            <label className={styles.span2}>მისამართი<input value={draft.customer_address} onChange={(e)=>patchDraft({customer_address:e.target.value})}/></label>
          </div>
          <div className={styles.itemsHeader}><h3>პროდუქტები</h3><button onClick={()=>patchDraft({items:[...draft.items,{product_query:'',product_name:'',description:'',product_code:null,unit:'ცალი',quantity:1,unit_price:0,discount:0,line_total:0}]})}><Plus size={15}/>პოზიცია</button></div>
          <datalist id="invoice-product-options">{products.map((product)=><option key={`${product.source}-${product.id}`} value={`${product.code} — ${product.name}`}>{product.name} · {money(product.price,'GEL')} · {product.source === 'erp' ? 'ERP' : 'კატალოგი'}</option>)}</datalist>
          <div className={styles.catalogStatus}>{products.length ? `${products.length} პროდუქტი დაკავშირებულია ბაზიდან` : 'პროდუქციის ბაზა იტვირთება...'}</div>
          <div className={styles.items}>{draft.items.map((item,index)=><div className={styles.item} key={`${item.product_id || 'manual'}-${index}`}>
            <b>{index+1}</b>
            <label>პროდუქტი (ბაზიდან ან ხელით)<input list="invoice-product-options" value={item.product_name} placeholder="ჩაწერეთ კოდი ან დასახელება" onChange={(e)=>selectProduct(index,e.target.value)} onBlur={(e)=>selectProduct(index,e.target.value)}/></label>
            <label>კოდი<input value={item.product_code||''} onChange={(e)=>patchItem(index,{product_code:e.target.value||null})}/></label>
            <label>ერთეული<input value={item.unit} onChange={(e)=>patchItem(index,{unit:e.target.value})}/></label>
            <label>რაოდენობა<input type="number" min=".001" step=".001" value={item.quantity} onChange={(e)=>patchItem(index,{quantity:Number(e.target.value)})}/></label>
            <label>ფასი<input type="number" min="0" step=".01" value={item.unit_price} onChange={(e)=>patchItem(index,{unit_price:Number(e.target.value)})}/></label>
            <label>ფასდაკლება<input type="number" min="0" step=".01" value={item.discount} onChange={(e)=>patchItem(index,{discount:Number(e.target.value)})}/></label>
            <span className={styles.lineTotal}>{money(totals?.items[index]?.line_total||0,draft.currency)}</span>
            <button className={styles.iconButton} aria-label="პოზიციის წაშლა" onClick={()=>patchDraft({items:draft.items.filter((_,i)=>i!==index)})}><Trash2 size={16}/></button>
            {item.match_warning&&<small>{item.match_warning}</small>}
          </div>)}</div>
          <div className={styles.bottomGrid}><div>
            <label>გადახდის პირობა<textarea rows={2} value={draft.payment_terms} onChange={(e)=>patchDraft({payment_terms:e.target.value})}/></label>
            <label>შენიშვნა<textarea rows={2} value={draft.notes} onChange={(e)=>patchDraft({notes:e.target.value})}/></label>
            <div className={styles.checks}><label><input type="checkbox" checked={draft.stamp_applied} onChange={(e)=>patchDraft({stamp_applied:e.target.checked})}/>ბეჭედი</label><label><input type="checkbox" checked={draft.signature_applied} onChange={(e)=>patchDraft({signature_applied:e.target.checked})}/>ხელმოწერა</label><label><input type="checkbox" checked={draft.requested_scanned_version} onChange={(e)=>patchDraft({requested_scanned_version:e.target.checked})}/>დასკანერებული PDF</label></div>
          </div><div className={styles.totals}><span>ქვეჯამი <b>{money(totals?.subtotal||0,draft.currency)}</b></span><span>ფასდაკლება <b>{money(totals?.discount_total||0,draft.currency)}</b></span><span>დღგ <b>{money(totals?.vat_total||0,draft.currency)}</b></span><strong>საბოლოო თანხა <b>{money(totals?.grand_total||0,draft.currency)}</b></strong></div></div>
          <button className={styles.createButton} onClick={createInvoice} disabled={Boolean(busy)||!totals||!draft.items.length}>{busy==='create'?<Loader2 className={styles.spin} size={18}/>:<Send size={18}/>}ინვოისის შექმნა</button>
        </>}
      </section>
    </div>}

    <section className={styles.history}><div className={styles.historyTop}><div><h2>ინვოისების ისტორია</h2><p>დოკუმენტები არ იშლება — გაუქმება ინახება audit log-ში.</p></div><div><input placeholder="ნომერი ან კლიენტი" value={search} onChange={(e)=>setSearch(e.target.value)}/><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">ყველა სტატუსი</option><option value="issued">შექმნილი</option><option value="sent">გაგზავნილი</option><option value="paid">გადახდილი</option><option value="cancelled">გაუქმებული</option></select></div></div>
      <div className={styles.tableWrap}><table><thead><tr><th>ნომერი</th><th>კლიენტი</th><th>თარიღი</th><th>ჯამი</th><th>დღგ</th><th>სტატუსი</th><th>მოქმედებები</th></tr></thead><tbody>{invoices.map(invoice=><tr key={invoice.id}><td><b>{invoice.invoice_number}</b></td><td>{invoice.customer_name}</td><td>{invoice.invoice_date}</td><td>{money(Number(invoice.grand_total),invoice.currency)}</td><td>{invoice.vat_mode}</td><td><span className={styles.status}>{invoice.status}</span></td><td><div className={styles.rowActions}><button onClick={()=>pdf(invoice,'clean')} disabled={Boolean(busy)}><FileText size={14}/>PDF</button><button onClick={()=>pdf(invoice,'scanned')} disabled={Boolean(busy)}><ScanLine size={14}/>Scan</button>{invoice.customer_email&&<a href={`mailto:${invoice.customer_email}?subject=${encodeURIComponent(`ინვოისი ${invoice.invoice_number}`)}`}><Send size={14}/>მეილი</a>}<button className={styles.cancel} onClick={()=>cancel(invoice)} disabled={invoice.status==='cancelled'}>გაუქმება</button></div></td></tr>)}</tbody></table>{!invoices.length&&<div className={styles.emptyRow}>ინვოისი ჯერ არ არის.</div>}</div>
    </section>
  </div></main>
}
