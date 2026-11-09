'use client'

import { AuthBlockedView, CrmAdminShell, LoadingView, useCrmAdminGate } from '../_components/CrmUi'
import { PipelineBoard } from '../_components/PipelineBoard'

export default function CrmPipelinePage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="გაყიდვების პაიფლაინი"
      subtitle="გადაათრიე გარიგება შესაბამის ეტაპზე. ეტაპის ცვლილება ავტომატურად არაფერს ქმნის ERP-ში."
      profile={profile}
    >
      <PipelineBoard accessToken={accessToken} />
    </CrmAdminShell>
  )
}
