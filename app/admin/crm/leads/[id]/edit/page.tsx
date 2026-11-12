'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { CrmLead } from '@/app/lib/crm-types'
import { AuthBlockedView, CrmAdminShell, LoadingView, useCrmAdminGate } from '../../../_components/CrmUi'
import { LeadForm } from '../../../_components/LeadForm'

export default function EditCrmLeadPage() {
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
      title={`${lead.contact_name || lead.clinic_name || 'ლიდი'} — რედაქტირება`}
      subtitle="განაახლე საკონტაქტო მონაცემები ან შენიშვნები."
      profile={profile}
    >
      <LeadForm accessToken={accessToken} lead={lead} />
    </CrmAdminShell>
  )
}
