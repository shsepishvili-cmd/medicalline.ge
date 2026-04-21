'use client'

import { useParams } from 'next/navigation'
import { AuthBlockedView, LoadingView, WarrantyAdminShell, useWarrantyAdminGate } from '../../../_components/WarrantyUi'
import { ServiceCaseForm } from '../../../_components/ServiceCaseForm'

export default function NewServiceCasePage() {
  const params = useParams<{ id: string }>()
  const { loading, error, profile } = useWarrantyAdminGate()

  if (loading) return <LoadingView label="სერვის ქეისის ფორმა მზადდება..." />
  if (error || !profile) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <WarrantyAdminShell
      title="სერვის ქეისის შექმნა"
      subtitle="დააფიქსირე ინსპექტირება, გარანტიის დაფარვის გადაწყვეტილება, ქარხანაში გაგზავნა და საბოლოო შედეგი არჩეული გარანტიის ფარგლებში."
      profile={profile}
    >
      <ServiceCaseForm warrantyId={params.id} profile={profile} />
    </WarrantyAdminShell>
  )
}
