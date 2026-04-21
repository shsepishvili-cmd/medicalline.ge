'use client'

// =============================================================================
// Admin > Academy > New video
// =============================================================================

import {
  useAcademyAdminGate,
  AcademyAdminShell,
  LoadingView,
  AuthBlockedView,
} from '../_components/AcademyUi'
import VideoForm from '../_components/VideoForm'

export default function NewVideoPage() {
  const { loading, error, profile } = useAcademyAdminGate()

  if (loading) return <LoadingView label="მოდული იტვირთება..." />
  if (error)   return <AuthBlockedView message={error} />
  if (!profile) return null

  return (
    <AcademyAdminShell
      title="ახალი ვიდეო"
      subtitle="YouTube ვიდეოს ხელით დამატება პროდუქტის აკადემიაში."
      profile={profile}
    >
      <VideoForm />
    </AcademyAdminShell>
  )
}
