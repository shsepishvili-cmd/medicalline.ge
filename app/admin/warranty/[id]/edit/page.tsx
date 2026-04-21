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

  if (loading) return <LoadingView label="გარანტიის ფორმა იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (!warranty) return <LoadingView label="გარანტიის მონაცემები მოიძებნება..." />

  return (
    <WarrantyAdminShell
      title={`რედაქტირება: ${warranty.warranty_number}`}
      subtitle="განაახლე მომხმარებლის დეტალები, დაამატე დოკუმენტები ან შეასწორე პროდუქტის ინფორმაცია ისე, რომ ახალი გარანტიის შექმნა არ დაგჭირდეს."
      profile={profile}
    >
      <WarrantyForm profile={profile} accessToken={accessToken} warranty={warranty} />
    </WarrantyAdminShell>
  )
}
