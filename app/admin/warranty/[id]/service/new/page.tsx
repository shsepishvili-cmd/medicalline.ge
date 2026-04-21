'use client'

import { useParams } from 'next/navigation'
import { AuthBlockedView, LoadingView, WarrantyAdminShell, useWarrantyAdminGate } from '../../../_components/WarrantyUi'
import { ServiceCaseForm } from '../../../_components/ServiceCaseForm'

export default function NewServiceCasePage() {
  const params = useParams<{ id: string }>()
  const { loading, error, profile } = useWarrantyAdminGate()

  if (loading) return <LoadingView label="Preparing service case form…" />
  if (error || !profile) return <AuthBlockedView message={error || 'Access denied.'} />

  return (
    <WarrantyAdminShell
      title="Create Service Case"
      subtitle="Record inspections, warranty coverage decisions, factory dispatch, and closure outcomes against the selected warranty."
      profile={profile}
    >
      <ServiceCaseForm warrantyId={params.id} profile={profile} />
    </WarrantyAdminShell>
  )
}
