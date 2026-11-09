'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CrmAccount } from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  EmptyState,
  Field,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../_components/CrmUi'

export default function CrmCustomersPage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()
  const [customers, setCustomers] = useState<CrmAccount[]>([])
  const [search, setSearch] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    let active = true
    setListLoading(true)
    setLoadError('')

    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())

    fetch(`/api/crm/customers?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return
        if (!result?.ok) {
          setLoadError(result?.error || 'კლიენტები ვერ ჩაიტვირთა.')
          setCustomers([])
          return
        }
        setCustomers(result.customers)
      })
      .catch(() => {
        if (active) setLoadError('კლიენტები ვერ ჩაიტვირთა.')
      })
      .finally(() => {
        if (active) setListLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, search])

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="კლიენტები"
      subtitle="ERP-ის ანგარიშები (erp_parties) — Customer 360 პროფილის შესასვლელი წერტილი."
      profile={profile}
    >
      <div style={{ ...ui.panel }}>
        <Field label="ძებნა">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="სახელი, ტელეფონი, ელფოსტა..." style={ui.input} />
        </Field>
      </div>

      {loadError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{loadError}</div>
      ) : listLoading ? (
        <LoadingView label="კლიენტების სია იტვირთება..." />
      ) : customers.length === 0 ? (
        <EmptyState title="კლიენტები ვერ მოიძებნა" description="ERP-ში ჯერ არ არის customer/both ტიპის ანგარიში, ან ძებნამ არაფერი დააბრუნა." />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 12, padding: '14px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: colors.muted }}>
            <span>სახელი</span>
            <span>ტიპი</span>
            <span>ქალაქი</span>
            <span>ლიდის წყარო</span>
          </div>
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/admin/crm/customers/${customer.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
                gap: 12,
                padding: '16px',
                borderTop: '1px solid rgba(15, 23, 42, 0.07)',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{customer.name}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
                  {[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span style={{ fontSize: 13, color: colors.text }}>{customer.is_individual ? 'ინდივიდუალური' : 'ორგანიზაცია'}</span>
              <span style={{ fontSize: 13, color: colors.muted }}>{customer.city || '—'}</span>
              <span style={{ fontSize: 13, color: colors.muted }}>{customer.lead_source || '—'}</span>
            </Link>
          ))}
        </div>
      )}
    </CrmAdminShell>
  )
}
