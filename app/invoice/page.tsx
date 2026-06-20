'use client'

import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Mail, MessageCircle, Plus, Printer, RefreshCw, Search, Smartphone, Trash2 } from 'lucide-react'
import { supabase, supabaseConfigError } from '@/app/lib/supabase'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  buildInvoiceShareText,
  buildNextInvoiceNumber,
  buildWhatsappInvoiceUrl,
  calcInvoiceTotals,
  createEmptyInvoiceForm,
  formatMoney,
  type InvoiceClient,
  type InvoiceFormValues,
  type InvoiceItem,
  type InvoicePaymentSplit,
  type InvoiceProduct,
  type InvoiceRecord,
  type InvoiceStatus,
} from '@/app/lib/invoice'

const colors = {
  bg: '#f6f8fb',
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  blue: '#2563eb',
  green: '#085041',
}

const DEFAULT_INVOICE_LOGO = '/images/invoice-logo.png'

const BANK_OPTIONS = [
  {
    label: 'TBC Bank',
    value: 'TBC Bank',
    details: 'TBC Bank · GE00TB0000000000000000',
  },
  {
    label: 'Bank of Georgia',
    value: 'Bank of Georgia',
    details: 'Bank of Georgia · GE50BG0000000103262327 GEL',
  },
  {
    label: 'BasisBank',
    value: 'BasisBank',
    details: 'BasisBank · GE00BB0000000000000000',
  },
  {
    label: 'Liberty Bank',
    value: 'Liberty Bank',
    details: 'Liberty Bank · GE00LB0000000000000000',
  },
  {
    label: 'ProCredit Bank',
    value: 'ProCredit Bank',
    details: 'ProCredit Bank · GE39PC0833600100001872',
  },
]

function splitScheduleText(splits: InvoicePaymentSplit[], total: number, currency: string) {
  const clean = splits
    .map((split) => ({ label: split.label.trim(), percent: Number(split.percent || 0) }))
    .filter((split) => split.label && split.percent > 0)
  if (!clean.length) return ''
  return [
    'გადახდის გრაფიკი:',
    ...clean.map((split) => `${split.label}: ${split.percent}% - ${formatMoney(total * split.percent / 100, currency)}`),
  ].join('\n')
}

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: '100%',
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: '10px 11px',
    fontSize: 14,
    color: colors.ink,
    background: '#fff',
    boxSizing: 'border-box',
    ...extra,
  }
}

function labelStyle(): React.CSSProperties {
  return { display: 'block', fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 6 }
}

function statusBadge(status: InvoiceStatus) {
  const tone = INVOICE_STATUS_TONES[status] || INVOICE_STATUS_TONES.draft
  return (
    <span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 12, fontWeight: 800 }}>
      {INVOICE_STATUS_LABELS[status] || status}
    </span>
  )
}

function createLocalId(offset = 0) {
  return Date.now() + offset
}

