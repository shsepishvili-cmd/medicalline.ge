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

  if (loading) return <LoadingView label="სერვის ქეისი იტვირთება..." />
  if (error || !profile) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (!serviceCase) return <LoadingView label="სერვის ქეისის მონაცემები მოიძებნება..." />

  return (
    <WarrantyAdminShell
      title={`რედაქტირება: ${serviceCase.case_number}`}
      subtitle="განაახლე ინსპექტირების ჩანაწერები, შედეგი, ქარხანასთან დაკავშირებული თარიღები და მიბმული დანართები."
      profile={profile}
    >
      <ServiceCaseForm warrantyId={serviceCase.warranty_id} profile={profile} serviceCase={serviceCase} />
    </WarrantyAdminShell>
  )
}
