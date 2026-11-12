'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/app/lib/supabase'

type ClinicProfile = { id: string; full_name: string; clinic_name: string; city: string; phone: string; role: string; status: string }
type PortalContextValue = { session: Session | null; profile: ClinicProfile | null; loading: boolean; refreshProfile: () => Promise<void>; signOut: () => Promise<void> }

const PortalContext = createContext<PortalContextValue | null>(null)

export function ClinicPortalProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ClinicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(nextSession?: Session | null) {
    const activeSession = nextSession ?? (await supabase.auth.getSession()).data.session
    setSession(activeSession)
    if (!activeSession?.user?.id) { setProfile(null); setLoading(false); return }
    const { data } = await supabase.from('profiles').select('id, full_name, clinic_name, city, phone, role, status').eq('id', activeSession.user.id).single()
    setProfile(data || null)
    setLoading(false)
  }

  useEffect(() => {
    void loadProfile()
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { void loadProfile(nextSession) })
    return () => data.subscription.unsubscribe()
  }, [])

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setLoading(false)
  }

  const value = useMemo(() => ({ session, profile, loading, refreshProfile: () => loadProfile(), signOut }), [session, profile, loading])
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function useClinicPortal() {
  const value = useContext(PortalContext)
  if (!value) throw new Error('useClinicPortal must be used inside ClinicPortalProvider')
  return value
}
