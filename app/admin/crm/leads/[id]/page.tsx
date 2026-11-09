'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  CRM_LEAD_SOURCE_LABELS,
  CRM_LEAD_STATUS_LABELS,
  CRM_LEAD_STATUS_TONES,
  type CrmLead,
} from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  CrmStatusBadge,
  InfoStat,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../../_components/CrmUi'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.06)' }}>
      <span style={{ fontSize: 12, color: colors.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  )
}

export default function CrmLeadDetailPage() {
  const params = useParams<{ id: string }>()
  const { loading, error, profile, accessToken } = useCrmAdminGate()
  const [lead, setLead] = useState<CrmLead | null>(null)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!accessToken || !params.id) return
    fetch(`/api/crm/leads/${params.id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.json())
      .then((result) => {
        if (!result?.ok) {
          setFetchError(result?.error || 'ლიდი ვერ მოიძებნა.')
          return
        }
        setLead(result.lead)
      })
      .catch(() => setFetchError('ლიდი ვერ ჩაიტვირთა.'))
  }, [accessToken, params.id])

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (fetchError) return <AuthBlockedView message={fetchError} />
  if (!lead) return <LoadingView label="ლიდი იტვირთება..." />

  return (
    <CrmAdminShell
      title={lead.contact_name || lead.clinic_name || 'უსახელო ლიდი'}
      subtitle={`წყარო: ${CRM_LEAD_SOURCE_LABELS[lead.source]}`}
      profile={profile}
      actions={
        <>
          <CrmStatusBadge label={CRM_LEAD_STATUS_LABELS[lead.status]} tone={CRM_LEAD_STATUS_TONES[lead.status]} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/admin/crm/leads/${lead.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
            <button
              type="button"
              disabled
              title="ლიდის კონვერტაცია (Account/Contact/Deal) შემდეგ მილსტოუნშია დაგეგმილი."
              style={{ ...ui.primaryButton, opacity: 0.5, cursor: 'not-allowed' }}
            >
              კონვერტაცია (მალე)
            </button>
          </div>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <InfoStat value={CRM_LEAD_SOURCE_LABELS[lead.source]} label="წყარო" />
        <InfoStat value={CRM_LEAD_STATUS_LABELS[lead.status]} label="სტატუსი" />
        <InfoStat value={new Date(lead.created_at).toLocaleDateString('ka-GE')} label="შექმნის თარიღი" />
      </div>

      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>საკონტაქტო მონაცემები</p>
        <DetailRow label="სახელი" value={lead.contact_name || ''} />
        <DetailRow label="კლინიკა / ორგანიზაცია" value={lead.clinic_name || ''} />
        <DetailRow label="ქალაქი" value={lead.city || ''} />
        <DetailRow label="ტელეფონი" value={lead.phone || ''} />
        <DetailRow label="ელფოსტა" value={lead.email || ''} />
        <DetailRow label="Instagram" value={lead.instagram_handle || ''} />
        <DetailRow label="Facebook" value={lead.facebook_profile || ''} />
        <DetailRow label="WhatsApp" value={lead.whatsapp_phone || ''} />
      </div>

      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>რა აინტერესებს</p>
        <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{lead.initial_interest || '—'}</p>
      </div>

      <div style={{ ...ui.panel }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>შენიშვნები</p>
        <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{lead.notes || '—'}</p>
        {lead.status === 'disqualified' && lead.disqualify_reason ? (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#9B1C1C' }}>დისკვალიფიკაციის მიზეზი: {lead.disqualify_reason}</p>
        ) : null}
      </div>
    </CrmAdminShell>
  )
}