export default function InvoicePage() {
  const [clients, setClients] = useState<InvoiceClient[]>([])
  const [products, setProducts] = useState<InvoiceProduct[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [selected, setSelected] = useState<InvoiceRecord | null>(null)
  const [mode, setMode] = useState<'list' | 'form' | 'preview' | 'settings'>('list')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)
  const [lookingUpTin, setLookingUpTin] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<InvoiceFormValues>(() => createEmptyInvoiceForm('INV-2026-0001'))
  const [company, setCompany] = useState({
    name: 'Medical Line Georgia',
    id: '',
    email: 'ltdmedicalline@gmail.com',
    phone: '+995 514 01 11 16',
    address: 'დავით ჯაბიძის #8, თბილისი, საქართველო',
    bank: 'TBC Bank / Bank of Georgia',
    director: 'შ. სეფიშვილი',
    directorTitle: 'დირექტორი',
    sealImg: '/images/invoice-stamp.jpg',
    logoImg: DEFAULT_INVOICE_LOGO,
    rsUser: '',
    rsPass: '',
    rsSenderTin: '',
  })

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth < 900)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      if (supabaseConfigError) throw new Error(supabaseConfigError)
      const [clientsRes, productsRes, invoicesRes] = await Promise.all([
        supabase.from('inv_clients').select('*').order('name', { ascending: true }),
        supabase.from('inv_products').select('*').order('name', { ascending: true }),
        supabase.from('inv_invoices').select('*').order('created_at', { ascending: false }),
      ])
      if (clientsRes.error) throw clientsRes.error
      if (productsRes.error) throw productsRes.error
      if (invoicesRes.error) throw invoicesRes.error
      const nextInvoices = (invoicesRes.data || []) as InvoiceRecord[]
      setClients((clientsRes.data || []) as InvoiceClient[])
      setProducts((productsRes.data || []) as InvoiceProduct[])
      setInvoices(nextInvoices)
      setForm(createEmptyInvoiceForm(buildNextInvoiceNumber(nextInvoices)))

      const { data: settingsRow } = await supabase.from('inv_settings').select('data').eq('id', 1).maybeSingle()
      const settings = (settingsRow?.data || {}) as Record<string, string>
      setCompany((prev) => ({
        ...prev,
        name: settings.company || prev.name,
        id: settings.compId || settings.idNum || prev.id,
        email: settings.email || prev.email,
        phone: settings.phone || prev.phone,
        address: settings.address || prev.address,
        bank: settings.bank || prev.bank,
        director: settings.director || prev.director,
        directorTitle: settings.directorTitle || prev.directorTitle,
        sealImg: settings.sealImg || prev.sealImg,
        logoImg: settings.logoImg || prev.logoImg,
        rsUser: settings.rsUser || prev.rsUser,
        rsPass: settings.rsPass || prev.rsPass,
        rsSenderTin: settings.rsSenderTin || prev.rsSenderTin,
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ინვოისების ჩატვირთვა ვერ მოხერხდა.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (status && invoice.status !== status) return false
      const client = clients.find((c) => c.id === invoice.client_id)
      if (!q) return true
      return [invoice.number, client?.name, client?.company, invoice.total, invoice.date].some((value) =>
        String(value || '').toLowerCase().includes(q),
      )
    })
  }, [clients, invoices, search, status])

  const stats = useMemo(() => ({
    total: invoices.length,
    unpaid: invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').length,
    paidAmount: invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.total || 0), 0),
    totalAmount: invoices.reduce((sum, i) => sum + Number(i.total || 0), 0),
    byCurrency: ['GEL', 'USD', 'EUR'].map((currency) => ({
      currency,
      total: invoices.filter((i) => i.currency === currency).reduce((sum, i) => sum + Number(i.total || 0), 0),
      paid: invoices.filter((i) => i.currency === currency && i.status === 'paid').reduce((sum, i) => sum + Number(i.total || 0), 0),
    })),
  }), [invoices])

  const totals = useMemo(
    () => calcInvoiceTotals(form.items, Number(form.vatRate || 0), Number(form.discount || 0)),
    [form.items, form.vatRate, form.discount],
  )

  function resetForm() {
    setSelected(null)
    setForm(createEmptyInvoiceForm(buildNextInvoiceNumber(invoices)))
    setMode('form')
  }

  function refreshInvoiceNumber() {
    setForm((prev) => ({ ...prev, number: buildNextInvoiceNumber(invoices) }))
  }

  function editInvoice(invoice: InvoiceRecord) {
    const client = clients.find((c) => c.id === invoice.client_id)
    setSelected(invoice)
    setForm({
      number: invoice.number,
      clientId: invoice.client_id ? String(invoice.client_id) : '',
      clientName: client?.name || '',
      clientCompany: client?.company || '',
      clientIdNum: client?.id_num || '',
      clientPhone: client?.phone || '',
      clientEmail: client?.email || '',
      clientAddress: client?.address || '',
      date: invoice.date || '',
      due: invoice.due || '',
      status: invoice.status || 'draft',
      currency: invoice.currency || 'GEL',
      vatRate: String(invoice.vat_rate ?? 18),
      discount: String(invoice.discount ?? 0),
      terms: invoice.terms || '',
      note: invoice.note || '',
      bank: invoice.bank || '',
      paymentSplits: invoice.payment_splits?.length
        ? invoice.payment_splits
        : [
          { label: 'წინასწარ', percent: 70 },
          { label: 'მიწოდების შემდეგ', percent: 30 },
        ],
      items: invoice.items?.length ? invoice.items : [{ name: '', quantity: 1, unit: 'ცალი', unitPrice: 0 }],
    })
    setMode('form')
  }

  function setItem(index: number, patch: Partial<InvoiceItem>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  function setPaymentSplit(index: number, patch: Partial<InvoicePaymentSplit>) {
    setForm((prev) => ({
      ...prev,
      paymentSplits: prev.paymentSplits.map((split, i) => (i === index ? { ...split, ...patch } : split)),
    }))
  }

  function autofillProduct(index: number, name: string) {
    const product = products.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
    if (!product) return
    setItem(index, {
      name: product.name,
      description: product.description || '',
      unit: product.unit || 'ცალი',
      unitPrice: Number(product.price || 0),
    })
    if (product.currency && product.currency !== form.currency) {
      setForm((prev) => ({ ...prev, currency: product.currency }))
    }
  }

  async function lookupClientByTin() {
    const tin = form.clientIdNum.trim()
    if (!tin) {
      setError('შეიყვანე საიდენტიფიკაციო კოდი.')
      return
    }
    if (!company.rsUser.trim() || !company.rsPass) {
      setError('ჯერ შეინახე Rs.ge მომხმარებელი და პაროლი კომპანიის მონაცემებში.')
      setMode('settings')
      return
    }

    setLookingUpTin(true)
    setError('')
    try {
      const res = await fetch('/api/rsge-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin,
          username: company.rsUser.trim(),
          password: company.rsPass,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Rs.ge ძებნა ვერ მოხერხდა.')

      const result = (payload.result || {}) as { name?: string; address?: string; owner?: string }
      setForm((prev) => ({
        ...prev,
        clientName: result.name || prev.clientName,
        clientAddress: result.address || prev.clientAddress,
        note: result.owner && !prev.note.includes(result.owner)
          ? [prev.note.trim(), `მფლობელი/დირექტორი: ${result.owner}`].filter(Boolean).join('\n')
          : prev.note,
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Rs.ge ძებნა ვერ მოხერხდა.')
    } finally {
      setLookingUpTin(false)
    }
  }

  function selectClient(id: string) {
    const client = clients.find((c) => String(c.id) === id)
    setForm((prev) => ({
      ...prev,
      clientId: id,
      clientName: client?.name || prev.clientName,
      clientCompany: client?.company || prev.clientCompany,
      clientIdNum: client?.id_num || prev.clientIdNum,
      clientPhone: client?.phone || prev.clientPhone,
      clientEmail: client?.email || prev.clientEmail,
      clientAddress: client?.address || prev.clientAddress,
    }))
  }

  async function ensureClient() {
    if (form.clientId) return Number(form.clientId)
    if (!form.clientName.trim()) return null
    const payload = {
      id: createLocalId(),
      name: form.clientName.trim(),
      company: form.clientCompany.trim() || null,
      id_num: form.clientIdNum.trim() || null,
      phone: form.clientPhone.trim() || null,
      email: form.clientEmail.trim() || null,
      address: form.clientAddress.trim() || null,
    }
    const { data, error: clientError } = await supabase.from('inv_clients').insert(payload).select('*').single()
    if (clientError) throw clientError
    const created = data as InvoiceClient
    setClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'ka')))
    return created.id
  }

  async function rememberProducts(items: InvoiceItem[]) {
    const existingNames = new Set(products.map((product) => product.name.trim().toLowerCase()))
    const toInsert = items
      .filter((item) => item.name.trim() && !existingNames.has(item.name.trim().toLowerCase()))
      .map((item, index) => ({
        id: createLocalId(index + 1),
        name: item.name.trim(),
        category: 'ინვოისიდან დამატებული',
        price: Number(item.unitPrice || 0),
        currency: form.currency || 'GEL',
        unit: item.unit || 'ცალი',
        description: item.description?.trim() || null,
        vat_included: true,
      }))

    if (!toInsert.length) return

    const { data, error: productError } = await supabase.from('inv_products').insert(toInsert).select('*')
    if (productError) throw productError
    if (data?.length) {
      setProducts((prev) => [...prev, ...(data as InvoiceProduct[])].sort((a, b) => a.name.localeCompare(b.name, 'ka')))
    }
  }

  async function saveInvoice() {
    const cleanItems = form.items
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
      .filter((item) => item.name && item.quantity > 0)

      if (!form.number.trim() || !form.clientName.trim() || cleanItems.length === 0) {
      setError('შეავსე ნომერი, კლიენტი და მინიმუმ ერთი პროდუქტი/სერვისი.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const clientId = await ensureClient()
      await rememberProducts(cleanItems)
      const currentTotals = calcInvoiceTotals(cleanItems, Number(form.vatRate || 0), Number(form.discount || 0))
      const scheduleText = splitScheduleText(form.paymentSplits, currentTotals.total, form.currency)
      const termsWithSchedule = [form.terms.trim(), scheduleText].filter(Boolean).join('\n\n')
      const payload = {
        number: form.number.trim(),
        status: form.status,
        client_id: clientId,
        date: form.date || null,
        due: form.due || null,
        currency: form.currency || 'GEL',
        terms: termsWithSchedule || null,
        vat_rate: Number(form.vatRate || 0),
        discount: Number(form.discount || 0),
        note: form.note.trim() || null,
        bank: form.bank.trim() || null,
        items: cleanItems,
        subtotal: currentTotals.subtotal,
        discount_amount: currentTotals.discountAmount,
        vat_amount: currentTotals.vatAmount,
        total: currentTotals.total,
        color: colors.blue,
      }

      let data: InvoiceRecord | null = null
      let invoiceError: { message: string } | null = null

      if (selected) {
        const result = await supabase
          .from('inv_invoices')
          .upsert({ id: selected.id, ...payload }, { onConflict: 'id' })
          .select('*')
          .single()
        data = result.data as InvoiceRecord | null
        invoiceError = result.error
      } else {
        const result = await supabase
          .from('inv_invoices')
          .insert({ id: createLocalId(), ...payload })
          .select('*')
          .single()
        data = result.data as InvoiceRecord | null
        invoiceError = result.error
      }
      if (invoiceError) throw invoiceError
      const saved = data as InvoiceRecord
      const savedWithClientSchedule = { ...saved, terms: termsWithSchedule } as InvoiceRecord
      setInvoices((prev) => [savedWithClientSchedule, ...prev.filter((invoice) => invoice.id !== saved.id)])
      setSelected(savedWithClientSchedule)
      setMode('preview')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ინვოისის შენახვა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(invoice: InvoiceRecord, nextStatus: InvoiceStatus) {
    const { data, error: statusError } = await supabase
      .from('inv_invoices')
      .update({ status: nextStatus })
      .eq('id', invoice.id)
      .select('*')
      .single()
    if (statusError) {
      setError(statusError.message)
      return
    }
    setInvoices((prev) => prev.map((item) => (item.id === invoice.id ? data as InvoiceRecord : item)))
    if (selected?.id === invoice.id) setSelected(data as InvoiceRecord)
  }

  async function saveCompanySettings() {
    setSaving(true)
    setError('')
    try {
      const data = {
        company: company.name,
        compId: company.id,
        email: company.email,
        phone: company.phone,
        address: company.address,
        bank: company.bank,
        director: company.director,
        directorTitle: company.directorTitle,
        sealImg: company.sealImg,
        logoImg: company.logoImg,
        rsUser: company.rsUser,
        rsPass: company.rsPass,
        rsSenderTin: company.rsSenderTin,
      }
      const { error: settingsError } = await supabase
        .from('inv_settings')
        .upsert({ id: 1, data }, { onConflict: 'id' })
      if (settingsError) throw settingsError
      setMode('list')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'კომპანიის მონაცემების შენახვა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  async function removeInvoice(invoice: InvoiceRecord) {
    if (!confirm(`წავშალო ${invoice.number}?`)) return
    const { error: deleteError } = await supabase.from('inv_invoices').delete().eq('id', invoice.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setInvoices((prev) => prev.filter((item) => item.id !== invoice.id))
    if (selected?.id === invoice.id) setSelected(null)
  }

  const previewClient = selected ? clients.find((c) => c.id === selected.client_id) : null

  function clientForInvoice(invoice: InvoiceRecord) {
    return clients.find((c) => c.id === invoice.client_id) || null
  }

  function invoiceShareText(invoice: InvoiceRecord) {
    return buildInvoiceShareText(invoice, clientForInvoice(invoice), company)
  }

  async function generatePdfBlob(invoice: InvoiceRecord): Promise<Blob | null> {
    const el = document.getElementById('invoice-print-area')
    if (!el) return null
    setGeneratingPdf(true)
    try {
      const noPrintEls = el.querySelectorAll('.no-print') as NodeListOf<HTMLElement>
      const previousDisplay = Array.from(noPrintEls).map((item) => item.style.display)
      noPrintEls.forEach((item) => { item.style.display = 'none' })

      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })

      noPrintEls.forEach((item, index) => { item.style.display = previousDisplay[index] || '' })

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const imgData = canvas.toDataURL('image/png')
      const imgH = (canvas.height * pageW) / canvas.width
      let position = 0
      let heightLeft = imgH
      pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH)
      heightLeft -= pageH
      while (heightLeft > 0) {
        position = heightLeft - imgH
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH)
        heightLeft -= pageH
      }
      return pdf.output('blob')
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function downloadPdf(invoice: InvoiceRecord) {
    const blob = await generatePdfBlob(invoice)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function shareByEmail(invoice: InvoiceRecord) {
    const blob = await generatePdfBlob(invoice)
    if (!blob) return
    const file = new File([blob], `${invoice.number}.pdf`, { type: 'application/pdf' })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `ინვოისი ${invoice.number}`, text: `${company.name} · ${formatMoney(invoice.total, invoice.currency)}` })
        return
      } catch {
        // User cancelled native share sheet.
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.number}.pdf`
    a.click()
    URL.revokeObjectURL(url)

    const subject = encodeURIComponent(`ინვოისი ${invoice.number} — ${company.name}`)
    const body = encodeURIComponent(`გამარჯობა,\n\nPDF ფაილი ჩამოიტვირთა. გთხოვთ, მიამაგროთ ეს ფაილი წერილს და იხილოთ ინვოისი ${invoice.number}.\n\nჯამი: ${formatMoney(invoice.total, invoice.currency)}\n\n${company.name}\n${company.phone}`)
    setTimeout(() => {
      window.location.href = `mailto:${previewClient?.email || ''}?subject=${subject}&body=${body}`
    }, 300)
  }

  function shareByWhatsapp(invoice: InvoiceRecord) {
    const client = clientForInvoice(invoice)
    window.open(buildWhatsappInvoiceUrl(client?.phone, invoiceShareText(invoice)), '_blank', 'noopener,noreferrer')
  }

  async function sendInvoiceSms(invoice: InvoiceRecord) {
    setSendingSms(true)
    setError('')
    try {
      const response = await fetch(`/api/invoice/${invoice.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'sms' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'SMS ვერ გაიგზავნა.')
      if (!payload.smsSent && payload.smsText) {
        await navigator.clipboard?.writeText(payload.smsText).catch(() => undefined)
        alert('SMS პროვაიდერი ჯერ არ არის ჩართული. ტექსტი დაკოპირდა და შეგიძლია ხელით გააგზავნო.')
        return
      }
      alert('SMS გაიგზავნა.')
      await changeStatus(invoice, invoice.status === 'draft' ? 'sent' : invoice.status)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SMS ვერ გაიგზავნა.')
    } finally {
      setSendingSms(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: colors.bg, color: colors.ink, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${colors.border}`, padding: isMobile ? '14px 14px 12px' : '18px 22px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: colors.blue, letterSpacing: 0.5 }}>MEDICAL LINE GEORGIA</p>
            <h1 style={{ margin: '4px 0 0', fontSize: isMobile ? 20 : 24, fontWeight: 900 }}>ინვოისები</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: isMobile ? '100%' : undefined }}>
            <Link href="/" style={{ ...button('secondary') }}>საიტი</Link>
            <a href="/invoice.html" style={{ ...button('secondary') }}>ძველი ვერსია</a>
            <button type="button" onClick={() => setMode('settings')} style={button('secondary')}>კომპანიის მონაცემები</button>
            <button type="button" onClick={loadAll} style={button('secondary')}><RefreshCw size={16} /> განახლება</button>
            <button type="button" onClick={resetForm} style={button('primary')}><Plus size={16} /> ახალი ინვოისი</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: isMobile ? 12 : 22, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: 18 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, order: isMobile ? 2 : 1 }}>
          <Stat value={stats.total} label="ინვოისი ბაზაში" />
          <Stat value={stats.unpaid} label="გადასახდელი/გაგზავნილი" />
          <div style={panel()}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900 }}>ჯამები ვალუტებით</p>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {stats.byCurrency.map((item) => (
                <div key={item.currency} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                  <span style={{ color: colors.muted }}>{item.currency}</span>
                  <strong>{formatMoney(item.total, item.currency)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={panel()}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900 }}>გადახდილი ვალუტებით</p>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {stats.byCurrency.map((item) => (
                <div key={item.currency} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                  <span style={{ color: colors.muted }}>{item.currency}</span>
                  <strong>{formatMoney(item.paid, item.currency)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={panel()}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900 }}>PDF და გაგზავნა</p>
            <p style={{ margin: '7px 0 12px', color: colors.muted, fontSize: 12, lineHeight: 1.45 }}>
              გახსენი ინვოისი ღილაკით „ნახვა“ და იქვე დაგხვდება PDF, მეილი, SMS, WhatsApp, ბეჭდვა და კომპანიის მონაცემები.
            </p>
            <button type="button" onClick={() => setMode('settings')} style={button('secondary')}>მონაცემების შეცვლა</button>
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, order: isMobile ? 1 : 2 }}>
          {error ? <div style={{ ...panel(), borderColor: '#fecdd3', background: '#fff1f2', color: '#9f1239' }}>{error}</div> : null}
          {loading ? <div style={panel()}>იტვირთება...</div> : null}
          {mode === 'list' ? renderList() : mode === 'form' ? renderForm() : mode === 'settings' ? renderSettings() : renderPreview()}
        </section>
      </div>
    </main>
  )

  function renderList() {
    return (
      <>
        <div style={{ ...panel(), display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 180px', gap: 12 }}>
          <label>
            <span style={labelStyle()}>ძებნა</span>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 11, top: 12, color: colors.muted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ნომერი, კლიენტი, თანხა..." style={inputStyle({ paddingLeft: 34 })} />
            </div>
          </label>
          <label>
            <span style={labelStyle()}>სტატუსი</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle()}>
              <option value="">ყველა</option>
              {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>

        <div style={{ ...panel(), padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.4fr 1fr 0.9fr 1.2fr', gap: 12, padding: 14, background: '#f8fafc', color: colors.muted, fontSize: 12, fontWeight: 800 }}>
            <span>ნომერი</span><span>კლიენტი</span><span>თანხა</span><span>სტატუსი</span><span>ქმედებები</span>
          </div>
          {filtered.length ? filtered.map((invoice) => {
            const client = clients.find((c) => c.id === invoice.client_id)
            return (
              <div key={invoice.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.4fr 1fr 0.9fr 1.2fr', gap: 12, padding: 14, borderTop: `1px solid ${colors.border}`, alignItems: 'center' }}>
                <div><strong>{invoice.number}</strong><p style={muted()}>{invoice.date || '—'} · ვადა {invoice.due || '—'}</p></div>
                <div><strong>{client?.name || '—'}</strong><p style={muted()}>{client?.company || client?.id_num || '—'}</p></div>
                <strong>{formatMoney(invoice.total, invoice.currency)}</strong>
                {statusBadge(invoice.status)}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setSelected(invoice); setMode('preview') }} style={button('primary')}>ნახვა/PDF</button>
                  <button type="button" onClick={() => editInvoice(invoice)} style={button('secondary')}>რედაქტირება</button>
                  <button type="button" onClick={() => removeInvoice(invoice)} style={button('danger')}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          }) : <div style={{ padding: 28, textAlign: 'center', color: colors.muted }}>ინვოისი ვერ მოიძებნა.</div>}
        </div>
      </>
    )
  }

  function renderForm() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...panel(), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="ინვოისის ნომერი">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} style={inputStyle()} />
              <button type="button" onClick={refreshInvoiceNumber} style={{ ...button('secondary'), whiteSpace: 'nowrap' }}>
                <RefreshCw size={15} /> ავტო
              </button>
            </div>
          </Field>
          <Field label="თარიღი"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle()} /></Field>
          <Field label="გადახდის ვადა"><input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} style={inputStyle()} /></Field>
          <Field label="სტატუსი">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })} style={inputStyle()}>
              {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ ...panel(), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Field label="არსებული კლიენტი">
            <select value={form.clientId} onChange={(e) => selectClient(e.target.value)} style={inputStyle()}>
              <option value="">ახალი კლიენტი</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ''}</option>)}
            </select>
          </Field>
          <Field label="კლიენტის სახელი *"><input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} style={inputStyle()} /></Field>
          <Field label="კომპანია"><input value={form.clientCompany} onChange={(e) => setForm({ ...form, clientCompany: e.target.value })} style={inputStyle()} /></Field>
          <Field label="ს/კ ან პირადი ნომერი">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input value={form.clientIdNum} onChange={(e) => setForm({ ...form, clientIdNum: e.target.value })} style={inputStyle()} />
              <button type="button" onClick={lookupClientByTin} disabled={lookingUpTin} style={{ ...button('secondary'), whiteSpace: 'nowrap', opacity: lookingUpTin ? 0.7 : 1 }}>
                {lookingUpTin ? 'იძებნება...' : 'Rs.ge'}
              </button>
            </div>
          </Field>
          <Field label="ტელეფონი"><input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} style={inputStyle()} /></Field>
          <Field label="ელფოსტა"><input value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} style={inputStyle()} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="მისამართი"><input value={form.clientAddress} onChange={(e) => setForm({ ...form, clientAddress: e.target.value })} style={inputStyle()} /></Field></div>
        </div>

        <div style={panel()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <strong>პროდუქტები / სერვისები</strong>
              <p style={{ ...muted(), fontSize: 12 }}>ხელით დამატებული პროდუქტი შენახვისას დამახსოვრდება და შემდეგში დასახელებაში გამოჩნდება.</p>
            </div>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { name: '', description: '', quantity: 1, unit: 'ცალი', unitPrice: 0 }] }))} style={button('secondary')}>
              <Plus size={15} /> დამატება
            </button>
          </div>
          <datalist id="invoice-products-list">
            {products.map((product) => (
              <option key={product.id} value={product.name}>
                {[product.description, product.unit, product.price ? formatMoney(product.price, product.currency) : ''].filter(Boolean).join(' · ')}
              </option>
            ))}
          </datalist>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1.2fr 90px 120px 120px 44px', gap: 8, alignItems: 'start' }}>
                <label>
                  <span style={labelStyle()}>პროდუქტი</span>
                  <input
                    list="invoice-products-list"
                    value={item.name}
                    onChange={(e) => setItem(index, { name: e.target.value })}
                    onBlur={(e) => autofillProduct(index, e.target.value)}
                    placeholder="ჩაწერე ახალი ან აირჩიე შენახული"
                    style={inputStyle()}
                  />
                </label>
                <label>
                  <span style={labelStyle()}>მახასიათებლები</span>
                  <input value={item.description || ''} onChange={(e) => setItem(index, { description: e.target.value })} placeholder="მაგ: მოდელი, სერია, ფერი..." style={inputStyle()} />
                </label>
                <label>
                  <span style={labelStyle()}>რაოდ.</span>
                  <input type="number" min={0} value={item.quantity} onChange={(e) => setItem(index, { quantity: Number(e.target.value) })} style={inputStyle()} />
                </label>
                <label>
                  <span style={labelStyle()}>ერთეული</span>
                  <input value={item.unit} onChange={(e) => setItem(index, { unit: e.target.value })} placeholder="ცალი, კომპლ." style={inputStyle()} />
                </label>
                <label>
                  <span style={labelStyle()}>ერთ. ფასი</span>
                  <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) })} style={inputStyle()} />
                </label>
                <button type="button" onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))} style={{ ...button('danger'), marginTop: 22 }}>Ã—</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...panel(), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="ვალუტა"><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle()}><option value="GEL">GEL · ლარი</option><option value="USD">USD · დოლარი</option><option value="EUR">EUR · ევრო</option></select></Field>
          <Field label="დღგ %"><input type="number" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} style={inputStyle()} /></Field>
          <Field label="ფასდაკლება %"><input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} style={inputStyle()} /></Field>
          <div style={{ padding: 12, borderRadius: 12, background: '#eff6ff', color: '#1e40af', fontWeight: 900 }}>სულ: {formatMoney(totals.total, form.currency)}</div>
          <div style={{ gridColumn: '1 / -1' }}><Field label="პირობები"><input value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} style={inputStyle()} /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="ბანკი">
              <select
                value={form.bank}
                onChange={(e) => {
                  const selectedBank = BANK_OPTIONS.find((bank) => bank.value === e.target.value)
                  setForm({ ...form, bank: selectedBank?.details || e.target.value })
                }}
                style={inputStyle()}
              >
                <option value="">აირჩიე ბანკი</option>
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank.value} value={bank.value}>{bank.label}</option>
                ))}
                <option value={form.bank}>ხელით ჩაწერილი</option>
              </select>
            </Field>
            <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="ბანკის სრული რეკვიზიტი" style={{ ...inputStyle(), marginTop: 8 }} />
          </div>
        </div>

        <div style={panel()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <strong>გადახდის განაწილება</strong>
              <p style={{ ...muted(), fontSize: 12 }}>პროცენტები ავტომატურად ითვლება ინვოისის ჯამიდან: {formatMoney(totals.total, form.currency)}</p>
            </div>
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, paymentSplits: [...prev.paymentSplits, { label: 'ეტაპი', percent: 0 }] }))} style={button('secondary')}>
              <Plus size={15} /> ეტაპი
            </button>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {form.paymentSplits.map((split, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 110px 1fr 44px', gap: 8, alignItems: 'center' }}>
                <input value={split.label} onChange={(e) => setPaymentSplit(index, { label: e.target.value })} placeholder="მაგ: წინასწარ" style={inputStyle()} />
                <input type="number" min={0} max={100} value={split.percent} onChange={(e) => setPaymentSplit(index, { percent: Number(e.target.value) })} style={inputStyle()} />
                <strong>{formatMoney(totals.total * Number(split.percent || 0) / 100, form.currency)}</strong>
                <button type="button" onClick={() => setForm((prev) => ({ ...prev, paymentSplits: prev.paymentSplits.filter((_, i) => i !== index) }))} style={button('danger')}>Ã—</button>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', color: form.paymentSplits.reduce((sum, split) => sum + Number(split.percent || 0), 0) === 100 ? colors.green : '#b45309', fontSize: 12, fontWeight: 800 }}>
            პროცენტების ჯამი: {form.paymentSplits.reduce((sum, split) => sum + Number(split.percent || 0), 0)}%
          </p>
        </div>

        <div style={{ ...panel(), display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}><Field label="შენიშვნა"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={inputStyle({ minHeight: 76, resize: 'vertical' })} /></Field></div>
        </div>

        <div style={{ ...panel(), display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setMode('list')} style={button('secondary')}>უკან</button>
          <button type="button" onClick={saveInvoice} disabled={saving} style={{ ...button('primary'), opacity: saving ? 0.7 : 1 }}>{saving ? 'ინახება...' : 'შენახვა ბაზაში'}</button>
        </div>
      </div>
    )
  }

  function renderSettings() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={panel()}>
          <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>კომპანიის მონაცემები</h2>
          <p style={{ margin: '0 0 18px', color: colors.muted, fontSize: 13 }}>
            ეს ინფორმაცია გამოჩნდება ინვოისის PDF-ში, preview-ში და ბეჭდვის ვერსიაში.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Field label="კომპანიის სახელი"><input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} style={inputStyle()} /></Field>
            <Field label="საიდენტიფიკაციო კოდი"><input value={company.id} onChange={(e) => setCompany({ ...company, id: e.target.value })} style={inputStyle()} /></Field>
            <Field label="ელფოსტა"><input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} style={inputStyle()} /></Field>
            <Field label="ტელეფონი"><input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} style={inputStyle()} /></Field>
            <div style={{ gridColumn: '1 / -1' }}><Field label="მისამართი"><input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} style={inputStyle()} /></Field></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="საბანკო მონაცემები"><input value={company.bank} onChange={(e) => setCompany({ ...company, bank: e.target.value })} style={inputStyle()} /></Field></div>
            <Field label="ხელმომწერის პოზიცია"><input value={company.directorTitle} onChange={(e) => setCompany({ ...company, directorTitle: e.target.value })} style={inputStyle()} /></Field>
            <Field label="ხელმომწერი"><input value={company.director} onChange={(e) => setCompany({ ...company, director: e.target.value })} style={inputStyle()} /></Field>
            <div style={{ gridColumn: '1 / -1' }}><Field label="ლოგოს მისამართი"><input value={company.logoImg} onChange={(e) => setCompany({ ...company, logoImg: e.target.value })} placeholder={DEFAULT_INVOICE_LOGO} style={inputStyle()} /></Field></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="ბეჭდის სურათის მისამართი"><input value={company.sealImg} onChange={(e) => setCompany({ ...company, sealImg: e.target.value })} placeholder="/images/invoice-stamp.jpg" style={inputStyle()} /></Field></div>
            <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 900, color: colors.blue }}>Rs.ge ინტეგრაცია</p>
              <p style={{ margin: '0 0 12px', color: colors.muted, fontSize: 12, lineHeight: 1.55 }}>
                აქ ჩაწერე იგივე Rs.ge service user და password, რაც ძველ `invoice.html`-ში გაქვს. ახალი `/invoice` სწორედ ამ მონაცემებით მოძებნის კომპანიებს.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <Field label="Rs.ge მომხმარებელი (su)"><input value={company.rsUser} onChange={(e) => setCompany({ ...company, rsUser: e.target.value })} placeholder="service_user" style={inputStyle()} /></Field>
                <Field label="Rs.ge პაროლი (sp)"><input type="password" value={company.rsPass} onChange={(e) => setCompany({ ...company, rsPass: e.target.value })} placeholder="••••••••" style={inputStyle()} /></Field>
                <Field label="Rs.ge გამგზავნის ს/კ"><input value={company.rsSenderTin} onChange={(e) => setCompany({ ...company, rsSenderTin: e.target.value })} placeholder="01xxxxxxxx" style={inputStyle()} /></Field>
              </div>
            </div>
          </div>
        </div>
        <div style={{ ...panel(), display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setMode('list')} style={button('secondary')}>უკან</button>
          <button type="button" onClick={saveCompanySettings} disabled={saving} style={{ ...button('primary'), opacity: saving ? 0.7 : 1 }}>
            {saving ? 'ინახება...' : 'კომპანიის მონაცემების შენახვა'}
          </button>
        </div>
      </div>
    )
  }

function renderPreview() {
  if (!selected) return <div style={panel()}>ინვოისი არჩეული არ არის.</div>
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...panel(), display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setMode('list')} style={button('secondary')}>სიაში დაბრუნება</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={selected.status} onChange={(e) => changeStatus(selected, e.target.value as InvoiceStatus)} style={inputStyle({ width: 160 })}>
              {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <button type="button" onClick={() => editInvoice(selected)} style={button('secondary')}>რედაქტირება</button>
            <button type="button" onClick={() => downloadPdf(selected)} disabled={generatingPdf} style={{ ...button('secondary'), opacity: generatingPdf ? 0.7 : 1 }}><Download size={16} /> PDF</button>
            <button type="button" onClick={() => shareByEmail(selected)} disabled={generatingPdf} style={{ ...button('secondary'), opacity: generatingPdf ? 0.7 : 1 }}><Mail size={16} /> მეილი</button>
            <button type="button" onClick={() => sendInvoiceSms(selected)} disabled={sendingSms} style={{ ...button('secondary'), opacity: sendingSms ? 0.7 : 1 }}><Smartphone size={16} /> SMS</button>
            <button type="button" onClick={() => shareByWhatsapp(selected)} style={button('secondary')}><MessageCircle size={16} /> WhatsApp</button>
            <button type="button" onClick={() => window.print()} style={button('primary')}><Printer size={16} /> ბეჭდვა</button>
          </div>
        </div>
        <div id="invoice-print-area" style={{ ...panel(), padding: isMobile ? 18 : 34, background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 22%)', borderColor: '#d6e6fb' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 24, paddingBottom: 24, borderBottom: '1px solid #dbeafe' }}>
            <div style={{ flex: 1 }}>
              {company.logoImg ? <img src={company.logoImg} alt={company.name} style={{ display: 'block', height: 76, width: 'auto', objectFit: 'contain', marginBottom: 16 }} /> : null}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 900, letterSpacing: 0.2 }}>
                INVOICE
              </div>
              <h2 style={{ margin: '16px 0 0', fontSize: 34, color: '#0f172a' }}>{selected.number}</h2>
              <p style={{ margin: '8px 0 0', color: colors.muted, fontSize: 13 }}>ციფრული შეთავაზება და საგადასახადო დეტალები</p>
            </div>
            <div style={{ minWidth: isMobile ? 'auto' : 280, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: 18, textAlign: isMobile ? 'left' : 'right', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }}>
              <strong style={{ fontSize: 18, color: '#1e3a8a' }}>{company.name}</strong>
              {company.id ? <p style={muted()}>ს/კ: {company.id}</p> : null}
              <p style={muted()}>{company.address}</p>
              <p style={muted()}>{company.email}</p>
              <p style={muted()}>{company.phone}</p>
              <p style={{ ...muted(), color: '#1d4ed8', fontWeight: 700 }}>{company.bank}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: 18, marginTop: 24 }}>
            <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: 18, padding: 18 }}>
              <p style={{ ...labelStyle(), marginBottom: 10 }}>კლიენტი</p>
              <strong style={{ fontSize: 18 }}>{previewClient?.name || '—'}</strong>
              <p style={muted()}>{previewClient?.company || ''}</p>
              <p style={muted()}>{previewClient?.id_num || ''}</p>
              <p style={muted()}>{previewClient?.address || ''}</p>
            </div>
            <div style={{ background: '#0f172a', color: '#fff', borderRadius: 18, padding: 18 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#93c5fd', fontWeight: 800 }}>სტატუსი</p>
              <div style={{ marginTop: 10 }}>{statusBadge(selected.status)}</div>
              <p style={{ margin: '18px 0 0', fontSize: 13, color: '#cbd5e1' }}>თარიღი</p>
              <p style={{ margin: '4px 0 0', fontWeight: 800 }}>{selected.date || '—'}</p>
              <p style={{ margin: '14px 0 0', fontSize: 13, color: '#cbd5e1' }}>ვადა</p>
              <p style={{ margin: '4px 0 0', fontWeight: 800 }}>{selected.due || '—'}</p>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, marginTop: 28, fontSize: 14, overflow: 'hidden', border: '1px solid #dbeafe', borderRadius: 18 }}>
            <thead><tr style={{ background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)' }}><th style={th(true)}>დასახელება</th><th style={th(true)}>რაოდ.</th><th style={th(true)}>ფასი</th><th style={th(true)}>ჯამი</th></tr></thead>
            <tbody>
              {(selected.items || []).map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fbff' }}>
                  <td style={td()}>
                    <strong>{item.name}</strong>
                    {item.description ? <p style={{ ...muted(), whiteSpace: 'pre-line' }}>{item.description}</p> : null}
                  </td>
                  <td style={td()}>{item.quantity} {item.unit}</td>
                  <td style={td()}>{formatMoney(item.unitPrice, selected.currency)}</td>
                  <td style={td()}>{formatMoney(item.quantity * item.unitPrice, selected.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
            <div style={{ minWidth: isMobile ? '100%' : 320, display: 'grid', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: 18 }}>
              <TotalLine label="ქვეჯამი" value={formatMoney(selected.subtotal, selected.currency)} />
              <TotalLine label="ფასდაკლება" value={formatMoney(selected.discount_amount, selected.currency)} />
              <TotalLine label={`დღგ ${selected.vat_rate}%`} value={formatMoney(selected.vat_amount, selected.currency)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #93c5fd', paddingTop: 12, fontSize: 22, fontWeight: 900, color: '#1d4ed8' }}><span>სულ</span><span>{formatMoney(selected.total, selected.currency)}</span></div>
            </div>
          </div>
          {selected.terms ? (
            <div style={{ marginTop: 26, color: colors.muted, whiteSpace: 'pre-line', lineHeight: 1.7, background: '#f8fbff', borderLeft: '4px solid #60a5fa', borderRadius: '0 16px 16px 0', padding: '14px 16px' }}>
              პირობები: {selected.terms}
            </div>
          ) : null}
          {selected.bank ? <p style={{ marginTop: 10, color: '#1d4ed8', background: '#eff6ff', borderRadius: 14, padding: '12px 14px' }}>ბანკი: {selected.bank}</p> : null}
          {selected.note ? <p style={{ marginTop: 8, color: colors.muted, background: '#f8fafc', borderRadius: 14, padding: '12px 14px' }}>შენიშვნა: {selected.note}</p> : null}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 220px', gap: 24, marginTop: 36, alignItems: 'end' }}>
            <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: 18, padding: 18 }}>
              <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>გამომწერი კომპანია</p>
              <p style={{ margin: '8px 0 0', fontWeight: 900, fontSize: 18 }}>{company.name}</p>
              <div style={{ marginTop: 30, borderTop: '1px solid #bfdbfe', width: 260, paddingTop: 8, color: colors.muted, fontSize: 12 }}>
                {company.directorTitle}: {company.director}
              </div>
            </div>
            <div style={{ minHeight: 145, border: '1px dashed #93c5fd', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)' }}>
              {company.sealImg ? <img src={company.sealImg} alt="ბეჭედი" style={{ maxWidth: 150, maxHeight: 120, objectFit: 'contain', opacity: 0.88 }} /> : <span style={{ color: colors.muted, fontSize: 12 }}>ბეჭდის ადგილი</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span style={labelStyle()}>{label}</span>{children}</label>
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return <div style={panel()}><p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: colors.green }}>{value}</p><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12, fontWeight: 700 }}>{label}</p></div>
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.muted, fontSize: 14 }}><span>{label}</span><strong style={{ color: '#0f172a' }}>{value}</strong></div>
}

function panel(): React.CSSProperties {
  return { background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 16, boxShadow: '0 12px 34px rgba(15,23,42,0.04)' }
}

function button(kind: 'primary' | 'secondary' | 'danger'): React.CSSProperties {
  const palette = {
    primary: { bg: colors.blue, fg: '#fff', border: colors.blue },
    secondary: { bg: '#fff', fg: colors.ink, border: colors.border },
    danger: { bg: '#fff1f2', fg: '#be123c', border: '#fecdd3' },
  }[kind]
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 13px', borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.bg, color: palette.fg, fontSize: 13, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }
}

function muted(): React.CSSProperties {
  return { margin: '4px 0 0', color: colors.muted, fontSize: 12 }
}

function th(inverted = false): React.CSSProperties {
  return { textAlign: 'left', padding: '14px 16px', color: inverted ? '#fff' : colors.muted, fontSize: 12, borderBottom: inverted ? 'none' : `1px solid ${colors.border}`, fontWeight: 800 }
}

function td(): React.CSSProperties {
  return { padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, verticalAlign: 'top' }
}


