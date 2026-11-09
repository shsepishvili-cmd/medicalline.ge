'use client'

// =============================================================================
// CRM admin – shared UI primitives and auth gate.
// Reuses colors/ui/Field/etc from WarrantyUi to stay consistent with the
// existing admin design system, but adds a CRM-specific shell and gate.
// =============================================================================

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { isActiveProfileStatus, isInternalWarrantyRole } from '@/app/lib/warranty'
import type { ProfileSummary } from '@/app/lib/warranty-types'

// Import shared design tokens
import {
  colors,
  ui,
  Field,
  EmptyState,
  InfoStat,
  LoadingView,
  AuthBlockedView,
} from '@/app/admin/warranty/_components/WarrantyUi'

// Re-export so CRM components only need one import
export { colors, ui, Field, EmptyState, InfoStat, LoadingView, AuthBlockedView }

// ---------------------------------------------------------------------------
// CRM auth gate (admin/engineer/dealer, active — same "internal staff" set
// already used by the warranty module)
// ---------------------------------------------------------------------------

type CrmAuthState = {
  loading: boolean
  error: string | null
  profile: ProfileSummary | null
  accessToken: string | null
}

export function useCrmAdminGate(): CrmAuthState {
  const [state, setState] = useState<CrmAuthState>({
    loading: true,
    error: null,
    profile: null,
    accessToken: null,
  })

  useEffect(() => {
    let mounted = true

    async function load(sessionOverride?: { user?: { id?: string } | null; access_token?: string | null } | null) {
      if (mounted) {
        setState((current) => ({ ...current, loading: true }))
      }

      const session = sessionOverride ?? (await supabase.auth.getSession()).data.session

      if (!session?.user?.id || !session.access_token) {
        if (mounted) {
          setState({
            loading: false,
            error: 'CRM მოდული ხელმისაწვდომია მხოლოდ ავტორიზებული admin/staff მომხმარებლებისთვის.',
            profile: null,
            accessToken: null,
          })
        }
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, clinic_name, phone, role, status')
        .eq('id', session.user.id)
        .single()

      if (!mounted) return

      if (error || !profile) {
        setState({
          loading: false,
          error: 'პროფილი ვერ მოიძებნა. გადაამოწმე `profiles` table/RLS.',
          profile: null,
          accessToken: null,
        })
        return
      }

      if (!isActiveProfileStatus(profile.status) || !isInternalWarrantyRole(profile.role)) {
        setState({
          loading: false,
          error: 'CRM მოდულზე წვდომა ამ ანგარიშს არ აქვს.',
          profile: null,
          accessToken: null,
        })
        return
      }

      setState({
        loading: false,
        error: null,
        profile,
        accessToken: session.access_token,
      })
    }

    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}

export function CrmAdminShell({
  title,
  subtitle,
  profile,
  actions,
  children,
}: {
  title: string
  subtitle: string
  profile: ProfileSummary
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={ui.page}>
      <div style={ui.wrap}>
        <div style={{ ...ui.card, overflow: 'hidden' }}>
          <div
            style={{
              padding: 22,
              background:
                'linear-gradient(135deg, rgba(8,80,65,1) 0%, rgba(11,97,77,1) 58%, rgba(13,125,98,1) 100%)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.88 }}>ადმინი / CRM</p>
              <h1 style={{ margin: '8px 0 6px', fontSize: 30, fontWeight: 700 }}>{title}</h1>
              <p style={{ margin: 0, maxWidth: 720, fontSize: 14, lineHeight: 1.55, color: '#D6F2E8' }}>{subtitle}</p>
            </div>
            <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#9FE1CB' }}>შესულია როგორც</p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600 }}>{profile.full_name || 'Medical Line თანამშრომელი'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#C6ECDD' }}>{profile.role} · {profile.clinic_name || 'Medical Line Georgia'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Link href="/admin" style={ui.secondaryButton}>ადმინი</Link>
                <Link href="/admin/crm" style={ui.secondaryButton}>CRM მთავარი</Link>
                <Link href="/admin/crm/leads" style={ui.secondaryButton}>ლიდები</Link>
                <Link href="/admin/crm/customers" style={ui.secondaryButton}>კლიენტები</Link>
                <Link href="/admin/crm/tasks" style={ui.secondaryButton}>დავალებები</Link>
                <Link href="/admin/crm/follow-ups" style={ui.secondaryButton}>Follow-ups</Link>
                <Link href="/admin/crm/pipeline" style={ui.primaryButton}>გაყიდვების დაფა</Link>
              </div>
            </div>
          </div>
          {actions ? (
            <div
              style={{
                padding: '14px 22px',
                borderTop: '1px solid rgba(255,255,255,0.14)',
                background: '#F9FCFB',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
              }}
            >
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}

export function CrmStatusBadge({
  label,
  tone,
}: {
  label: string
  tone: { background: string; color: string }
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: tone.background,
        color: tone.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  )
}
