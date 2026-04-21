'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { WarrantyRecord } from '@/app/lib/warranty-types'
import { AuthBlockedView, LoadingView, WarrantyAdminShell, useWarrantyAdminGate } from '../../_components/WarrantyUi'
import { WarrantyForm } from '../../_components/WarrantyForm'

export default function EditWarrantyPage() {
  const params = useParams<{ id: string }>()
  const { loading, error, profile, accessToken } = useWarrantyAdminGate()
  const [warranty, setWarranty] = useState<WarrantyRecord | null>(null)

  useEffect(() => {
    if (!profile || !params.id) return
    supabase.from('warranties').select('*').eq('id', params.id).single().then(({ data }) => {
      setWarranty((data || null) as WarrantyRecord | null)
    })
  }, [params.id, profile])

  if (loading) return <LoadingView label="Loading warranty form…" />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'Access denied.'} />
  if (!warranty) return <LoadingView label="Fetching warranty data…" />

  return (
    <WarrantyAdminShell
      title={`Edit ${warranty.warranty_number}`}
      subtitle="Update customer details, extend documents, or correct product metadata without recreating the warranty."
      profile={profile}
    >
      <WarrantyForm profile={profile} accessToken={accessToken} warranty={warranty} />
    </WarrantyAdminShell>
  )
}
