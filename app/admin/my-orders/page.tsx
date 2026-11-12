'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'

const STATUSES = ['new', 'processing', 'ordered', 'received', 'delivered', 'cancelled'] as const
type InternalOrderStatus = (typeof STATUSES)[number]

const STATUS_LABELS: Record<InternalOrderStatus, string> = {
  new: 'ახალი',
  processing: 'მუშავდება',
  ordered: 'შეკვეთილია',
  received: 'მიღებულია',
  delivered: 'გაცემულია',
  cancelled: 'გაუქმებულია',
}

type InternalCustomer = {
  id: string
  phone_normalized: string
  phone_display: string | null
  full_name: string
  clinic_name: string | null
  city: string | null
}

type InternalOrder = {
  id: string
  created_at: string
  order_number: string
  customer_id: string
  status: InternalOrderStatus
  product_text: string
  quantity_text: string | null
  supplier_text: string | null
  expected_date: string | null
  paid_amount: number | null
  sale_amount: number | null
  notes: string | null
  created_by_name: string | null
  customer?: InternalCustomer | null
}

type FormState = {
  orderText: string
}

const emptyForm: FormState = {
  orderText: '',
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('995') && digits.length === 12) return digits
  if (digits.startsWith('5') && digits.length === 9) return `995${digits}`
  return ''
}

function extractPhoneFromText(value: string) {
  const compact = value.replace(/[^\d+]/g, '')
  const normalizedCompact = normalizePhone(compact)
  if (normalizedCompact) return { normalized: normalizedCompact, display: compact }

  const match = value.match(/(?:\+?995[\s-]?)?5\d(?:[\s-]?\d){7}/)
  const display = match?.[0]?.trim() || ''
  const normalized = normalizePhone(display)
  return normalized ? { normalized, display } : null
}

function extractCustomerName(value: string, phoneDisplay?: string) {
  const phoneDigits = (phoneDisplay || '').replace(/\D/g, '')
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const line = lines.find((item) => {
    const digits = item.replace(/\D/g, '')
    if (phoneDigits && digits.includes(phoneDigits)) return false
    return /[A-Za-zა-ჰ]/.test(item)
  })

  return (line || 'უცნობი კლიენტი').replace(/^(სახელი|კლიენტი|customer|name)\s*[:：-]\s*/i, '').slice(0, 160)
}

function orderNumber() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `MY-${yyyy}${mm}${dd}-${String(Date.now()).slice(-6)}`
}

function money(value?: number | null) {
  if (value === null || value === undefined) return '-'
  return `${Number(value).toLocaleString('ka-GE', { maximumFractionDigits: 2 })} GEL`
}

function amountOrNull(value: string) {
  const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('ka-GE')
}

function inputStyle() {
  return {
    width: '100%',
    minHeight: 42,
    border: '1px solid rgba(15,23,42,0.16)',
    borderRadius: 10,
    padding: '9px 11px',
    font: 'inherit',
    fontSize: 13,
    boxSizing: 'border-box' as const,
    background: '#fff',
  }
}

function labelStyle() {
  return {
    display: 'grid',
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
  }
}

