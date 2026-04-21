'use client'

// =============================================================================
// Academy admin – shared UI primitives and auth gate
// Reuses colors/ui/Field/etc from WarrantyUi to stay consistent with the
// existing admin design system, but adds an academy-specific shell and gate.
// =============================================================================

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
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

// Re-export so academy components only need one import
export { colors, ui, Field, EmptyState, InfoStat, LoadingView, AuthBlockedView }

// ---------------------------------------------------------------------------
// Academy-specific auth gate (admin role only)
// ---------------------------------------------------------------------------

type AcademyAuthState = {
  loading: boolean
  error: string | null
  profile: ProfileSummary | null
  accessToken: string | null
}

export function useAcademyAdminGate(): AcademyAuthState {
  const [state, setState] = useState<AcademyAuthState>({
    loading: true,
    error: null,
    profile: null,
    accessToken: null,
  })

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session

      if (!session?.user?.id || !session.access_token) {
        if (mounted) {
          setState({
            loading: false,
            error: 'აკადემიის მოდული ხელმისაწვდომია მხოლოდ ავტორიზებული ადმინებისთვის.',
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

      if (profile.status !== 'active' || profile.role !== 'admin') {
        setState({
          loading: false,
          error: 'აკადემიის მოდულზე წვდომა მხოლოდ admin როლის მომხმარებელს აქვს.',
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
    return () => {
      mounted = false
    }
  }, [])

  return state
}

// ---------------------------------------------------------------------------
// Academy admin shell (page wrapper with gradient header + nav)
// ---------------------------------------------------------------------------

export function AcademyAdminShell({
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
          {/* Gradient header */}
          <div
            style={{
              padding: 22,
              background:
                'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 58%, #2563EB 100%)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
                ადმინი / აკადემია
              </p>
              <h1 style={{ margin: '8px 0 6px', fontSize: 28, fontWeight: 700 }}>
                {title}
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 680,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: '#BFDBFE',
                }}
              >
                {subtitle}
              </p>
            </div>

            <div
              style={{
                minWidth: 220,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'flex-end',
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#93C5FD' }}>
                  შესულია როგორც
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600 }}>
                  {profile.full_name || 'Medical Line ადმინი'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#BFDBFE' }}>
                  {profile.role} · {profile.clinic_name || 'Medical Line Georgia'}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}
              >
                <Link href="/admin" style={ui.secondaryButton}>
                  ადმინი
                </Link>
                <Link href="/admin/academy" style={ui.secondaryButton}>
                  ვიდეოების სია
                </Link>
                <Link
                  href="/admin/academy/new"
                  style={{
                    ...ui.primaryButton,
                    background: '#1D4ED8',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  + ვიდეოს დამატება
                </Link>
              </div>
            </div>
          </div>

          {/* Optional actions bar below the header */}
          {actions ? (
            <div
              style={{
                padding: '12px 22px',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                background: '#F8FAFF',
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

// ---------------------------------------------------------------------------
// VideoTypeBadge – coloured pill for each category
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> =
  {
    training:       { bg: '#EFF6FF', color: '#1D4ED8', label: 'ტრენინგი' },
    setup:          { bg: '#F0FDF4', color: '#15803D', label: 'გამართვა' },
    troubleshooting:{ bg: '#FFF7ED', color: '#C2410C', label: 'პრობლემის გადაჭრა' },
    demo:           { bg: '#F5F3FF', color: '#7C3AED', label: 'დემო' },
    marketing:      { bg: '#FFF1F2', color: '#BE123C', label: 'მარკეტინგი' },
  }

export function VideoTypeBadge({ type }: { type: string }) {
  const t = TYPE_BADGE[type] ?? { bg: '#F3F4F6', color: '#374151', label: type }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        background: t.bg,
        color: t.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {t.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ActiveBadge – simple green / grey pill
// ---------------------------------------------------------------------------

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        background: active ? '#F0FDF4' : '#F3F4F6',
        color: active ? '#15803D' : '#6B7280',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {active ? 'აქტიური' : 'არააქტიური'}
    </span>
  )
}
