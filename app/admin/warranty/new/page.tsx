'use client'

import { AuthBlockedView, LoadingView, WarrantyAdminShell } from '../_components/WarrantyUi'
import { WarrantyForm } from '../_components/WarrantyForm'
import { useWarrantyAdminGate } from '../_components/WarrantyUi'

export default function NewWarrantyPage() {
  const { loading, error, profile, accessToken } = useWarrantyAdminGate()

  if (loading) return <LoadingView label="გარანტიის ფორმა მზადდება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <WarrantyAdminShell
      title="გარანტიის რეგისტრაცია"
      subtitle="ერთხელ შეიყვანე პროდუქტის, კლინიკის, სერიული ნომრისა და შესყიდვის დეტალები, შემდეგ კი სისტემას ავტომატურად დათვლევინე თარიღები და დააგენერირებინე სერტიფიკატი."
      profile={profile}
    >
      <WarrantyForm profile={profile} accessToken={accessToken} />
    </WarrantyAdminShell>
  )
}
