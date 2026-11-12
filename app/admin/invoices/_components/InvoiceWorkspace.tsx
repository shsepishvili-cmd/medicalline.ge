'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  ScanLine,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { calculateInvoice } from '@/app/lib/ai-invoice-money'
import type { InvoiceDraft, InvoiceDraftItem } from '@/app/lib/ai-invoice-types'
import { aiInvoiceSupabase } from '@/app/lib/ai-invoice-browser'
import styles from './invoice-workspace.module.css'

type SavedInvoice = {
  id: string
  invoice_number: string
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_tax_id?: string | null
  customer_address?: string | null
  invoice_date: string
  delivery_date?: string | null
  currency: 'GEL' | 'USD' | 'EUR'
  vat_mode: string
  status: string
  grand_total: number
  notes?: string | null
  clean_pdf_path?: string | null
  scanned_pdf_path?: string | null
  invoice_items?: Array<{ product_name: string; product_code?: string | null; unit: string; quantity: number; unit_price: number }>
  items?: Array<{ product_name: string; product_code?: string | null; unit: string; quantity: number; unit_price: number }>
  acceptance_acts?: Array<{ id: string; act_number: string; status: string; public_token: string; sms_sent: boolean; email_sent: boolean; accepted_at: string | null }>
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

type ActDraftItem = {
  product_name: string
  product_code: string | null
  unit: string
  quantity: number
  unit_price: number
}

type ActDraft = {
  invoice_id?: string
  invoice_number: string
  invoice_date: string
  delivery_date: string
  act_number: string
  act_date: string
  customer_name: string
  customer_tax_id: string
  customer_address: string
  customer_phone: string
  customer_email: string
  notes: string
  items: ActDraftItem[]
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

async function safeJson<T = Record<string, unknown>>(response: Response, fallbackError: string): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    if (!response.ok) {
      throw new Error(`სერვერმა დააბრუნა შეცდომა (${response.status})`)
    }
    throw new Error(fallbackError)
  }
}

