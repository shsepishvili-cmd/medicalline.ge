'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { ORDER_STATUS_LABELS, type OrderPortalRecord, type OrderStatus } from '@/app/lib/order-portal-types'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'
import warrantyStyles from './warranty.module.css'

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ka-GE')
}

function initials(name?: string | null) {
  return (name || 'M').trim().charAt(0).toUpperCase() || 'M'
}

function waPhone(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '')
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function defaultReminderLocal() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

type WarrantyDraft = {
  enabled: boolean
  brand: string
  model: string
  serialNumber: string
  warrantyStart: string
  warrantyMonths: string
}

type OrderUpdate = {
  status?: OrderStatus
  adminNote?: string | null
  reminderAt?: string | null
  createWarranty?: boolean
  warranty?: Omit<WarrantyDraft, 'enabled'>
}

function localDateOnly() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

function emptyWarrantyDraft(): WarrantyDraft {
  return {
    enabled: false,
    brand: '',
    model: '',
    serialNumber: '',
    warrantyStart: localDateOnly(),
    warrantyMonths: '12',
  }
}

function googleDate(value: string, addMinutes = 0) {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() + addMinutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    pad(date.getMinutes()),
    '00',
  ].join('')
}

function googleCalendarUrl(order: OrderPortalRecord, reminderValue?: string) {
  const start = reminderValue || order.reminder_at || defaultReminderLocal()
  const customer = order.customer?.full_name || 'კლიენტი'
  const phone = order.customer?.phone_display || order.customer?.phone_normalized || ''
  const title = `Medical Line შეკვეთა ${order.order_number}`
  const details = [
    `კლიენტი: ${customer}`,
    `ტელეფონი: ${phone || '-'}`,
    `კლინიკა: ${order.customer?.clinic_name || '-'}`,
    '',
    `შეკვეთა:`,
    order.requested_product,
    '',
    order.comment ? `კომენტარი: ${order.comment}` : '',
  ].filter(Boolean).join('\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${googleDate(start)}/${googleDate(start, 30)}`,
    details,
    location: order.delivery_city || order.customer?.city || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default function AdminOrdersPage() {
  const { loading, error, profile, accessToken } = useWarrantyAdminGate()
  const [orders, setOrders] = useState<OrderPortalRecord[]>([])
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [reminderDrafts, setReminderDrafts] = useState<Record<string, string>>({})
  const [warrantyDrafts, setWarrantyDrafts] = useState<Record<string, WarrantyDraft>>({})

  async function loadOrders() {
    setLoadError('')
    const { data, error: dbError } = await supabase
      .from('order_portal_orders')
      .select('*, customer:order_customers(*)')
      .order('created_at', { ascending: false })
      .limit(300)

    if (dbError) {
      setLoadError(dbError.message)
      setOrders([])
      return
    }

    setOrders((data || []) as OrderPortalRecord[])
  }

  useEffect(() => {
    if (!profile) return
    void loadOrders()

    const channel = supabase
      .channel('order-portal-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_portal_orders' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_customers' }, () => void loadOrders())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const haystack = [
        order.order_number,
        order.requested_product,
        order.comment,
        order.customer?.full_name,
        order.customer?.clinic_name,
        order.customer?.phone_normalized,
        order.customer?.phone_display,
      ].join(' ').toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [orders, search, statusFilter])

  function updateWarrantyDraft(orderId: string, patch: Partial<WarrantyDraft>) {
    setWarrantyDrafts((current) => ({
      ...current,
      [orderId]: { ...(current[orderId] || emptyWarrantyDraft()), ...patch },
    }))
  }

  async function updateOrder(order: OrderPortalRecord, updates: OrderUpdate) {
    if (!accessToken) return
    setBusyId(order.id)
    setNotice('')
    try {
      const response = await fetch(`/api/admin/order-portal/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'შეკვეთა ვერ განახლდა.')
      const messages: string[] = []
      if (data.smsSent) messages.push('შეკვეთის სტატუსის SMS გაიგზავნა.')
      if (data.smsError) messages.push(`სტატუსი შეიცვალა, მაგრამ SMS ვერ გაიგზავნა: ${data.smsError}`)
      if (data.warrantyCreated) messages.push('გარანტია ავტომატურად შეიქმნა იმავე CRM კლიენტზე.')
      if (data.warrantyAlreadyExists) messages.push('ამ შეკვეთაზე გარანტია უკვე არსებობს — დუბლიკატი არ შექმნილა.')
      if (data.warrantySmsSent) messages.push('გარანტიის დოკუმენტის ბმული კლიენტს SMS-ით გაეგზავნა.')
      if (data.warrantySmsError) messages.push(`გარანტია შეიქმნა, მაგრამ SMS ვერ გაიგზავნა: ${data.warrantySmsError}`)
      if (messages.length) setNotice(messages.join(' '))
      await loadOrders()
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'შეკვეთა ვერ განახლდა.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingView label="შეკვეთები იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  const uniquePhones = new Set(orders.map((order) => order.customer?.phone_normalized).filter(Boolean)).size

  return (
    <main className="ml-order-page">
      <header className="ml-order-topbar">
        <Link className="ml-order-brand" href="/admin">
          <span className="ml-order-brandmark">M</span>
          <span>
            <strong>MEDICAL LINE</strong>
            <small>ORDERS</small>
          </span>
        </Link>
        <nav className="ml-order-switcher">
          <Link href="/order">შეკვეთა</Link>
          <button className="active" type="button">ადმინისტრაცია</button>
        </nav>
      </header>

      <section className="ml-order-dashboard">
        <div className="ml-order-dash-head">
          <div>
            <span className="ml-order-eyebrow">მართვის პანელი</span>
            <h1>შეკვეთები</h1>
            <p>ყველა ახალი მოთხოვნა ერთ სივრცეში, კლიენტის ნომერი კი ბაზაში ერთხელ რჩება.</p>
          </div>
          <Link className="ml-order-new-order" href="/order" target="_blank">＋ ახალი შეკვეთა</Link>
        </div>

        <div className="ml-order-stats">
          <article><span>სულ შეკვეთები</span><strong>{orders.length}</strong><i className="blue">↗</i></article>
          <article><span>ახალი</span><strong>{orders.filter((o) => o.status === 'new').length}</strong><i className="amber">●</i></article>
          <article><span>უნიკალური ნომერი</span><strong>{uniquePhones}</strong><i className="green">✓</i></article>
        </div>

        <div className="ml-order-toolbar">
          <div className="ml-order-search">⌕ <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ნომერი, კლიენტი ან პროდუქტი..." /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)}>
            <option value="all">ყველა</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {notice ? <p className="ml-order-notice">{notice}</p> : null}
        {loadError ? <p className="ml-order-error">{loadError}</p> : null}

        <div className="ml-order-list">
          {visible.length === 0 ? (
            <div className="ml-order-empty">
              <b>შეკვეთები ჯერ არ არის</b>
              <span>შეავსეთ public ფორმა ან გაუზიარეთ კლიენტს ბმული.</span>
            </div>
          ) : visible.map((order) => {
            const phone = order.customer?.phone_display || order.customer?.phone_normalized || ''
            const warrantyDraft = warrantyDrafts[order.id] || emptyWarrantyDraft()
            const hasWarranty = Boolean(order.warranty_id)
            return (
              <article className="ml-order-row" key={order.id}>
                <div className="ml-order-main">
                  <div className="ml-order-avatar">{initials(order.customer?.full_name)}</div>
                  <div>
                    <div className="ml-order-title">
                      <strong>{order.customer?.full_name || 'კლიენტი'}</strong>
                      <span>{order.order_number}</span>
                    </div>
                    <p>{order.customer?.clinic_name || 'კლინიკა არ არის მითითებული'} · {order.delivery_city || order.customer?.city || '-'}</p>
                    <small>{order.requested_product}</small>
                    {order.comment ? <small className="ml-order-comment">{order.comment}</small> : null}
                  </div>
                </div>

                <div className="ml-order-contact">
                  <a href={`tel:${phone}`}>{phone || '-'}</a>
                  {waPhone(phone) ? <a className="wa" href={`https://wa.me/${waPhone(phone)}`} target="_blank" rel="noreferrer">WhatsApp ↗</a> : null}
                  {order.customer?.erp_party_id ? <Link href={`/admin/crm/customers/${order.customer.erp_party_id}`}>CRM →</Link> : null}
                  <small>{fmtDate(order.created_at)}</small>
                </div>

                <div className="ml-order-status-wrap">
                  <select value={order.status} disabled={busyId === order.id} onChange={(event) => void updateOrder(order, { status: event.target.value as OrderStatus })}>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <div className="ml-order-actions">
                    <button type="button" disabled={busyId === order.id} onClick={() => void updateOrder(order, { status: 'delivered' })}>გაგზავნა</button>
                    <button type="button" disabled={busyId === order.id} onClick={() => void updateOrder(order, { status: 'cancelled' })}>გაუქმება</button>
                  </div>
                  {order.status_sms_sent_at ? <small className="sms-note">✓ SMS {fmtDate(order.status_sms_sent_at)}</small> : null}
                  {order.status_sms_error ? <small className="sms-error">SMS error</small> : null}
                </div>

                <div className={`${warrantyStyles.panel} ${hasWarranty ? warrantyStyles.complete : ''}`}>
                  <label className={warrantyStyles.toggle}>
                    <input
                      type="checkbox"
                      checked={hasWarranty || warrantyDraft.enabled}
                      disabled={hasWarranty || busyId === order.id}
                      onChange={(event) => updateWarrantyDraft(order.id, { enabled: event.target.checked })}
                    />
                    <span>
                      <strong>{hasWarranty ? 'გარანტია შექმნილია' : 'გარანტიის შექმნა'}</strong>
                      <small>{hasWarranty ? 'გარანტია მიბმულია ამავე CRM კლიენტზე' : 'მონიშნე, შეავსე მოწყობილობის მონაცემები და გაუგზავნე დოკუმენტი SMS-ით'}</small>
                    </span>
                  </label>

                  {hasWarranty ? (
                    <div className={warrantyStyles.result}>
                      <Link href={`/admin/warranty/${order.warranty_id}`}>გარანტიის გახსნა →</Link>
                      {order.warranty_sms_sent_at ? <small>✓ SMS {fmtDate(order.warranty_sms_sent_at)}</small> : null}
                      {order.warranty_sms_error ? <small className="sms-error">SMS: {order.warranty_sms_error}</small> : null}
                    </div>
                  ) : warrantyDraft.enabled ? (
                    <div className={warrantyStyles.fields}>
                      <label>ბრენდი *<input value={warrantyDraft.brand} onChange={(event) => updateWarrantyDraft(order.id, { brand: event.target.value })} placeholder="მაგ. Woodpecker" /></label>
                      <label>მოდელი<input value={warrantyDraft.model} onChange={(event) => updateWarrantyDraft(order.id, { model: event.target.value })} placeholder="არასავალდებულო" /></label>
                      <label>სერიული ნომერი *<input value={warrantyDraft.serialNumber} onChange={(event) => updateWarrantyDraft(order.id, { serialNumber: event.target.value })} placeholder="Serial No." /></label>
                      <label>დაწყების თარიღი *<input type="date" value={warrantyDraft.warrantyStart} onChange={(event) => updateWarrantyDraft(order.id, { warrantyStart: event.target.value })} /></label>
                      <label>ვადა (თვე) *<input type="number" min="1" max="120" value={warrantyDraft.warrantyMonths} onChange={(event) => updateWarrantyDraft(order.id, { warrantyMonths: event.target.value })} /></label>
                      <button
                        type="button"
                        disabled={busyId === order.id || !warrantyDraft.brand.trim() || !warrantyDraft.serialNumber.trim() || !warrantyDraft.warrantyStart || !warrantyDraft.warrantyMonths}
                        onClick={() => void updateOrder(order, {
                          createWarranty: true,
                          warranty: {
                            brand: warrantyDraft.brand,
                            model: warrantyDraft.model,
                            serialNumber: warrantyDraft.serialNumber,
                            warrantyStart: warrantyDraft.warrantyStart,
                            warrantyMonths: warrantyDraft.warrantyMonths,
                          },
                        })}
                      >
                        {busyId === order.id ? 'იქმნება...' : 'შექმნა და SMS-ის გაგზავნა'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="ml-order-reminder">
                  <label>
                    Reminder
                    <input
                      type="datetime-local"
                      value={reminderDrafts[order.id] ?? toDateTimeLocal(order.reminder_at)}
                      onChange={(event) => setReminderDrafts((current) => ({ ...current, [order.id]: event.target.value }))}
                      onBlur={(event) => {
                        if (event.target.value !== toDateTimeLocal(order.reminder_at)) void updateOrder(order, { reminderAt: event.target.value || null })
                      }}
                    />
                  </label>
                  <a href={googleCalendarUrl(order, reminderDrafts[order.id])} target="_blank" rel="noreferrer">Google Calendar</a>
                </div>

                <textarea
                  defaultValue={order.admin_note || ''}
                  placeholder="შიდა შენიშვნა"
                  onBlur={(event) => {
                    if (event.target.value !== (order.admin_note || '')) void updateOrder(order, { adminNote: event.target.value || null })
                  }}
                />
              </article>
            )
          })}
        </div>
      </section>

      <footer className="ml-order-footer">
        <span>© 2026 Medical Line Georgia</span>
        <span>სერვისი · ხარისხი · ნდობა</span>
      </footer>
    </main>
  )
}
