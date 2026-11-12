'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  CRM_LEAD_SOURCE_LABELS,
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUS_LABELS,
  CRM_LEAD_STATUS_TONES,
  CRM_LEAD_STATUSES,
  type CrmLead,
} from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  CrmStatusBadge,
  EmptyState,
  Field,
  InfoStat,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../_components/CrmUi'

export default function CrmLeadsListPage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!accessToken) return
    let active = true
    setListLoading(true)
    setLoadError('')

    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (sourceFilter) params.set('source', sourceFilter)

    fetch(`/api/crm/leads?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return
        if (!result?.ok) {
          setLoadError(result?.error || 'ლიდები ვერ ჩაიტვირთა.')
          setLeads([])
          return
        }
        setLeads(result.leads)
      })
      .catch(() => {
        if (active) setLoadError('ლიდები ვერ ჩაიტვირთა.')
      })
      .finally(() => {
        if (active) setListLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, sourceFilter, statusFilter])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return leads

    return leads.filter((lead) => [
      lead.contact_name, lead.clinic_name, lead.phone, lead.email,
      lead.instagram_handle, lead.facebook_profile, lead.whatsapp_phone,
    ].some((value) => String(value || '').toLowerCase().includes(query)))
  }, [leads, search])

  if (loading) return <LoadingView label="ლიდები იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="ლიდები"
      subtitle="ყველა შემოსული მოთხოვნა — ჯერ არაკვალიფიცირებული კონტაქტებიდან რეალურ გარიგებამდე."
      profile={profile}
      actions={<Link href="/admin/crm/leads/new" style={ui.primaryButton}>+ ახალი ლიდი</Link>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <InfoStat value={leads.length} label="სულ ლიდი" />
        <InfoStat value={leads.filter((lead) => lead.status === 'new').length} label="ახალი" />
        <InfoStat value={leads.filter((lead) => lead.status === 'converted').length} label="კონვერტირებული" />
      </div>

      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="ძებნა">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="სახელი, ტელეფონი, ელფოსტა..." style={ui.input} />
        </Field>
        <Field label="სტატუსი">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={ui.input}>
            <option value="">ყველა სტატუსი</option>
            {CRM_LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>{CRM_LEAD_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </Field>
        <Field label="წყარო">
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} style={ui.input}>
            <option value="">ყველა წყარო</option>
            {CRM_LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>{CRM_LEAD_SOURCE_LABELS[source]}</option>
            ))}
          </select>
        </Field>
      </div>

      {loadError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{loadError}</div>
      ) : listLoading ? (
        <LoadingView label="ლიდების სია იტვირთება..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ლიდები ვერ მოიძებნა"
          description="შეცვალე ფილტრები ან დაამატე პირველი ლიდი."
          action={<Link href="/admin/crm/leads/new" style={ui.primaryButton}>ახალი ლიდი</Link>}
        />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', gap: 12, padding: '14px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: colors.muted }}>
            <span>კონტაქტი</span>
            <span>წყარო</span>
            <span>რა აინტერესებს</span>
            <span>სტატუსი</span>
          </div>
          {filtered.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/crm/leads/${lead.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr',
                gap: 12,
                padding: '16px',
                borderTop: '1px solid rgba(15, 23, 42, 0.07)',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{lead.contact_name || lead.clinic_name || 'უსახელო კონტაქტი'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
                  {[lead.clinic_name, lead.phone, lead.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span style={{ fontSize: 13, color: colors.text }}>{CRM_LEAD_SOURCE_LABELS[lead.source]}</span>
              <span style={{ fontSize: 13, color: colors.muted }}>{lead.initial_interest || '—'}</span>
              <div>
                <CrmStatusBadge label={CRM_LEAD_STATUS_LABELS[lead.status]} tone={CRM_LEAD_STATUS_TONES[lead.status]} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </CrmAdminShell>
  )
}
