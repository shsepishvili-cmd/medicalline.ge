'use client'

import { AuthBlockedView, ContractAdminShell, LoadingView, useContractAdminGate } from '../_components/ContractUi'
import { ContractForm } from '../_components/ContractForm'

export default function NewContractPage() {
  const { loading, error, profile, accessToken } = useContractAdminGate()

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <ContractAdminShell
      title="ახალი ხელშეკრულება"
      subtitle="შეავსე ველები, შეინახე და სისტემა ავტომატურად გენერირებს PDF გაყიდვის ხელშეკრულებას ქართულ ენაზე."
      profile={profile}
    >
      <ContractForm profile={profile} accessToken={accessToken} />
    </ContractAdminShell>
  )
}
