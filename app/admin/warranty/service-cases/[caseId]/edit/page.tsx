'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ServiceCaseRecord } from '@/app/lib/warranty-types'
import { AuthBlockedView, LoadingView, WarrantyAdminShell, useWarrantyAdminGate } from '../../../_components/WarrantyUi'
import { ServiceCaseForm } from '../../../_components/ServiceCaseForm'

export default function EditServiceCasePage() {
  const params = useParams<{ caseId: string }>()
  const { loading, error, profile } = useWarrantyAdminGate()
  const [serviceCase, setServiceCase] = useState<ServiceCaseRecord | null>(null)

  useEffect(() => {
    if (!profile || !params.caseId) return
    supabase.from('service_cases').select('*').eq('id', params.caseId).single().then(({ data }) => {
      setServiceCase((data || null) as ServiceCaseRecord | null)
    })
  }, [params.caseId, profile])

  if (loading) return <LoadingView label="Loading service case…" />
  if (error || !profile) return <AuthBlockedView message={error || 'Access denied.'} />
  if (!serviceCase) return <LoadingView label="Fetching service case data…" />

  return (
    <WarrantyAdminShell
      title={`Edit ${serviceCase.case_number}`}
      subtitle="Update inspection notes, outcome, factory dates, and linked attachments for this service case."
      profile={profile}
    >
      <ServiceCaseForm warrantyId={serviceCase.warranty_id} profile={profile} serviceCase={serviceCase} />
    </WarrantyAdminShell>
  )
}
