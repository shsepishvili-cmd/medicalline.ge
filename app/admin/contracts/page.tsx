'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ContractRecord } from '@/app/lib/contract-types'
import { formatCurrency } from '@/app/lib/contract'
import {
  AuthBlockedView,
  colors,
  ContractAdminShell,
  ContractStatusBadge,
  EmptyState,
  Field,
  InfoStat,
  LoadingView,
  requestContractPdfUrl,
  ui,
} from './_components/ContractUi'
import { useContractAdminGate } from './_components/ContractUi'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ka-GE')
}

type SortKey = 'contract_number' | 'contract_date' | 'total_amount' | 'customer_name'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

export default function ContractListPage() {
  const { loading, error, profile, accessToken } = useContractAdminGate()
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('contract_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setContracts((data || []) as ContractRecord[]))
  }, [profile])

  useEffect(() => { setPage(1) }, [search, status, dateFrom, dateTo, sortKey, sortDir])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contracts
      .filter((c) => {
        if (status && c.status !== status) return false
        if (dateFrom && c.contract_date && c.contract_date < dateFrom) return false
        if (dateTo && c.contract_date && c.contract_date > dateTo) return false
        if (!q) return true
        return [c.contract_number, c.customer_name, c.clinic_name, c.product_name, c.brand].some(
          (v) => String(v || '').toLowerCase().includes(q),
        )
      })
      .sort((a, b) => {
        let av: string | number = ''
        let bv: string | number = ''
        if (sortKey === 'total_amount') {
          av = Number(a.total_amount || 0)
          bv = Number(b.total_amount || 0)
        } else {
          av = String(a[sortKey] || '')
          bv = String(b[sortKey] || '')
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [contracts, search, status, dateFrom, dateTo, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    total: contracts.length,
    signed: contracts.filter((c) => c.status === 'signed').length,
    draft: contracts.filter((c) => c.status === 'draft').length,
    cancelled: contracts.filter((c) => c.status === 'cancelled').length,
    totalAmount: contracts
      .filter((c) => c.status === 'signed')
      .reduce((s, c) => s + Number(c.total_amount || 0), 0),
  }), [contracts])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  function exportCsv() {
    const headers = ['ნომერი', 'კლინიკა', 'მომხმარებელი', 'პროდუქტი', 'ბრენდი', 'მოდელი', 'თარიღი', 'თანხა', 'ვალუტა', 'სტატუსი']
    const rows = filtered.map((c) => [
      c.contract_number || '', c.clinic_name || '', c.customer_name || '',
      c.product_name || '', c.brand || '', c.model || '',
      c.contract_date || '', c.total_amount || '', c.currency || '', c.status || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contracts_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || ''} />

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700,
    color: colors.muted, borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
  }
  const tdStyle: React.CSSProperties = {
    padding: '12px 12px', fontSize: 13, color: colors.text,
    borderBottom: `1px solid ${colors.border}`, verticalAlign: 'middle',
  }

  return (
    <ContractAdminShell
      title="ხელშეკრულებები"
      subtitle={`სულ ${stats.total} ჩანაწერი`}
      profile={profile}
      actions={
        <>
          <button onClick={exportCsv} style={{ ...ui.secondaryButton, fontSize: 13 }}>CSV ↓</button>
          <Link href="/admin/contracts/new" style={ui.primaryButton}>+ ახალი</Link>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <InfoStat value={stats.total} label="სულ" />
        <InfoStat value={stats.signed} label="ხელმოწერილი" />
        <InfoStat value={stats.draft} label="დრაფტი" />
        <InfoStat value={stats.cancelled} label="გაუქმებული" />
        <InfoStat value={formatCurrency(stats.totalAmount, 'GEL')} label="ხელმოწ. ჯამი" />
      </div>

      <div style={{ ...ui.panel, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 200px' }}>
          <label style={ui.label}>ძებნა</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ნომერი, კლინიკა, პროდუქტი..." style={ui.input} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={ui.label}>სტატუსი</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={ui.input}>
            <option value="">ყველა</option>
            <option value="draft">დრაფტი</option>
            <option value="signed">ხელმოწერილი</option>
            <option value="cancelled">გაუქმებული</option>
          </select>
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={ui.label}>თარიღი (დან)</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={ui.input} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={ui.label}>თარიღი (მდე)</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={ui.input} />
        </div>
        {(search || status || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo('') }}
            style={{ ...ui.secondaryButton, alignSelf: 'flex-end', fontSize: 12 }}>გასუფთავება</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="ხელშეკრულება ვერ მოიძებნა"
          description="სხვა ფილტრი სცადეთ ან შექმენით ახალი"
          action={<Link href="/admin/contracts/new" style={ui.primaryButton}>+ ახალი ხელშეკრულება</Link>}
        />
      ) : (
        <div style={{ ...ui.card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.canvas }}>
                <th style={thStyle} onClick={() => toggleSort('contract_number')}>ნომერი{sortIcon('contract_number')}</th>
                <th style={thStyle} onClick={() => toggleSort('customer_name')}>კლინიკა / კლიენტი{sortIcon('customer_name')}</th>
                <th style={thStyle} onClick={() => toggleSort('contract_date')}>თარიღი{sortIcon('contract_date')}</th>
                <th style={thStyle}>პროდუქტი</th>
                <th style={thStyle} onClick={() => toggleSort('total_amount')}>თანხა{sortIcon('total_amount')}</th>
                <th style={thStyle}>სტატუსი</th>
                <th style={thStyle}>ქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.canvas)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                  <td style={tdStyle}>
                    <Link href={`/admin/contracts/${c.id}`} style={{ color: colors.green, fontWeight: 600, textDecoration: 'none' }}>
                      {c.contract_number}
                    </Link>
                  </td>
                  <td style={tdStyle}>{c.clinic_name || c.customer_name || '—'}</td>
                  <td style={tdStyle}>{fmtDate(c.contract_date)}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{c.product_name}</div>
                    <div style={{ fontSize: 12, color: colors.muted }}>{c.brand}{c.model ? ` · ${c.model}` : ''}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{formatCurrency(c.total_amount, c.currency)}</div>
                    <div style={{ fontSize: 12, color: colors.muted }}>x{c.quantity}</div>
                  </td>
                  <td style={tdStyle}><ContractStatusBadge status={c.status} /></td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link href={`/admin/contracts/${c.id}`} style={{ ...ui.secondaryButton, padding: '7px 12px', fontSize: 12 }}>გახსნა</Link>
                      <Link href={`/admin/contracts/${c.id}/edit`} style={{ ...ui.secondaryButton, padding: '7px 12px', fontSize: 12 }}>✏️</Link>
                      <button onClick={() => openPdf(c.id)} disabled={busyId === c.id}
                        style={{ ...ui.secondaryButton, padding: '7px 12px', fontSize: 12, opacity: busyId === c.id ? 0.7 : 1 }}>PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 13, color: colors.muted }}>{filtered.length} შედეგი · გვ. {page} / {totalPages}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ ...ui.secondaryButton, padding: '7px 14px', fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}>←</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ ...ui.secondaryButton, padding: '7px 12px', fontSize: 13,
                        background: p === page ? colors.green : '#fff', color: p === page ? '#fff' : colors.green }}>{p}</button>
                  )
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ ...ui.secondaryButton, padding: '7px 14px', fontSize: 13, opacity: page === totalPages ? 0.4 : 1 }}>→</button>
              </div>
            </div>
          )}
        </div>
      )}
    </ContractAdminShell>
  )
}