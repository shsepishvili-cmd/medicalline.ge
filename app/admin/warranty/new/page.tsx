'use client'

import { AuthBlockedView, LoadingView, WarrantyAdminShell } from '../_components/WarrantyUi'
import { WarrantyForm } from '../_components/WarrantyForm'
import { useWarrantyAdminGate } from '../_components/WarrantyUi'

export default function NewWarrantyPage() {
  const { loading, error, profile, accessToken } = useWarrantyAdminGate()

  if (loading) return <LoadingView label="Preparing warranty form…" />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'Access denied.'} />

  return (
    <WarrantyAdminShell
      title="Register Warranty"
      subtitle="Capture product, clinic, serial number, and proof-of-purchase details once, then let the system calculate dates and generate the certificate."
      profile={profile}
    >
      <WarrantyForm profile={profile} accessToken={accessToken} />
    </WarrantyAdminShell>
  )
}
