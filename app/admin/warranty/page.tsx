'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { WarrantyRecord } from '@/app/lib/warranty-types'
import { formatDate } from '@/app/lib/warranty'
import {
  AuthBlockedView,
  colors,
  EmptyState,
  Field,
  InfoStat,
  LoadingView,
  requestSignedFileUrl,
  ui,
  useWarrantyAdminGate,
  WarrantyAdminShell,
  WarrantyRowMeta,
  WarrantyStatusBadge,
} from './_components/WarrantyUi'

export default function WarrantyListPage() {
  const { loading, error, profile, accessToken } = useWarrantyAdminGate()
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([])
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return

    supabase
      .from('warranties')
      .select('*, products(id, name, brand, category_slug, slug)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setWarranties((data || []) as WarrantyRecord[]))
  }, [profile])

  const brands = useMemo(() => Array.from(new Set(warranties.map((item) => item.brand).filter(Boolean))).sort(), [warranties])
  const models = useMemo(() => Array.from(new Set(warranties.map((item) => item.model || '').filter(Boolean))).sort(), [warranties])

  const filtered = useMemo(() => {
    const now = new Date()
    const soon = new Date()
    soon.setDate(soon.getDate() + 30)
    const query = search.trim().toLowerCase()

    return warranties.filter((item) => {
      if (brand && item.brand !== brand) return false
      if (model && item.model !== model) return false
      if (status && item.status !== status) return false
      if (dateFrom && item.warranty_start < dateFrom) return false
      if (dateTo && item.warranty_start > dateTo) return false
      if (expiringSoon) {
        const end = new Date(`${item.warranty_end}T23:59:59`)
        if (!(item.status === 'active' && end >= now && end <= soon)) return false
      }
      if (!query) return true

      return [
        item.warranty_number,
        item.serial_number,
        item.clinic_name,
        item.customer_name,
        item.brand,
        item.model,
        item.product_name,
        item.status,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
  }, [brand, dateFrom, dateTo, expiringSoon, model, search, status, warranties])

  const stats = useMemo(() => {
    const active = warranties.filter((item) => item.status === 'active').length
    const expired = warranties.filter((item) => item.status === 'expired').length
    const expiring = filtered.filter((item) => {
      const today = new Date()
      const soon = new Date()
      soon.setDate(soon.getDate() + 30)
      const end = new Date(`${item.warranty_end}T23:59:59`)
      return item.status === 'active' && end >= today && end <= soon
    }).length

    return { active, expired, expiring }
  }, [filtered, warranties])

  async function openPdf(warrantyId: string) {
    if (!accessToken) return
    setBusyId(warrantyId)

    try {
      await fetch(`/api/warranty/${warrantyId}/certificate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const signed = await requestSignedFileUrl(accessToken, { kind: 'pdf', warrantyId })
      window.open(signed.url, '_blank', 'noopener,noreferrer')
    } finally {
      setBusyId(null)
    }
  }

  async function archiveWarranty(warrantyId: string) {
    setBusyId(warrantyId)
    await supabase.from('warranties').update({ archived_at: new Date().toISOString() }).eq('id', warrantyId)
    setWarranties((current) => current.filter((item) => item.id !== warrantyId))
    setBusyId(null)
  }

  if (loading) return <LoadingView label="გარანტიების ჩანაწერები იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <WarrantyAdminShell
      title="გარანტიების მართვა"
      subtitle="შექმენი გარანტიები, მოძებნე სერიული ნომრით ან კლინიკით, თავიდან გენერირე სერტიფიკატები და აკონტროლე ყველა სერვის-ქეისი ერთი ადმინ სივრციდან."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>სწრაფი ძებნა მუშაობს სერიულ ნომერზე, კლინიკაზე, ექიმზე, ბრენდზე, მოდელსა და სტატუსზე.</span>
          <Link href="/admin/warranty/new" style={ui.primaryButton}>გარანტიის დამატება</Link>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <InfoStat value={warranties.length} label="სულ გარანტიები" />
        <InfoStat value={stats.active} label="აქტიური" />
        <InfoStat value={stats.expiring} label="30 დღეში გასდის" />
        <InfoStat value={stats.expired} label="ვადაგასული" />
      </div>

      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="ძებნა">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="სერიული, კლინიკა, მომხმარებელი..." style={ui.input} />
        </Field>
        <Field label="ბრენდი">
          <select value={brand} onChange={(event) => setBrand(event.target.value)} style={ui.input}>
            <option value="">ყველა ბრენდი</option>
            {brands.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="მოდელი">
          <select value={model} onChange={(event) => setModel(event.target.value)} style={ui.input}>
            <option value="">ყველა მოდელი</option>
            {models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="სტატუსი">
          <select value={status} onChange={(event) => setStatus(event.target.value)} style={ui.input}>
            <option value="">ყველა სტატუსი</option>
            <option value="pending">მოლოდინში</option>
            <option value="active">აქტიური</option>
            <option value="expired">ვადაგასული</option>
            <option value="void">გაუქმებული</option>
            <option value="replaced">შეცვლილი</option>
          </select>
        </Field>
        <Field label="დაწყება-დან">
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={ui.input} />
        </Field>
        <Field label="დაწყება-მდე">
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={ui.input} />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: colors.text, paddingTop: 24 }}>
          <input type="checkbox" checked={expiringSoon} onChange={(event) => setExpiringSoon(event.target.checked)} />
          მალე გასდით
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="გარანტიები ვერ მოიძებნა"
          description="შეცვალე ფილტრები ან დაამატე პირველი გარანტია ადმინ პანელიდან."
          action={<Link href="/admin/warranty/new" style={ui.primaryButton}>ახალი გარანტია</Link>}
        />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.8fr 1.3fr', gap: 12, padding: '14px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: colors.muted }}>
            <span>გარანტია</span>
            <span>პროდუქტი</span>
            <span>სტატუსი</span>
            <span>ქმედებები</span>
          </div>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.7fr 1fr 0.8fr 1.3fr',
                gap: 12,
                padding: '16px',
                borderTop: '1px solid rgba(15, 23, 42, 0.07)',
                alignItems: 'center',
              }}
            >
              <WarrantyRowMeta
                warrantyNumber={item.warranty_number}
                serialNumber={item.serial_number}
                clinic={item.clinic_name}
                customer={item.customer_name}
                endDate={item.warranty_end}
              />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{item.product_name}</p>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>
                  {item.brand}{item.model ? ` · ${item.model}` : ''} · გაყიდა: {item.sold_by || '—'}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>შეიქმნა {formatDate(item.created_at)}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <WarrantyStatusBadge status={item.status} />
                <span style={{ fontSize: 12, color: colors.muted }}>სრულდება {formatDate(item.warranty_end)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/admin/warranty/${item.id}`} style={ui.secondaryButton}>ნახვა</Link>
                <Link href={`/admin/warranty/${item.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
                <button type="button" onClick={() => openPdf(item.id)} disabled={busyId === item.id} style={{ ...ui.secondaryButton, opacity: busyId === item.id ? 0.7 : 1 }}>
                  PDF
                </button>
                <Link href={`/admin/warranty/${item.id}/service/new`} style={ui.secondaryButton}>სერვისის დამატება</Link>
                <button type="button" onClick={() => archiveWarranty(item.id)} disabled={busyId === item.id} style={{ ...ui.secondaryButton, color: '#991B1B' }}>
                  დაარქივება
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </WarrantyAdminShell>
  )
}
