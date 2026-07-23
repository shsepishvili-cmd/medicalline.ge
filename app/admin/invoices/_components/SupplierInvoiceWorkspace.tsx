'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileUp, Loader2, PackagePlus, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { aiInvoiceSupabase } from '@/app/lib/ai-invoice-browser'
import styles from './supplier-invoice-workspace.module.css'

type Manufacturer = { id: string; name: string; aliases: string[] }
type Product = { id: string; code: string; name: string; unit: string; price: number; source: string }
type Item = { row_id: string; erp_product_id: string | null; product_name: string; sku: string; unit: string; quantity: number; unit_price: number }
type SupplierInvoice = {
  id: string; manufacturer_name: string; invoice_number: string | null; invoice_date: string
  currency: string; total: number; original_filename: string | null
}
type UnifiedInvoice = {
  invoice_kind: string; source_id: string; number: string | null; counterparty: string
  invoice_date: string | null; currency: string; total: number; status: string
}

const blankItem = (): Item => ({ row_id: crypto.randomUUID(), erp_product_id: null, product_name: '', sku: '', unit: 'pcs', quantity: 1, unit_price: 0 })
const authHeaders = (token: string, json = true) => ({ Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) })

export default function SupplierInvoiceWorkspace() {
  const [token, setToken] = useState('')
  const [gateError, setGateError] = useState('')
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [history, setHistory] = useState<UnifiedInvoice[]>([])
  const [manufacturerId, setManufacturerId] = useState('')
  const [manufacturerName, setManufacturerName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GEL' | 'CNY'>('USD')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([blankItem()])
  const [chat, setChat] = useState('')
  const [storagePath, setStoragePath] = useState('')
  const [originalFilename, setOriginalFilename] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load(accessToken: string) {
    const [overviewResponse, productsResponse] = await Promise.all([
      fetch('/api/admin/invoices/suppliers', { headers: authHeaders(accessToken, false), cache: 'no-store' }),
      fetch('/api/admin/invoices/products', { headers: authHeaders(accessToken, false), cache: 'no-store' }),
    ])
    const [overview, productPayload] = await Promise.all([overviewResponse.json(), productsResponse.json()])
    if (!overviewResponse.ok) throw new Error(overview?.error || 'მომწოდებლის ბაზა ვერ ჩაიტვირთა.')
    if (!productsResponse.ok) throw new Error(productPayload?.error || 'პროდუქტები ვერ ჩაიტვირთა.')
    setManufacturers(overview.manufacturers || [])
    setSupplierInvoices(overview.supplier_invoices || [])
    setHistory(overview.unified_history || [])
    setProducts(productPayload.products || [])
  }

  useEffect(() => {
    let mounted = true
    void aiInvoiceSupabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token || !session.user.id) throw new Error('ადმინისტრატორის სესია ვერ მოიძებნა.')
      const { data: profile } = await aiInvoiceSupabase.from('profiles').select('role,status').eq('id', session.user.id).single()
      if (profile?.role !== 'admin' || (profile.status && profile.status !== 'active')) throw new Error('წვდომა აკრძალულია.')
      if (!mounted) return
      setToken(session.access_token)
      await load(session.access_token)
    }).catch((cause) => mounted && setGateError(cause instanceof Error ? cause.message : 'წვდომა ვერ დადასტურდა.'))
    return () => { mounted = false }
  }, [])

  const computedTotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [items])

  function patchItem(index: number, patch: Partial<Item>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function selectProduct(index: number, value: string) {
    const normalized = value.trim().toLocaleLowerCase('ka-GE')
    const product = products.find((candidate) =>
      candidate.id === value ||
      candidate.code.toLocaleLowerCase('ka-GE') === normalized ||
      candidate.name.toLocaleLowerCase('ka-GE') === normalized ||
      `${candidate.code} — ${candidate.name}`.toLocaleLowerCase('ka-GE') === normalized
    )
    if (!product) return patchItem(index, { erp_product_id: null, product_name: value })
    patchItem(index, {
      erp_product_id: product.id,
      product_name: product.name,
      sku: product.code,
      unit: product.unit || 'pcs',
      unit_price: product.price || 0,
    })
  }

  function recognizeText() {
    const lower = chat.toLocaleLowerCase('ka-GE')
    const manufacturer = manufacturers.find((entry) => [entry.name, ...(entry.aliases || [])].some((name) => lower.includes(name.toLocaleLowerCase('ka-GE'))))
    if (manufacturer) {
      setManufacturerId(manufacturer.id)
      setManufacturerName(manufacturer.name)
    }
    const date = chat.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
    if (date) setInvoiceDate(`${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`)
    const number = chat.match(/(?:invoice|ინვოისი|ინვოისის)\s*(?:no|№|#)?\s*[:\-]?\s*([A-Za-z0-9\-/]+)/i)
    if (number) setInvoiceNumber(number[1])
    setCurrency(/eur|€/i.test(chat) ? 'EUR' : /gel|₾|ლარ/i.test(chat) ? 'GEL' : /cny|rmb|yuan/i.test(chat) ? 'CNY' : 'USD')
    const parsed: Item[] = []
    for (const line of chat.split(/\n|;/).map((part) => part.trim()).filter(Boolean)) {
      const match = line.match(/^(.+?)\s*[—–-]?\s*(\d+(?:[.,]\d+)?)\s*(pcs|piece|pieces|ცალი|კომპლექტი|ანაწყობი|ბლისტერი)?(?:\s*[,x×]\s*|\s+თითო\s+|\s+)(\d+(?:[.,]\d+)?)\s*(usd|eur|gel|cny|\$|€|₾)?/i)
      if (!match) continue
      const name = match[1].trim()
      const linked = products.find((product) => product.name.toLocaleLowerCase('ka-GE') === name.toLocaleLowerCase('ka-GE') || product.code.toLocaleLowerCase('ka-GE') === name.toLocaleLowerCase('ka-GE'))
      parsed.push({
        row_id: crypto.randomUUID(),
        erp_product_id: linked?.id || null,
        product_name: linked?.name || name,
        sku: linked?.code || '',
        unit: match[3] || linked?.unit || 'pcs',
        quantity: Number(match[2].replace(',', '.')),
        unit_price: Number(match[4].replace(',', '.')),
      })
    }
    if (parsed.length) setItems(parsed)
    setNotice('ამოცნობილი მონაცემები გადაამოწმეთ და შემდეგ შეინახეთ.')
  }

  async function upload(file: File) {
    if (!token) return
    setBusy('upload'); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('manufacturer', manufacturerName || 'unknown')
      form.append('invoice_date', invoiceDate)
      const response = await fetch('/api/admin/invoices/suppliers/upload', { method: 'POST', headers: authHeaders(token, false), body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'ფაილი ვერ აიტვირთა.')
      setStoragePath(payload.storage_path)
      setOriginalFilename(payload.original_filename)
      setNotice(`ფაილი დაცულად აიტვირთა: ${payload.original_filename}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ფაილი ვერ აიტვირთა.') }
    finally { setBusy('') }
  }

  async function save() {
    if (!token) return
    const selectedManufacturer = manufacturers.find((entry) => entry.id === manufacturerId)
    const finalManufacturerName = selectedManufacturer?.name || manufacturerName.trim()
    if (!finalManufacturerName) return setError('აირჩიეთ ან ჩაწერეთ მწარმოებელი.')
    if (!items.some((item) => item.product_name.trim())) return setError('დაამატეთ მინიმუმ ერთი პროდუქტი.')
    setBusy('save'); setError('')
    try {
      const response = await fetch('/api/admin/invoices/suppliers', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          manufacturer_id: selectedManufacturer?.id || null,
          manufacturer_name: finalManufacturerName,
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate,
          currency,
          total: computedTotal,
          storage_path: storagePath || null,
          original_filename: originalFilename || null,
          notes: notes || null,
          items: items.filter((item) => item.product_name.trim()),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'ინვოისი ვერ შეინახა.')
      setNotice('მომწოდებლის ინვოისი შენახულია და პროდუქტების შესყიდვის ფასები განახლდა.')
      setInvoiceNumber(''); setNotes(''); setItems([blankItem()]); setStoragePath(''); setOriginalFilename('')
      await load(token)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ინვოისი ვერ შეინახა.') }
    finally { setBusy('') }
  }

  if (gateError) return <main className={styles.center}><AlertTriangle/><p>{gateError}</p><Link href="/admin">ადმინში დაბრუნება</Link></main>
  if (!token) return <main className={styles.center}><Loader2 className={styles.spin}/><p>ერთიანი ინვოისის ბაზა იტვირთება...</p></main>

  return <main className={styles.page}><div className={styles.wrap}>
    <header className={styles.hero}><div><p>ადმინი / ინვოისები</p><h1>ერთიანი ინვოისის ცენტრი</h1><span>გაყიდვები · მომწოდებლები · პროდუქტები · ძველი ბაზა</span></div><nav><Link href="/admin/invoices/ai-generator">გასაყიდი ინვოისი</Link><Link href="/admin/invoices">ისტორია</Link><Link href="/admin">ადმინი</Link></nav></header>
    {error && <div className={styles.error}><AlertTriangle size={17}/>{error}</div>}
    {notice && <div className={styles.notice}>{notice}</div>}
    <section className={styles.stats}><div><b>{history.length}</b><span>ყველა ინვოისი</span></div><div><b>{supplierInvoices.length}</b><span>მომწოდებლის ინვოისი</span></div><div><b>{products.length}</b><span>დაკავშირებული პროდუქტი</span></div><div><b>{manufacturers.length}</b><span>მწარმოებელი</span></div></section>
    <section className={styles.grid}><div className={styles.card}>
      <h2><Sparkles size={18}/> მომწოდებლის ინვოისის დამატება</h2>
      <label>ტექსტიდან ამოცნობა<textarea rows={5} value={chat} onChange={(event)=>setChat(event.target.value)} placeholder="Eighteeth invoice ET-001, 23/07/2026. Helios 680 — 2 pcs, 3000 USD;"/></label>
      <button className={styles.secondary} onClick={recognizeText}><Sparkles size={16}/>ამოცნობა</button>
      <div className={styles.formGrid}>
        <label>მწარმოებელი<select value={manufacturerId} onChange={(event)=>{setManufacturerId(event.target.value);setManufacturerName(manufacturers.find((item)=>item.id===event.target.value)?.name||'')}}><option value="">ახალი / ხელით</option>{manufacturers.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>ახალი მწარმოებელი<input value={manufacturerName} onChange={(event)=>setManufacturerName(event.target.value)} placeholder="თუ სიაში არ არის"/></label>
        <label>ინვოისის №<input value={invoiceNumber} onChange={(event)=>setInvoiceNumber(event.target.value)}/></label>
        <label>თარიღი<input type="date" value={invoiceDate} onChange={(event)=>setInvoiceDate(event.target.value)}/></label>
        <label>ვალუტა<select value={currency} onChange={(event)=>setCurrency(event.target.value as typeof currency)}><option>USD</option><option>EUR</option><option>GEL</option><option>CNY</option></select></label>
        <label>ფაილი<span className={styles.fileButton}><FileUp size={15}/>{busy==='upload'?'იტვირთება...':originalFilename||'PDF/XLSX/JPG/PNG'}<input type="file" accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event)=>{const file=event.target.files?.[0];if(file)void upload(file)}}/></span></label>
      </div>
      <datalist id="supplier-product-options">{products.map((product)=><option key={`${product.source}-${product.id}`} value={`${product.code} — ${product.name}`}/>)}</datalist>
      <div className={styles.itemsTitle}><h3>პროდუქტები</h3><button onClick={()=>setItems((current)=>[...current,blankItem()])}><Plus size={15}/>დამატება</button></div>
      <div className={styles.items}>{items.map((item,index)=><div className={styles.item} key={item.row_id}>
        <input list="supplier-product-options" value={item.product_name} placeholder="პროდუქტი ან კოდი" onChange={(event)=>selectProduct(index,event.target.value)} onBlur={(event)=>selectProduct(index,event.target.value)}/>
        <input value={item.sku} placeholder="SKU" onChange={(event)=>patchItem(index,{sku:event.target.value})}/>
        <input value={item.unit} placeholder="ერთეული" onChange={(event)=>patchItem(index,{unit:event.target.value})}/>
        <input type="number" min=".001" step=".001" value={item.quantity} onChange={(event)=>patchItem(index,{quantity:Number(event.target.value)})}/>
        <input type="number" min="0" step=".01" value={item.unit_price} onChange={(event)=>patchItem(index,{unit_price:Number(event.target.value)})}/>
        <button className={styles.trash} aria-label="პოზიციის წაშლა" onClick={()=>setItems((current)=>current.length===1?[blankItem()]:current.filter((_,i)=>i!==index))}><Trash2 size={15}/></button>
      </div>)}</div>
      <label>შენიშვნა<textarea rows={2} value={notes} onChange={(event)=>setNotes(event.target.value)}/></label>
      <div className={styles.total}>ჯამი <b>{computedTotal.toLocaleString('ka-GE',{minimumFractionDigits:2})} {currency}</b></div>
      <button className={styles.save} onClick={save} disabled={Boolean(busy)}>{busy==='save'?<Loader2 className={styles.spin} size={17}/>:<Save size={17}/>}შენახვა და ERP-ის განახლება</button>
    </div><div className={styles.card}><h2><PackagePlus size={18}/> ბოლო მომწოდებლის ინვოისები</h2><div className={styles.table}><table><thead><tr><th>თარიღი</th><th>მწარმოებელი</th><th>№</th><th>თანხა</th><th>ფაილი</th></tr></thead><tbody>{supplierInvoices.map((invoice)=><tr key={invoice.id}><td>{invoice.invoice_date}</td><td>{invoice.manufacturer_name}</td><td>{invoice.invoice_number||'—'}</td><td>{Number(invoice.total).toLocaleString()} {invoice.currency}</td><td>{invoice.original_filename||'—'}</td></tr>)}</tbody></table></div></div></section>
    <section className={styles.card}><h2>ყველა ბაზის ერთიანი ისტორია</h2><div className={styles.table}><table><thead><tr><th>ტიპი</th><th>თარიღი</th><th>კონტრაგენტი</th><th>№</th><th>თანხა</th><th>სტატუსი</th></tr></thead><tbody>{history.map((invoice)=><tr key={`${invoice.invoice_kind}-${invoice.source_id}`}><td>{invoice.invoice_kind}</td><td>{invoice.invoice_date||'—'}</td><td>{invoice.counterparty}</td><td>{invoice.number||'—'}</td><td>{Number(invoice.total||0).toLocaleString()} {invoice.currency}</td><td>{invoice.status}</td></tr>)}</tbody></table></div></section>
  </div></main>
}
