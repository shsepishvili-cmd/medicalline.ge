'use client'

import { AuthBlockedView, CrmAdminShell, LoadingView, useCrmAdminGate } from '../../_components/CrmUi'
import { LeadForm } from '../../_components/LeadForm'

export default function NewCrmLeadPage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="ახალი ლიდი"
      subtitle="შეავსე რაც იცი — თუნდაც მხოლოდ ტელეფონი ან Instagram-ის სახელი საკმარისია."
      profile={profile}
    >
      <LeadForm accessToken={accessToken} />
    </CrmAdminShell>
  )
}