export default function MyOrdersPage() {
  const { loading, error, profile } = useWarrantyAdminGate()
  const [orders, setOrders] = useState<InternalOrder[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  async function loadOrders() {
    setLoadError('')
    const { data, error: dbError } = await supabase
      .from('internal_orders')
      .select('*, customer:internal_order_customers(*)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (dbError) {
      setLoadError(dbError.message)
      setOrders([])
      return
    }

    setOrders((data || []) as InternalOrder[])
  }

  useEffect(() => {
    if (!profile) return
    void loadOrders()

    const channel = supabase
      .channel('internal-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_orders' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_order_customers' }, () => void loadOrders())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((order) => {
      const haystack = [
        order.order_number,
        order.product_text,
        order.quantity_text,
        order.supplier_text,
        order.notes,
        order.customer?.full_name,
        order.customer?.clinic_name,
        order.customer?.phone_display,
        order.customer?.phone_normalized,
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [orders, search])

  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setLoadError('')

    const orderText = form.orderText.trim()
    const phoneInfo = extractPhoneFromText(orderText)
    const fullName = extractCustomerName(orderText, phoneInfo?.display)

    if (!orderText) {
      setLoadError('შეკვეთის ტექსტი ჩაწერე ან ჩააკოპირე.')
      return
    }

    if (!phoneInfo) {
      setLoadError('ტექსტში ტელეფონის ნომერი ვერ ვიპოვე. ჩაწერე 5XX XX XX XX ფორმატითაც.')
      return
    }

    setSaving(true)
    try {
      const { data: customer, error: customerError } = await supabase
        .from('internal_order_customers')
        .upsert({
          phone_normalized: phoneInfo.normalized,
          phone_display: phoneInfo.display,
          full_name: fullName,
          clinic_name: null,
          city: null,
          source: 'manual_entry',
        }, { onConflict: 'phone_normalized' })
        .select('id')
        .single()

      if (customerError || !customer?.id) throw new Error(customerError?.message || 'კლიენტის შენახვა ვერ მოხერხდა.')

      const { error: orderError } = await supabase
        .from('internal_orders')
        .insert({
          order_number: orderNumber(),
          customer_id: customer.id,
          status: 'new',
          product_text: orderText,
          quantity_text: null,
          supplier_text: null,
          expected_date: null,
          paid_amount: null,
          sale_amount: null,
          notes: null,
          created_by_name: profile?.full_name || profile?.clinic_name || null,
        })

      if (orderError) throw orderError

      setForm(emptyForm)
      setNotice('შეკვეთა ჩაიწერა. იგივე ტელეფონზე კლიენტი მეორედ არ დაემატება.')
      await loadOrders()
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'შეკვეთის შენახვა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(order: InternalOrder, status: InternalOrderStatus) {
    setBusyId(order.id)
    setLoadError('')
    try {
      const { error: updateError } = await supabase
        .from('internal_orders')
        .update({ status })
        .eq('id', order.id)

      if (updateError) throw updateError
      await loadOrders()
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'სტატუსი ვერ შეიცვალა.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingView label="შიდა შეკვეთები იტვირთება..." />
  if (error || !profile) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  const uniquePhones = new Set(orders.map((order) => order.customer?.phone_normalized).filter(Boolean)).size

  return (
    <main style={{ minHeight: '100vh', background: '#f6f7f4', color: '#172033', padding: 18 }}>
      <section style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#0f766e', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>Internal orders</p>
            <h1 style={{ margin: '6px 0 4px', fontSize: 32 }}>ჩემი შეკვეთები</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>აქ ჩაწერ მოსულ შეკვეთას და ცალკე ბაზაში ავტომატურად შეინახება.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/admin" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 800, border: '1px solid #99f6e4', borderRadius: 10, padding: '10px 12px', background: '#fff' }}>Admin</Link>
            <button type="button" onClick={() => void loadOrders()} style={{ color: '#fff', background: '#0f766e', border: 0, borderRadius: 10, padding: '10px 12px', fontWeight: 800, cursor: 'pointer' }}>განახლება</button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 14 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>სულ შეკვეთები</span>
            <strong style={{ display: 'block', marginTop: 4, fontSize: 28 }}>{orders.length}</strong>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 14 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>ახალი</span>
            <strong style={{ display: 'block', marginTop: 4, fontSize: 28 }}>{orders.filter((order) => order.status === 'new').length}</strong>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 14 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>უნიკალური ნომრები</span>
            <strong style={{ display: 'block', marginTop: 4, fontSize: 28 }}>{uniquePhones}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 520px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <form onSubmit={saveOrder} style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: 16, display: 'grid', gap: 12 }}>
            <label style={labelStyle()}>
              შეკვეთის ტექსტი
              <textarea
                value={form.orderText}
                onChange={(event) => setForm({ orderText: event.target.value })}
                style={{ ...inputStyle(), minHeight: 260, resize: 'vertical', fontSize: 15, lineHeight: 1.55 }}
                required
                placeholder={'მაგალითად:\nნინო ბერიძე\n599 12 34 56\nუნდა 2 ცალი Airpex, თეთრი ფერი\nმისამართი: თბილისი, ...'}
              />
            </label>
            <p style={{ margin: 0, color: '#64748b', fontSize: 12, lineHeight: 1.55 }}>
              ნომერს თვითონ ამოიღებს ტექსტიდან. იგივე ნომერზე კლიენტი მეორედ არ დაემატება, უბრალოდ ახალი ჩანაწერი მიებმება.
            </p>

            {loadError ? <p style={{ margin: 0, background: '#fff1f2', color: '#be123c', borderRadius: 10, padding: 10, fontSize: 13 }}>{loadError}</p> : null}
            {notice ? <p style={{ margin: 0, background: '#ecfdf5', color: '#047857', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700 }}>{notice}</p> : null}

            <button disabled={saving} type="submit" style={{ border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', minHeight: 46, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'ინახება...' : 'შეკვეთის შენახვა'}
            </button>
          </form>

          <section style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: 14, borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>ბოლო ჩანაწერები</h2>
              <input value={search} onChange={(event) => setSearch(event.target.value)} style={{ ...inputStyle(), width: 260 }} placeholder="ძებნა..." />
            </div>

            <div style={{ display: 'grid' }}>
              {visibleOrders.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>შეკვეთები ჯერ არ არის.</div>
              ) : visibleOrders.map((order) => {
                const phone = order.customer?.phone_display || order.customer?.phone_normalized || ''
                return (
                  <article key={order.id} style={{ padding: 14, borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px 150px', gap: 14, alignItems: 'start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{order.customer?.full_name || 'კლიენტი'}</strong>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{order.order_number}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{phone} · {order.customer?.clinic_name || 'კლინიკა არ არის'} · {order.customer?.city || '-'}</p>
                      <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{order.product_text}</p>
                      <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>
                        {order.quantity_text || 'რაოდენობა -'} · {order.supplier_text || 'მომწოდებელი -'} · მოსვლა: {order.expected_date || '-'}
                      </p>
                      {order.notes ? <p style={{ margin: '8px 0 0', color: '#334155', fontSize: 12, whiteSpace: 'pre-wrap' }}>{order.notes}</p> : null}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12, display: 'grid', gap: 5 }}>
                      <span>შექმნა: {dateTime(order.created_at)}</span>
                      <span>თვითღ.: {money(order.paid_amount)}</span>
                      <span>გაყიდვა: {money(order.sale_amount)}</span>
                      <span>{order.created_by_name || ''}</span>
                    </div>
                    <select value={order.status} disabled={busyId === order.id} onChange={(event) => void updateStatus(order, event.target.value as InternalOrderStatus)} style={inputStyle()}>
                      {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