export default function InvoiceWorkspace({
  historyOnly = false,
  initialMode = 'generator',
}: {
  historyOnly?: boolean
  initialMode?: 'generator' | 'acceptance-act' | 'history'
}) {
  const [gate, setGate] = useState<{ loading: boolean; error: string; accessToken: string; isAdmin: boolean }>({
    loading: true,
    error: '',
    accessToken: '',
    isAdmin: false,
  })
  const [mode, setMode] = useState<'generator' | 'acceptance-act' | 'history'>(historyOnly ? 'history' : initialMode)
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
  const [isDragging, setIsDragging] = useState(false)

  // Acceptance Act Draft state
  const [actDraft, setActDraft] = useState<ActDraft | null>(null)
  const [actOtpResult, setActOtpResult] = useState<{ otp: string; publicUrl: string; actNumber: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    let mounted = true
    async function verify() {
      const {
        data: { session },
      } = await aiInvoiceSupabase.auth.getSession()
      if (!session?.user?.id || !session.access_token) {
        if (mounted) setGate({ loading: false, error: 'ადმინისტრატორის სესია ვერ მოიძებნა.', accessToken: '', isAdmin: false })
        return
      }
      const { data: profile } = await aiInvoiceSupabase.from('profiles').select('role, status').eq('id', session.user.id).single()
      const isAdmin = profile?.role === 'admin' && (!profile.status || profile.status === 'active')
      if (mounted)
        setGate({
          loading: false,
          error: isAdmin ? '' : 'მოდული ხელმისაწვდომია მხოლოდ აქტიური ადმინისტრატორისთვის.',
          accessToken: isAdmin ? session.access_token : '',
          isAdmin,
        })
    }
    void verify()
    const {
      data: { subscription },
    } = aiInvoiceSupabase.auth.onAuthStateChange(() => {
      void verify()
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadInvoices = useCallback(async () => {
    if (!gate.accessToken) return
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const response = await fetch(`/api/admin/invoices?${params}`, { headers: headers(gate.accessToken, false), cache: 'no-store' })
    const payload = await safeJson<{ error?: string; invoices?: SavedInvoice[] }>(response, 'ინვოისები ვერ ჩაიტვირთა.')
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
    })
      .then(async (response) => {
        const payload = await safeJson<{ error?: string; products?: ProductOption[] }>(response, 'პროდუქციის ბაზა ვერ ჩაიტვირთა.')
        if (!response.ok) throw new Error(payload?.error || 'პროდუქციის ბაზა ვერ ჩაიტვირთა.')
        setProducts(payload.products || [])
      })
      .catch((cause) => {
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
    setBusy('parse')
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/invoices/parse', { method: 'POST', headers: headers(gate.accessToken), body: JSON.stringify({ prompt }) })
      const payload = await safeJson<any>(response, 'ტექსტის დამუშავების პასუხი ვერ დამუშავდა.')
      if (!response.ok) throw new Error(payload?.error || 'ტექსტი ვერ დამუშავდა.')
      setDraft(payload.draft)
      setSourcePath('')
      setNotice('მონახაზი მზადაა — გადაამოწმეთ ყველა ველი საბოლოო შექმნამდე.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ტექსტი ვერ დამუშავდა.')
    } finally {
      setBusy('')
    }
  }

  async function uploadFile(file: File) {
    if (!gate.accessToken) return
    setBusy('upload')
    setError('')
    setNotice('')
    try {
      const data = new FormData()
      data.append('file', file)
      const response = await fetch('/api/admin/invoices/upload', { method: 'POST', headers: headers(gate.accessToken, false), body: data })
      const payload = await safeJson<any>(response, 'ფაილის ატვირთვის პასუხი ვერ დამუშავდა.')
      if (!response.ok) throw new Error(payload?.error || 'ფაილი ვერ დამუშავდა.')
      setDraft(payload.draft)
      setSourcePath(payload.source_file_path || '')
      setNotice('ფაილიდან ამოცნობილი მონახაზი მზადაა — გადაამოწმეთ მონაცემები.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ფაილი ვერ დამუშავდა.')
    } finally {
      setBusy('')
    }
  }

  function patchDraft(patch: Partial<InvoiceDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }
  function patchItem(index: number, patch: Partial<InvoiceDraftItem>) {
    setDraft((current) => (current ? { ...current, items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) } : current))
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
      items: [
        {
          product_query: 'ხელით შეყვანილი პროდუქტი',
          product_name: '',
          description: '',
          product_code: null,
          unit: 'ცალი',
          quantity: 1,
          unit_price: 0,
          discount: 0,
          line_total: 0,
        },
      ],
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
    const selected = products.find(
      (product) =>
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
    if (draft.vat_mode === 'unknown') {
      setError('აირჩიეთ დღგ-ის რეჟიმი.')
      return
    }
    if (draft.questions.length) {
      setError('ჯერ მოაგვარეთ ყველა დამაზუსტებელი კითხვა.')
      return
    }
    setBusy('create')
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: headers(gate.accessToken),
        body: JSON.stringify({ draft, prompt, source_type: sourcePath ? 'file' : 'prompt', source_file_path: sourcePath || null }),
      })
      const payload = await safeJson<any>(response, 'ინვოისის შექმნის პასუხი ვერ დამუშავდა.')
      if (!response.ok) throw new Error(payload?.error || 'ინვოისი ვერ შეიქმნა.')
      setNotice(`ინვოისი ${payload.invoice.invoice_number} წარმატებით შეიქმნა.`)
      setDraft(null)
      await loadInvoices()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ინვოისი ვერ შეიქმნა.')
    } finally {
      setBusy('')
    }
  }

  // --- ACCEPTANCE ACT WORKFLOW FUNCTIONS ---

  function convertDraftToAcceptanceAct() {
    if (!draft) return
    const invNum = draft.invoice_number || `INV-${draft.invoice_date.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`
    const actNum = `ACT-${invNum.replace(/^INV-/i, '')}`
    setActDraft({
      invoice_number: invNum,
      invoice_date: draft.invoice_date,
      delivery_date: draft.delivery_date || draft.invoice_date,
      act_number: actNum,
      act_date: new Date().toISOString().slice(0, 10),
      customer_name: draft.customer_name,
      customer_tax_id: draft.customer_tax_id || '',
      customer_address: draft.customer_address || '',
      customer_phone: draft.customer_phone || '',
      customer_email: draft.customer_email || '',
      notes: draft.notes || 'საქონელი მიღებულია სრული კომპლექტაციით და შემოწმებულია.',
      items: draft.items.map((i) => ({
        product_name: i.product_name,
        product_code: i.product_code || null,
        unit: i.unit || 'ცალი',
        quantity: i.quantity || 1,
        unit_price: i.unit_price || 0,
      })),
    })
    setMode('acceptance-act')
    setNotice('მონახაზი გადატანილია მიღება-ჩაბარების აქტის სამუშაო სივრცეში.')
  }

  async function uploadInvoiceForAct(file: File) {
    if (!gate.accessToken) return
    setBusy('upload-act')
    setError('')
    setNotice('')
    setActOtpResult(null)
    try {
      const data = new FormData()
      data.append('file', file)
      const response = await fetch('/api/admin/invoices/upload', {
        method: 'POST',
        headers: headers(gate.accessToken, false),
        body: data,
      })
      const payload = await safeJson<any>(response, 'ინვოისის ფაილის პასუხი ვერ დამუშავდა.')
      if (!response.ok) throw new Error(payload?.error || 'ინვოისის ფაილი ვერ დამუშავდა.')
      const d = payload.draft
      const invNum =
        d.invoice_number || `INV-${(d.invoice_date || new Date().toISOString()).slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`
      const actNum = `ACT-${invNum.replace(/^INV-/i, '')}`
      setActDraft({
        invoice_number: invNum,
        invoice_date: d.invoice_date || new Date().toISOString().slice(0, 10),
        delivery_date: d.delivery_date || d.invoice_date || new Date().toISOString().slice(0, 10),
        act_number: actNum,
        act_date: new Date().toISOString().slice(0, 10),
        customer_name: d.customer_name || '',
        customer_tax_id: d.customer_tax_id || '',
        customer_address: d.customer_address || '',
        customer_phone: d.customer_phone || '',
        customer_email: d.customer_email || '',
        notes: d.notes || 'საქონელი მიღებულია სრული კომპლექტაციით და დაზიანების გარეშე.',
        items: d.items?.length
          ? d.items.map((item: { product_name?: string; product_code?: string | null; unit?: string; quantity?: number; unit_price?: number }) => ({
              product_name: item.product_name || 'პროდუქტი',
              product_code: item.product_code || null,
              unit: item.unit || 'ცალი',
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.unit_price) || 0,
            }))
          : [{ product_name: 'სამედიცინო აპარატურა / მასალები', product_code: null, unit: 'ცალი', quantity: 1, unit_price: 0 }],
      })
      setNotice(`ინვოისი "${file.name}" წარმატებით ამოიცნო! მიღება-ჩაბარების აქტის მონახაზი აწყობილია.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ინვოისის დამუშავება ვერ მოხერხდა.')
    } finally {
      setBusy('')
    }
  }

  function selectInvoiceForAct(selectedInv: SavedInvoice) {
    const actNum = selectedInv.acceptance_acts?.[0]?.act_number || `ACT-${selectedInv.invoice_number.replace(/^INV-/i, '')}`
    const rawItems = selectedInv.invoice_items || selectedInv.items || []
    setActDraft({
      invoice_id: selectedInv.id,
      invoice_number: selectedInv.invoice_number,
      invoice_date: selectedInv.invoice_date,
      delivery_date: selectedInv.delivery_date || selectedInv.invoice_date,
      act_number: actNum,
      act_date: new Date().toISOString().slice(0, 10),
      customer_name: selectedInv.customer_name || '',
      customer_tax_id: selectedInv.customer_tax_id || '',
      customer_address: selectedInv.customer_address || '',
      customer_phone: selectedInv.customer_phone || '',
      customer_email: selectedInv.customer_email || '',
      notes: selectedInv.notes || 'საქონელი მიღებულია სრული კომპლექტაციით და დაზიანების გარეშე.',
      items: rawItems.length
        ? rawItems.map((item: { product_name?: string; product_code?: string | null; unit?: string; quantity?: number; unit_price?: number }) => ({
            product_name: item.product_name || 'პროდუქტი',
            product_code: item.product_code || null,
            unit: item.unit || 'ცალი',
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
          }))
        : [{ product_name: 'სამედიცინო აპარატურა', product_code: null, unit: 'ცალი', quantity: 1, unit_price: 0 }],
    })
    setMode('acceptance-act')
    setNotice(`არჩეულია ინვოისი ${selectedInv.invoice_number} აქტის ასაწყობად.`)
  }

  async function downloadActPdf() {
    if (!gate.accessToken || !actDraft) return
    setBusy('act-pdf')
    setError('')
    try {
      const response = await fetch('/api/admin/invoices/acceptance-act/preview-pdf', {
        method: 'POST',
        headers: headers(gate.accessToken),
        body: JSON.stringify(actDraft),
      })
      if (!response.ok) {
        const errJson = await response.json().catch(() => null)
        throw new Error(errJson?.error || 'PDF-ის გენერაცია ვერ შესრულდა.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF-ის გენერაცია ვერ შესრულდა.')
    } finally {
      setBusy('')
    }
  }

  async function saveAndSendAct() {
    if (!gate.accessToken || !actDraft) return
    if (!actDraft.customer_name.trim()) {
      setError('მიუთითეთ მყიდველის / კლინიკის დასახელება.')
      return
    }
    if (!actDraft.items.length) {
      setError('დაამატეთ მინიმუმ ერთი პროდუქტი.')
      return
    }
    setBusy('save-act')
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/invoices/acceptance-act/create-direct', {
        method: 'POST',
        headers: headers(gate.accessToken),
        body: JSON.stringify(actDraft),
      })
      const payload = await safeJson<any>(response, 'აქტის შექმნის პასუხი ვერ დამუშავდა.')
      if (!response.ok || !payload.ok) throw new Error(payload?.error || 'აქტი ვერ შეიქმნა.')
      if (payload.publicUrl && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.publicUrl).catch(() => undefined)
      }
      setActOtpResult({
        otp: payload.otp,
        publicUrl: payload.publicUrl,
        actNumber: payload.act?.act_number || actDraft.act_number,
      })
      const delivered = [payload.smsSent ? 'SMS' : '', payload.emailSent ? 'Email' : ''].filter(Boolean).join(' + ')
      setNotice(`მიღება-ჩაბარების აქტი ${payload.act?.act_number} წარმატებით შეიქმნა${delivered ? ` და გაიგზავნა (${delivered})` : ''}!`)
      await loadInvoices()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'აქტი ვერ შეიქმნა.')
    } finally {
      setBusy('')
    }
  }

  async function copyPublicLink(url: string) {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  // --- STANDARD INVOICE ACTIONS ---

  async function pdf(invoice: SavedInvoice, kind: 'clean' | 'scanned') {
    if (!gate.accessToken) return
    setBusy(`${invoice.id}-${kind}`)
    setError('')
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/pdf`, { method: 'POST', headers: headers(gate.accessToken), body: JSON.stringify({ kind }) })
      const payload = await safeJson<any>(response, 'PDF-ის პასუხი ვერ დამუშავდა.')
      if (!response.ok) throw new Error(payload?.error || 'PDF ვერ შეიქმნა.')
      window.open(payload.url, '_blank', 'noopener,noreferrer')
      await loadInvoices()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF ვერ შეიქმნა.')
    } finally {
      setBusy('')
    }
  }

  async function share(invoice: SavedInvoice, channel: 'email' | 'sms' | 'whatsapp' | 'link') {
    if (!gate.accessToken) return
    setBusy(`${invoice.id}-${channel}`)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/share`, {
        method: 'POST',
        headers: headers(gate.accessToken),
        body: JSON.stringify({ channel: channel === 'sms' ? 'sms' : 'link' }),
      })
      const payload = await safeJson<any>(response, 'გაზიარების პასუხი ვერ დამუშავდა.')
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'გაზიარების ლინკი ვერ შეიქმნა.')
      if (payload.shareUrl && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.shareUrl).catch(() => undefined)
      }
      if (channel === 'email') window.location.href = payload.mailtoUrl
      if (channel === 'whatsapp') window.open(payload.whatsappUrl, '_blank', 'noopener,noreferrer')
      if (channel === 'link') window.open(payload.shareUrl, '_blank', 'noopener,noreferrer')
      setNotice(channel === 'sms' ? `SMS გაიგზავნა: ${invoice.invoice_number}` : `ლინკი მზადაა და დაკოპირდა: ${payload.shareUrl}`)
      await loadInvoices()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'გაზიარება ვერ მოხერხდა.')
    } finally {
      setBusy('')
    }
  }

  async function createAcceptanceAct(invoice: SavedInvoice) {
    if (!gate.accessToken) return
    setBusy(`${invoice.id}-acceptance-act`)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/acceptance-act`, {
        method: 'POST',
        headers: headers(gate.accessToken),
      })
      const payload = await safeJson<any>(response, 'აქტის შექმნის პასუხი ვერ დამუშავდა.')
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'მიღება-ჩაბარების აქტი ვერ შეიქმნა.')
      if (payload.publicUrl && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.publicUrl).catch(() => undefined)
      }
      if (!payload.emailSent && payload.mailtoUrl && invoice.customer_email) {
        window.location.href = payload.mailtoUrl
      }
      const delivered = [payload.smsSent ? 'SMS' : '', payload.emailSent ? 'Email' : ''].filter(Boolean).join(' + ')
      const warning = Array.isArray(payload.deliveryErrors) && payload.deliveryErrors.length ? ` (${payload.deliveryErrors.join('; ')})` : ''
      setNotice(
        payload.alreadyAccepted
          ? `აქტი უკვე დადასტურებულია: ${payload.act?.act_number || ''}`
          : `მიღება-ჩაბარების აქტი მზადაა${delivered ? ` და გაიგზავნა: ${delivered}` : ''}.${warning}`
      )
      if (payload.publicUrl) window.open(payload.publicUrl, '_blank', 'noopener,noreferrer')
      await loadInvoices()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'მიღება-ჩაბარების აქტი ვერ შეიქმნა.')
    } finally {
      setBusy('')
    }
  }

  async function cancel(invoice: SavedInvoice) {
    if (!gate.accessToken || !confirm(`გაუქმდეს ${invoice.invoice_number}? ჩანაწერი არ წაიშლება.`)) return
    const response = await fetch(`/api/admin/invoices/${invoice.id}`, { method: 'PATCH', headers: headers(gate.accessToken), body: JSON.stringify({ status: 'cancelled' }) })
    const payload = await safeJson<any>(response, 'გაუქმების პასუხი ვერ დამუშავდა.')
    if (!response.ok) {
      setError(payload?.error || 'გაუქმება ვერ მოხერხდა.')
      return
    }
    await loadInvoices()
  }

  if (gate.loading)
    return (
      <main className={styles.centerState}>
        <Loader2 className={styles.spin} size={28} />
        <p>ინვოისის მოდული იტვირთება...</p>
      </main>
    )
  if (gate.error || !gate.accessToken || !gate.isAdmin)
    return (
      <main className={styles.centerState}>
        <AlertTriangle size={30} />
        <p>{gate.error}</p>
        <Link href="/admin">ადმინში დაბრუნება</Link>
      </main>
    )

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.hero}>
          <div>
            <p>ადმინი / ფინანსები და დოკუმენტები</p>
            <h1>
              {mode === 'acceptance-act'
                ? 'მიღება-ჩაბარების აქტი'
                : mode === 'history'
                ? 'ინვოისები და აქტები'
                : 'AI ინვოისის გენერატორი'}
            </h1>
            <span>
              {mode === 'acceptance-act'
                ? 'ინვოისის ჩაგდება ან არჩევა → აქტის ავტომატური აწყობა, ბეჭდიანი PDF და OTP'
                : mode === 'history'
                ? 'ინვოისების დაცული ისტორია, PDF ვერსიები და მიღება-ჩაბარების სტატუსები'
                : 'ტექსტიდან ან დოკუმენტიდან — კონტროლირებად მონახაზამდე'}
            </span>
          </div>
          <nav className={styles.navTabs}>
            <Link href="/admin" className={styles.navTab}>ადმინი</Link>
            <button
              type="button"
              className={`${styles.navTab} ${mode === 'history' ? styles.navTabActive : ''}`}
              onClick={() => setMode('history')}
            >
              ისტორია
            </button>
            <button
              type="button"
              className={`${styles.navTab} ${mode === 'generator' ? styles.navTabActive : ''}`}
              onClick={() => setMode('generator')}
            >
              <Sparkles size={16} />
              AI ინვოისი
            </button>
            <button
              type="button"
              className={`${styles.navTab} ${mode === 'acceptance-act' ? styles.navTabActive : ''}`}
              onClick={() => {
                setMode('acceptance-act')
                if (!actDraft && invoices.length) {
                  selectInvoiceForAct(invoices[0])
                }
              }}
            >
              <ClipboardCheck size={16} />
              მიღება-ჩაბარების აქტი
            </button>
            <Link href="/admin/invoices/suppliers" className={styles.navTab}>მომწოდებლები</Link>
          </nav>
        </header>

        {error && (
          <div className={styles.error}>
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {notice && (
          <div className={styles.notice}>
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {/* 1. ACCEPTANCE ACT DIRECT BUILDER MODE */}
        {mode === 'acceptance-act' && (
          <div className={styles.workspace}>
            <section className={styles.composerCard}>
              <div className={styles.sectionTitle}>
                <Upload size={18} />
                <div>
                  <h2>ინვოისის ჩაგდება / არჩევა</h2>
                  <p>ჩააგდეთ ინვოისის ფაილი და სისტემა ავტომატურად ააწყობს მიღება-ჩაბარების აქტს.</p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                className={styles.actDropZone}
                style={{ borderColor: isDragging ? '#075344' : undefined, background: isDragging ? '#e5f4ef' : undefined }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) void uploadInvoiceForAct(file)
                }}
                onClick={() => {
                  const input = document.getElementById('act-invoice-file-input')
                  input?.click()
                }}
              >
                <input
                  id="act-invoice-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadInvoiceForAct(file)
                    e.currentTarget.value = ''
                  }}
                />
                <Upload size={32} color="#075344" />
                <p>
                  {busy === 'upload-act'
                    ? 'ინვოისი მუშავდება და იკითხება...'
                    : 'ჩააგდეთ ინვოისი აქ (PDF, JPG, PNG ან XLSX)'}
                </p>
                <small>ან დააჭირეთ ასატვირთად კომპიუტერიდან</small>
              </div>

              {/* Selector for existing invoices */}
              {invoices.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                    ან აირჩიეთ სისტემაში არსებული ინვოისი:
                  </label>
                  <select
                    className={styles.actSelectInvoice}
                    value={actDraft?.invoice_id || ''}
                    onChange={(e) => {
                      const selected = invoices.find((inv) => inv.id === e.target.value)
                      if (selected) selectInvoiceForAct(selected)
                    }}
                  >
                    <option value="">-- აირჩიეთ ინვოისი --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.customer_name} ({inv.invoice_date}) · {money(Number(inv.grand_total), inv.currency)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manual act start */}
              <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={styles.manualButton}
                  style={{ width: '100%' }}
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10)
                    const rand = Math.floor(1000 + Math.random() * 9000)
                    setActDraft({
                      invoice_number: `INV-2026-${rand}`,
                      invoice_date: today,
                      delivery_date: today,
                      act_number: `ACT-2026-${rand}`,
                      act_date: today,
                      customer_name: '',
                      customer_tax_id: '',
                      customer_address: '',
                      customer_phone: '',
                      customer_email: '',
                      notes: 'საქონელი მიღებულია სრული კომპლექტაციით და დაზიანების გარეშე.',
                      items: [{ product_name: '', product_code: null, unit: 'ცალი', quantity: 1, unit_price: 0 }],
                    })
                    setActOtpResult(null)
                  }}
                >
                  <Plus size={16} />
                  ხელით შევსება
                </button>
              </div>
            </section>

            {/* Act Visual Preview & Live Editor Card */}
            <section className={styles.previewCard}>
              {!actDraft ? (
                <div className={styles.empty}>
                  <ClipboardCheck size={42} />
                  <h2>მიღება-ჩაბარების აქტი ჯერ არ არის აწყობილი</h2>
                  <p>ჩააგდეთ ინვოისის ფაილი მარცხნივ ან აირჩიეთ არსებული ინვოისი.</p>
                </div>
              ) : (
                <div className={styles.actPaperPreview}>
                  {/* Paper Header */}
                  <div className={styles.actPaperHeader}>
                    <div>
                      <div className={styles.actBrand}>MEDICAL LINE GEORGIA</div>
                      <h2 className={styles.actTitle}>მიღება-ჩაბარების აქტი</h2>
                    </div>
                    <div className={styles.actMeta}>
                      <b>{actDraft.act_number}</b>
                      <span>თარიღი: {actDraft.act_date}</span>
                    </div>
                  </div>

                  {/* Meta inputs row */}
                  <div className={styles.formGrid}>
                    <label>
                      აქტის ნომერი
                      <input
                        value={actDraft.act_number}
                        onChange={(e) => setActDraft({ ...actDraft, act_number: e.target.value })}
                      />
                    </label>
                    <label>
                      აქტის თარიღი
                      <input
                        type="date"
                        value={actDraft.act_date}
                        onChange={(e) => setActDraft({ ...actDraft, act_date: e.target.value })}
                      />
                    </label>
                    <label>
                      საფუძველი: ინვოისის №
                      <input
                        value={actDraft.invoice_number}
                        onChange={(e) => setActDraft({ ...actDraft, invoice_number: e.target.value })}
                      />
                    </label>
                    <label>
                      ინვოისის თარიღი
                      <input
                        type="date"
                        value={actDraft.invoice_date}
                        onChange={(e) => setActDraft({ ...actDraft, invoice_date: e.target.value })}
                      />
                    </label>
                  </div>

                  {/* Parties block */}
                  <div className={styles.actPartiesGrid}>
                    <div className={styles.actPartyCol}>
                      <small>ჩამბარებელი (გამყიდველი)</small>
                      <b>შპს „მედიქალ ლაინ ჯორჯია“</b>
                      <span>ს/კ: 417893569</span>
                      <span>თბილისი, ჯაბიძის ქუჩა 8</span>
                      <span>დირექტორი: შოთა სეფიშვილი</span>
                    </div>
                    <div className={styles.actPartyCol}>
                      <small>მიმღები (მყიდველი)</small>
                      <input
                        placeholder="კლინიკის / ექიმის დასახელება *"
                        value={actDraft.customer_name}
                        onChange={(e) => setActDraft({ ...actDraft, customer_name: e.target.value })}
                      />
                      <input
                        placeholder="საიდენტიფიკაციო კოდი (ს/კ)"
                        value={actDraft.customer_tax_id}
                        onChange={(e) => setActDraft({ ...actDraft, customer_tax_id: e.target.value })}
                      />
                      <input
                        placeholder="მისამართი"
                        value={actDraft.customer_address}
                        onChange={(e) => setActDraft({ ...actDraft, customer_address: e.target.value })}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                        <input
                          placeholder="ტელეფონი (OTP-სთვის)"
                          value={actDraft.customer_phone}
                          onChange={(e) => setActDraft({ ...actDraft, customer_phone: e.target.value })}
                        />
                        <input
                          placeholder="ელფოსტა"
                          value={actDraft.customer_email}
                          onChange={(e) => setActDraft({ ...actDraft, customer_email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 14 }}>გადაცემული საქონლის ჩამონათვალი</h3>
                      <button
                        type="button"
                        style={{
                          background: '#edf7f4',
                          color: '#075344',
                          border: 0,
                          borderRadius: 7,
                          padding: '6px 10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        onClick={() =>
                          setActDraft({
                            ...actDraft,
                            items: [...actDraft.items, { product_name: '', product_code: null, unit: 'ცალი', quantity: 1, unit_price: 0 }],
                          })
                        }
                      >
                        <Plus size={14} /> პოზიციის დამატება
                      </button>
                    </div>

                    <table className={styles.actItemsTable}>
                      <thead>
                        <tr>
                          <th style={{ width: 30 }}>№</th>
                          <th>საქონლის დასახელება</th>
                          <th style={{ width: 110 }}>კოდი</th>
                          <th style={{ width: 80 }}>ერთ.</th>
                          <th style={{ width: 80 }}>რაოდ.</th>
                          <th style={{ width: 35 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {actDraft.items.map((item, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              <input
                                value={item.product_name}
                                placeholder="დასახელება"
                                onChange={(e) => {
                                  const next = [...actDraft.items]
                                  next[index].product_name = e.target.value
                                  setActDraft({ ...actDraft, items: next })
                                }}
                              />
                            </td>
                            <td>
                              <input
                                value={item.product_code || ''}
                                placeholder="კოდი"
                                onChange={(e) => {
                                  const next = [...actDraft.items]
                                  next[index].product_code = e.target.value || null
                                  setActDraft({ ...actDraft, items: next })
                                }}
                              />
                            </td>
                            <td>
                              <input
                                value={item.unit}
                                onChange={(e) => {
                                  const next = [...actDraft.items]
                                  next[index].unit = e.target.value
                                  setActDraft({ ...actDraft, items: next })
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => {
                                  const next = [...actDraft.items]
                                  next[index].quantity = Number(e.target.value) || 1
                                  setActDraft({ ...actDraft, items: next })
                                }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.iconButton}
                                style={{ height: 28, width: 28 }}
                                onClick={() => {
                                  const next = actDraft.items.filter((_, i) => i !== index)
                                  setActDraft({ ...actDraft, items: next })
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes & Delivery terms */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: '#4b625a' }}>
                      შენიშვნა / დამატებითი პირობა:
                      <textarea
                        rows={2}
                        value={actDraft.notes}
                        onChange={(e) => setActDraft({ ...actDraft, notes: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd8d3', borderRadius: 8, padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  {/* Signatures & Seal preview */}
                  <div className={styles.actSignatures}>
                    <div>
                      <small style={{ color: '#075344', fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>ჩამბარებელი</small>
                      <b style={{ display: 'block', fontSize: 13 }}>შპს „მედიქალ ლაინ ჯორჯია“</b>
                      <span style={{ fontSize: 11, color: '#64748b' }}>შოთა სეფიშვილი</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/invoice-stamp.jpg" alt="ბეჭედი" className={styles.actStampImg} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <small style={{ color: '#075344', fontWeight: 800, textTransform: 'uppercase', fontSize: 10 }}>მიმღები</small>
                      <b style={{ display: 'block', fontSize: 13 }}>{actDraft.customer_name || 'მყიდველი'}</b>
                      <span style={{ fontSize: 11, color: '#64748b' }}>ელექტრონული OTP დადასტურება</span>
                      <div style={{ borderBottom: '1px solid #94a3b8', width: 180, marginTop: 40, marginLeft: 'auto' }} />
                      <small style={{ color: '#94a3b8', fontSize: 10 }}>სახელი, გვარი / ხელმოწერა</small>
                    </div>
                  </div>

                  {/* OTP Result Banner if generated */}
                  {actOtpResult && (
                    <div className={styles.actOtpBanner}>
                      <div>
                        <strong>OTP: {actOtpResult.otp}</strong>
                        <span style={{ marginLeft: 12 }}>კლიენტის ხელმოწერის ბმული:</span>
                        <a
                          href={actOtpResult.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginLeft: 6, color: '#075344', fontWeight: 700, textDecoration: 'underline' }}
                        >
                          {actOtpResult.publicUrl}
                        </a>
                      </div>
                      <button
                        type="button"
                        className={styles.actBtnCopy}
                        onClick={() => copyPublicLink(actOtpResult.publicUrl)}
                        style={{ marginLeft: 'auto' }}
                      >
                        {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLink ? 'დაკოპირდა!' : 'ლინკის კოპირება'}
                      </button>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className={styles.actActionBar}>
                    <button
                      type="button"
                      className={styles.actBtnPdf}
                      disabled={Boolean(busy)}
                      onClick={downloadActPdf}
                    >
                      {busy === 'act-pdf' ? <Loader2 className={styles.spin} size={16} /> : <FileText size={16} />}
                      ბეჭდიანი PDF
                    </button>

                    <button
                      type="button"
                      className={styles.actBtnSend}
                      disabled={Boolean(busy)}
                      onClick={saveAndSendAct}
                    >
                      {busy === 'save-act' ? <Loader2 className={styles.spin} size={16} /> : <Send size={16} />}
                      აქტის შენახვა და OTP-ით გაგზავნა
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* 2. AI INVOICE GENERATOR MODE */}
        {mode === 'generator' && (
          <div className={styles.workspace}>
            <section className={styles.composerCard}>
              <div className={styles.sectionTitle}>
                <Sparkles size={18} />
                <div>
                  <h2>მოთხოვნა</h2>
                  <p>AI საბოლოო ინვოისს ავტომატურად არ შექმნის.</p>
                </div>
              </div>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={12} maxLength={20000} />
              <div className={styles.composerActions}>
                <label className={styles.uploadButton}>
                  <Upload size={16} />
                  {busy === 'upload' ? 'იტვირთება...' : 'PDF, JPG, PNG ან XLSX'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                    disabled={Boolean(busy)}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void uploadFile(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                <button type="button" className={styles.manualButton} onClick={startManualDraft} disabled={Boolean(busy)}>
                  <Plus size={17} />
                  ხელით შევსება
                </button>
                <button onClick={parsePrompt} disabled={Boolean(busy) || prompt.trim().length < 10}>
                  {busy === 'parse' ? <Loader2 className={styles.spin} size={17} /> : <Sparkles size={17} />}
                  ინვოისის მონახაზის შექმნა
                </button>
              </div>
              {sourcePath && <small>წყარო დაცულად აიტვირთა: {sourcePath.split('/').pop()}</small>}
            </section>

            <section className={styles.previewCard}>
              {!draft ? (
                <div className={styles.empty}>
                  <FileText size={36} />
                  <h2>მონახაზი აქ გამოჩნდება</h2>
                  <p>შეიყვანეთ მოთხოვნა ან ატვირთეთ დოკუმენტი.</p>
                </div>
              ) : (
                <>
                  <div className={styles.sectionTitle}>
                    <FileText size={18} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>რედაქტირებადი მონახაზი</h2>
                        <button
                          type="button"
                          className={styles.manualButton}
                          onClick={convertDraftToAcceptanceAct}
                          style={{ fontSize: 12, padding: '7px 11px' }}
                        >
                          <ClipboardCheck size={15} />
                          მიღება-ჩაბარების აქტად გადაკეთება
                        </button>
                      </div>
                      <p>საბოლოო ნომერი მიენიჭება მხოლოდ შექმნისას.</p>
                    </div>
                  </div>
                  {draft.questions.map((question, index) => (
                    <div className={styles.question} key={`${question}-${index}`}>
                      <span>{question}</span>
                      <button onClick={() => patchDraft({ questions: draft.questions.filter((_, i) => i !== index) })}>მოგვარებულია</button>
                    </div>
                  ))}
                  {draft.warnings.map((warning) => (
                    <div className={styles.warning} key={warning}>
                      <AlertTriangle size={15} />
                      {warning}
                    </div>
                  ))}
                  <div className={styles.formGrid}>
                    <label>
                      ინვოისის თარიღი
                      <input type="date" value={draft.invoice_date} onChange={(e) => patchDraft({ invoice_date: e.target.value })} />
                    </label>
                    <label>
                      მიწოდების თარიღი
                      <input type="date" value={draft.delivery_date || ''} onChange={(e) => patchDraft({ delivery_date: e.target.value || null })} />
                    </label>
                    <label>
                      ვალუტა
                      <select value={draft.currency} onChange={(e) => patchDraft({ currency: e.target.value as InvoiceDraft['currency'] })}>
                        <option>GEL</option>
                        <option>USD</option>
                        <option>EUR</option>
                      </select>
                    </label>
                    <label>
                      დღგ-ის რეჟიმი
                      <select
                        value={draft.vat_mode}
                        onChange={(e) =>
                          patchDraft({
                            vat_mode: e.target.value as InvoiceDraft['vat_mode'],
                            questions: draft.questions.filter((q) => !q.includes('დღგ')),
                          })
                        }
                      >
                        <option value="unknown">დასაზუსტებელი</option>
                        <option value="without_vat">დღგ-ის გარეშე</option>
                        <option value="vat_included">დღგ-ის ჩათვლით</option>
                        <option value="vat_excluded_add_vat">დღგ-ის დამატებით</option>
                      </select>
                    </label>
                    <label className={styles.span2}>
                      მყიდველი
                      <input value={draft.customer_name} onChange={(e) => patchDraft({ customer_name: e.target.value })} />
                    </label>
                    <label>
                      საიდენტიფიკაციო კოდი
                      <input value={draft.customer_tax_id} onChange={(e) => patchDraft({ customer_tax_id: e.target.value })} />
                    </label>
                    <label>
                      ელფოსტა
                      <input type="email" value={draft.customer_email} onChange={(e) => patchDraft({ customer_email: e.target.value })} />
                    </label>
                    <label className={styles.span2}>
                      მისამართი
                      <input value={draft.customer_address} onChange={(e) => patchDraft({ customer_address: e.target.value })} />
                    </label>
                  </div>
                  <div className={styles.itemsHeader}>
                    <h3>პროდუქტები</h3>
                    <button
                      onClick={() =>
                        patchDraft({
                          items: [
                            ...draft.items,
                            { product_query: '', product_name: '', description: '', product_code: null, unit: 'ცალი', quantity: 1, unit_price: 0, discount: 0, line_total: 0 },
                          ],
                        })
                      }
                    >
                      <Plus size={15} />
                      პოზიცია
                    </button>
                  </div>
                  <datalist id="invoice-product-options">
                    {products.map((product) => (
                      <option key={`${product.source}-${product.id}`} value={`${product.code} — ${product.name}`}>
                        {product.name} · {money(product.price, 'GEL')} · {product.source === 'erp' ? 'ERP' : 'კატალოგი'}
                      </option>
                    ))}
                  </datalist>
                  <div className={styles.catalogStatus}>{products.length ? `${products.length} პროდუქტი დაკავშირებულია ბაზიდან` : 'პროდუქციის ბაზა იტვირთება...'}</div>
                  <div className={styles.items}>
                    {draft.items.map((item, index) => (
                      <div className={styles.item} key={`${item.product_id || 'manual'}-${index}`}>
                        <b>{index + 1}</b>
                        <label>
                          პროდუქტი (ბაზიდან ან ხელით)
                          <input
                            list="invoice-product-options"
                            value={item.product_name}
                            placeholder="ჩაწერეთ კოდი ან დასახელება"
                            onChange={(e) => selectProduct(index, e.target.value)}
                            onBlur={(e) => selectProduct(index, e.target.value)}
                          />
                        </label>
                        <label>
                          კოდი
                          <input value={item.product_code || ''} onChange={(e) => patchItem(index, { product_code: e.target.value || null })} />
                        </label>
                        <label>
                          ერთეული
                          <input value={item.unit} onChange={(e) => patchItem(index, { unit: e.target.value })} />
                        </label>
                        <label>
                          რაოდენობა
                          <input type="number" min=".001" step=".001" value={item.quantity} onChange={(e) => patchItem(index, { quantity: Number(e.target.value) })} />
                        </label>
                        <label>
                          ფასი
                          <input type="number" min="0" step=".01" value={item.unit_price} onChange={(e) => patchItem(index, { unit_price: Number(e.target.value) })} />
                        </label>
                        <label>
                          ფასდაკლება
                          <input type="number" min="0" step=".01" value={item.discount} onChange={(e) => patchItem(index, { discount: Number(e.target.value) })} />
                        </label>
                        <span className={styles.lineTotal}>{money(totals?.items[index]?.line_total || 0, draft.currency)}</span>
                        <button className={styles.iconButton} aria-label="პოზიციის წაშლა" onClick={() => patchDraft({ items: draft.items.filter((_, i) => i !== index) })}>
                          <Trash2 size={16} />
                        </button>
                        {item.match_warning && <small>{item.match_warning}</small>}
                      </div>
                    ))}
                  </div>
                  <div className={styles.bottomGrid}>
                    <div>
                      <label>
                        გადახდის პირობა
                        <textarea rows={2} value={draft.payment_terms} onChange={(e) => patchDraft({ payment_terms: e.target.value })} />
                      </label>
                      <label>
                        შენიშვნა
                        <textarea rows={2} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} />
                      </label>
                      <div className={styles.checks}>
                        <label>
                          <input type="checkbox" checked={draft.stamp_applied} onChange={(e) => patchDraft({ stamp_applied: e.target.checked })} />
                          ბეჭედი
                        </label>
                        <label>
                          <input type="checkbox" checked={draft.signature_applied} onChange={(e) => patchDraft({ signature_applied: e.target.checked })} />
                          ხელმოწერა
                        </label>
                        <label>
                          <input type="checkbox" checked={draft.requested_scanned_version} onChange={(e) => patchDraft({ requested_scanned_version: e.target.checked })} />
                          დასკანერებული PDF
                        </label>
                      </div>
                    </div>
                    <div className={styles.totals}>
                      <span>
                        ქვეჯამი <b>{money(totals?.subtotal || 0, draft.currency)}</b>
                      </span>
                      <span>
                        ფასდაკლება <b>{money(totals?.discount_total || 0, draft.currency)}</b>
                      </span>
                      {draft.vat_mode === 'vat_excluded_add_vat' && (
                        <span>
                          დღგ <b>{money(totals?.vat_total || 0, draft.currency)}</b>
                        </span>
                      )}
                      <strong>
                        საბოლოო თანხა <b>{money(totals?.grand_total || 0, draft.currency)}</b>
                      </strong>
                    </div>
                  </div>
                  <button className={styles.createButton} onClick={createInvoice} disabled={Boolean(busy) || !totals || !draft.items.length}>
                    {busy === 'create' ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
                    ინვოისის შექმნა
                  </button>
                </>
              )}
            </section>
          </div>
        )}

        {/* 3. INVOICES & ACCEPTANCE ACTS HISTORY TABLE */}
        <section className={styles.history}>
          <div className={styles.historyTop}>
            <div>
              <h2>ინვოისებისა და აქტების ისტორია</h2>
              <p>დოკუმენტები არ იშლება — მიღება-ჩაბარების აქტის გენერაცია შესაძლებელია ნებისმიერი ინვოისიდან.</p>
            </div>
            <div>
              <input placeholder="ნომერი ან კლიენტი" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">ყველა სტატუსი</option>
                <option value="issued">შექმნილი</option>
                <option value="sent">გაგზავნილი</option>
                <option value="paid">გადახდილი</option>
                <option value="cancelled">გაუქმებული</option>
              </select>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>ნომერი</th>
                  <th>კლიენტი</th>
                  <th>თარიღი</th>
                  <th>ჯამი</th>
                  <th>დღგ</th>
                  <th>სტატუსი</th>
                  <th>მოქმედებები</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <b>{invoice.invoice_number}</b>
                      {invoice.acceptance_acts?.[0] && (
                        <small className={styles.actStatus}>
                          აქტი: {invoice.acceptance_acts[0].status === 'accepted' ? 'დადასტურებულია' : invoice.acceptance_acts[0].status}
                        </small>
                      )}
                    </td>
                    <td>{invoice.customer_name}</td>
                    <td>{invoice.invoice_date}</td>
                    <td>{money(Number(invoice.grand_total), invoice.currency)}</td>
                    <td>{invoice.vat_mode}</td>
                    <td>
                      <span className={styles.status}>{invoice.status}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.actButton}
                          onClick={() => selectInvoiceForAct(invoice)}
                          disabled={Boolean(busy) || invoice.status === 'cancelled'}
                          title="აქტის რედაქტირება და აწყობა"
                        >
                          <ClipboardCheck size={14} />
                          {invoice.acceptance_acts?.[0] ? 'აქტის ნახვა / რედაქტირება' : 'აქტის აწყობა'}
                        </button>
                        <button
                          onClick={() => createAcceptanceAct(invoice)}
                          disabled={Boolean(busy) || invoice.status === 'cancelled'}
                          title="1-კლიკით აქტის შექმნა და OTP-ის გაგზავნა"
                        >
                          <Send size={14} />
                          {invoice.acceptance_acts?.[0] ? 'OTP ხელახლა' : 'აქტი + OTP'}
                        </button>
                        <button onClick={() => pdf(invoice, 'clean')} disabled={Boolean(busy)}>
                          <FileText size={14} />
                          PDF
                        </button>
                        <button onClick={() => pdf(invoice, 'scanned')} disabled={Boolean(busy)}>
                          <ScanLine size={14} />
                          Scan
                        </button>
                        <button onClick={() => share(invoice, 'link')} disabled={Boolean(busy)}>
                          <Copy size={14} />
                          ლინკი
                        </button>
                        {invoice.customer_email && (
                          <button onClick={() => share(invoice, 'email')} disabled={Boolean(busy)}>
                            <Send size={14} />
                            Email
                          </button>
                        )}
                        {invoice.customer_phone && (
                          <button onClick={() => share(invoice, 'sms')} disabled={Boolean(busy)}>
                            <Send size={14} />
                            SMS
                          </button>
                        )}
                        <button onClick={() => share(invoice, 'whatsapp')} disabled={Boolean(busy)}>
                          <MessageCircle size={14} />
                          WhatsApp
                        </button>
                        <button className={styles.cancel} onClick={() => cancel(invoice)} disabled={invoice.status === 'cancelled'}>
                          გაუქმება
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!invoices.length && <div className={styles.emptyRow}>ინვოისი ჯერ არ არის.</div>}
          </div>
        </section>
      </div>
    </main>
  )
}
