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

  if (loading) return <LoadingView label="Warranty records are loading…" />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'Access denied.'} />

  return (
    <WarrantyAdminShell
      title="Warranty Management"
      subtitle="Create warranties, search by serial or clinic, regenerate certificates, and track every service case from one admin workspace."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>Fast search works across serial number, clinic, doctor, brand, model, and status.</span>
          <Link href="/admin/warranty/new" style={ui.primaryButton}>Register Warranty</Link>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <InfoStat value={warranties.length} label="Total warranties" />
        <InfoStat value={stats.active} label="Active" />
        <InfoStat value={stats.expiring} label="Expiring in 30 days" />
        <InfoStat value={stats.expired} label="Expired" />
      </div>

      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="Search">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Serial, clinic, customer…" style={ui.input} />
        </Field>
        <Field label="Brand">
          <select value={brand} onChange={(event) => setBrand(event.target.value)} style={ui.input}>
            <option value="">All brands</option>
            {brands.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Model">
          <select value={model} onChange={(event) => setModel(event.target.value)} style={ui.input}>
            <option value="">All models</option>
            {models.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value)} style={ui.input}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="expired">expired</option>
            <option value="void">void</option>
            <option value="replaced">replaced</option>
          </select>
        </Field>
        <Field label="Start from">
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={ui.input} />
        </Field>
        <Field label="Start to">
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={ui.input} />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: colors.text, paddingTop: 24 }}>
          <input type="checkbox" checked={expiringSoon} onChange={(event) => setExpiringSoon(event.target.checked)} />
          Expiring soon
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No warranties found"
          description="Adjust the filters above or register the first warranty from the admin panel."
          action={<Link href="/admin/warranty/new" style={ui.primaryButton}>New Warranty</Link>}
        />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.8fr 1.3fr', gap: 12, padding: '14px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: colors.muted }}>
            <span>Warranty</span>
            <span>Product</span>
            <span>Status</span>
            <span>Actions</span>
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
                  {item.brand}{item.model ? ` · ${item.model}` : ''} · Sold by {item.sold_by || '—'}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>Created {formatDate(item.created_at)}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <WarrantyStatusBadge status={item.status} />
                <span style={{ fontSize: 12, color: colors.muted }}>Ends {formatDate(item.warranty_end)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/admin/warranty/${item.id}`} style={ui.secondaryButton}>View</Link>
                <Link href={`/admin/warranty/${item.id}/edit`} style={ui.secondaryButton}>Edit</Link>
                <button type="button" onClick={() => openPdf(item.id)} disabled={busyId === item.id} style={{ ...ui.secondaryButton, opacity: busyId === item.id ? 0.7 : 1 }}>
                  PDF
                </button>
                <Link href={`/admin/warranty/${item.id}/service/new`} style={ui.secondaryButton}>Add Service</Link>
                <button type="button" onClick={() => archiveWarranty(item.id)} disabled={busyId === item.id} style={{ ...ui.secondaryButton, color: '#991B1B' }}>
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </WarrantyAdminShell>
  )
}
