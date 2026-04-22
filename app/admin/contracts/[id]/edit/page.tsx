'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ContractRecord } from '@/app/lib/contract-types'
import { AuthBlockedView, ContractAdminShell, LoadingView, useContractAdminGate } from '../../_components/ContractUi'
import { ContractForm } from '../../_components/ContractForm'

export default function EditContractPage() {
  const params = useParams<{ id: string }>()
  const { loading, error, profile, accessToken } = useContractAdminGate()
  const [contract, setContract] = useState<ContractRecord | null>(null)

  useEffect(() => {
    if (!profile || !params.id) return
    supabase
      .from('contracts')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => setContract(data as ContractRecord | null))
  }, [params.id, profile])

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (!contract) return <LoadingView label="ხელშეკრულება ვერ მოიძებნა..." />

  return (
    <ContractAdminShell
      title={`${contract.contract_number} — რედაქტირება`}
      subtitle="შეცვალე საჭირო ველები, შეინახე ან ხელახლა გენერირე PDF."
      profile={profile}
    >
      <ContractForm profile={profile} accessToken={accessToken} contract={contract} />
    </ContractAdminShell>
  )
}
