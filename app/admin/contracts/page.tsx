'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ContractRecord } from '@/app/lib/contract-types'
import { formatCurrency } from '@/app/lib/contract'
import {
  AuthBlockedView, colors, ContractAdminShell, ContractStatusBadge,
  EmptyState, Field, InfoStat, LoadingView, requestContractPdfUrl, ui,
} from './_components/ContractUi'
import { useContractAdminGate } from './_components/ContractUi'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ka-GE')
}

export default function ContractListPage() {
  const { loading, error, profile, accessToken } = useContractAdminGate()
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setContracts((data || []) as ContractRecord[]))
  }, [profile])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contracts.filter((c) => {
      if (status && c.status !== status) return false
      if (!q) return true
      return [c.contract_number, c.customer_name, c.clinic_name, c.product_name, c.brand].some(
        (v) => String(v || '').toLowerCase().includes(q),
      )
    })
  }, [contracts, search, status])

  const stats = useMemo(() => ({
    total:  contracts.length,
    signed: contracts.filter((c) => c.status === 'signed').length,
    draft:  contracts.filter((c) => c.status === 'draft').length,
  }), [contracts])

  async function openPdf(contractId: string) {
    if (!accessToken) return
    setBusyId(contractId)
    try {
      const url = await requestContractPdfUrl(accessToken, contractId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'შეცდომა')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingView label="ხელშეკრულებები იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <ContractAdminShell
      title="ხელშეკრულებების მართვა"
      subtitle="შექმენი გაყიდვის ხელშეკრულებები, გენერირე PDF ქართულ ენაზე, მიაბი გარანტიის ჩანაწერს."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>ძებნა მუშაობს ნომერზე, კლინიკაზე, პროდუქტზე.</span>
          <Link href="/admin/contracts/new" style={ui.primaryButton}>ახალი ხელშეკრულება</Link>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <InfoStat value={stats.total}  label="სულ ხელშეკრულება" />
        <InfoStat value={stats.signed} label="ხელმოწერილი" />
        <InfoStat value={stats.draft}  label="დრაფტი" />
      </div>

      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="ძებნა">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ნომერი, კლინიკა, პროდუქტი..." style={ui.input} />
        </Field>
        <Field label="სტატუსი">
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={ui.input}>
            <option value="">ყველა სტატუსი</option>
            <option value="draft">დრაფტი</option>
            <option value="signed">ხელმოწერილი</option>
            <option value="cancelled">გაუქმებული</option>
          </select>
        </Field>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="ხელშეკრულება ვერ მოიძებნა"
          description="შეცვალე ფილტრები ან შექმენი პირველი ხელშეკრულება."
          action={<Link href="/admin/contracts/new" style={ui.primaryButton}>ახალი ხელშეკრულება</Link>}
        />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.8fr 1.4fr', gap: 12, padding: '14px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: colors.muted }}>
            <span>ხელშეკრულება</span>
            <span>პროდუქტი</span>
            <span>თანხა</span>
            <span>სტატუსი</span>
            <span>ქმედებები</span>
          </div>
          {filtered.map((c) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.8fr 1.4fr', gap: 12, padding: '16px', borderTop: '1px solid rgba(15,23,42,0.07)', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{c.contract_number}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>{c.clinic_name || c.customer_name || '—'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>{fmtDate(c.contract_date)}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{c.product_name}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>{c.brand}{c.model ? ` · ${c.model}` : ''}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{formatCurrency(c.total_amount, c.currency)}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>x{c.quantity}</p>
              </div>
              <ContractStatusBadge status={c.status} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/admin/contracts/${c.id}`} style={ui.secondaryButton}>ნახვა</Link>
                <Link href={`/admin/contracts/${c.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
                <button type="button" onClick={() => openPdf(c.id)} disabled={busyId === c.id} style={{ ...ui.secondaryButton, opacity: busyId === c.id ? 0.7 : 1 }}>
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ContractAdminShell>
  )
}
