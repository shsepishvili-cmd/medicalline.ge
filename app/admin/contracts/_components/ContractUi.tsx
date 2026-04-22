'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONES } from '@/app/lib/contract-types'
import { isInternalWarrantyRole } from '@/app/lib/warranty'
import type { ContractStatus } from '@/app/lib/contract-types'
import type { ProfileSummary } from '@/app/lib/warranty-types'

export const colors = {
  green: '#085041',
  greenSoft: '#E1F5EE',
  border: 'rgba(8, 80, 65, 0.12)',
  canvas: '#F5F5F0',
  text: '#18212F',
  muted: '#6B7280',
}

export const ui = {
  page: { minHeight: '100vh', background: colors.canvas, padding: '24px 18px 40px' } as const,
  wrap: { maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 } as const,
  card: { background: '#fff', borderRadius: 20, border: `1px solid ${colors.border}`, boxShadow: '0 18px 50px rgba(8,80,65,0.06)' } as const,
  panel: { background: '#fff', borderRadius: 18, border: `1px solid ${colors.border}`, padding: 18 } as const,
  input: { width: '100%', borderRadius: 12, border: '1px solid rgba(15,23,42,0.14)', padding: '11px 12px', fontSize: 14, color: colors.text, background: '#fff', boxSizing: 'border-box' } as const,
  textarea: { width: '100%', minHeight: 90, borderRadius: 12, border: '1px solid rgba(15,23,42,0.14)', padding: '11px 12px', fontSize: 14, color: colors.text, background: '#fff', boxSizing: 'border-box', resize: 'vertical' as const } as const,
  label: { fontSize: 12, fontWeight: 600, color: colors.muted, marginBottom: 6, display: 'block' } as const,
  primaryButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, border: 'none', background: colors.green, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' } as const,
  secondaryButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, border: '1px solid rgba(8,80,65,0.18)', background: '#fff', color: colors.green, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' } as const,
}

type AuthState = { loading: boolean; error: string | null; profile: ProfileSummary | null; accessToken: string | null }

export function useContractAdminGate(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, error: null, profile: null, accessToken: null })

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session

      if (!session?.user?.id || !session.access_token) {
        if (mounted) setState({ loading: false, error: 'ხელშეკრულებების მოდული ხელმისაწვდომია მხოლოდ ავტორიზებული staff-ისთვის.', profile: null, accessToken: null })
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, clinic_name, phone, role, status')
        .eq('id', session.user.id)
        .single()

      if (!mounted) return

      if (error || !profile || profile.status !== 'active' || !isInternalWarrantyRole(profile.role)) {
        setState({ loading: false, error: 'ხელშეკრულებების მოდულზე წვდომა ამ ანგარიშს არ აქვს.', profile: null, accessToken: null })
        return
      }

      setState({ loading: false, error: null, profile, accessToken: session.access_token })
    }

    load()
    return () => { mounted = false }
  }, [])

  return state
}

export function ContractAdminShell({
  title, subtitle, profile, actions, children,
}: {
  title: string; subtitle: string; profile: ProfileSummary; actions?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={ui.page}>
      <div style={ui.wrap}>
        <div style={{ ...ui.card, overflow: 'hidden' }}>
          <div style={{
            padding: 22,
            background: 'linear-gradient(135deg, rgba(12,68,124,1) 0%, rgba(17,90,166,1) 58%, rgba(22,115,210,1) 100%)',
            color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.88 }}>ადმინი / ხელშეკრულებები</p>
              <h1 style={{ margin: '8px 0 6px', fontSize: 30, fontWeight: 700 }}>{title}</h1>
              <p style={{ margin: 0, maxWidth: 720, fontSize: 14, lineHeight: 1.55, color: '#C6DEF8' }}>{subtitle}</p>
            </div>
            <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#9EC8F5' }}>შესულია როგორც</p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600 }}>{profile.full_name || 'Medical Line თანამშრომელი'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B8D9F7' }}>{profile.role} · {profile.clinic_name || 'Medical Line Georgia'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Link href="/admin" style={ui.secondaryButton}>ადმინი</Link>
                <Link href="/admin/warranty" style={ui.secondaryButton}>გარანტიები</Link>
                <Link href="/admin/contracts" style={ui.secondaryButton}>ხელშეკრულებები</Link>
                <Link href="/admin/contracts/new" style={ui.primaryButton}>ახალი ხელშეკრულება</Link>
              </div>
            </div>
          </div>
          {actions ? (
            <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.14)', background: '#F9FCFB', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const tone = CONTRACT_STATUS_TONES[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: tone.background, color: tone.color, fontSize: 12, fontWeight: 700 }}>
      {CONTRACT_STATUS_LABELS[status] || status}
    </span>
  )
}

export function InfoStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ ...ui.panel, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0C447C' }}>{value}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.muted }}>{label}</p>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={ui.label}>{label}</span>
      {children}
    </label>
  )
}

export function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(15,23,42,0.08)', background: '#FAFAF8' }}>
      <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>{label}</p>
      <div style={{ marginTop: 5, fontSize: 14, fontWeight: 600, color: colors.text }}>{value}</div>
    </div>
  )
}

export function AuthBlockedView({ message }: { message: string }) {
  return (
    <div style={ui.page}>
      <div style={{ ...ui.wrap, maxWidth: 720 }}>
        <div style={{ ...ui.panel, padding: 28, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.text }}>ხელშეკრულებების მოდული</p>
          <p style={{ margin: '10px auto 0', maxWidth: 520, fontSize: 14, color: colors.muted, lineHeight: 1.7 }}>{message}</p>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/admin" style={ui.primaryButton}>ადმინში გადასვლა</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoadingView({ label }: { label: string }) {
  return (
    <div style={ui.page}>
      <div style={{ ...ui.wrap, maxWidth: 720 }}>
        <div style={{ ...ui.panel, textAlign: 'center', padding: 28 }}>
          <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>{label}</p>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div style={{ ...ui.panel, textAlign: 'center', padding: '34px 20px' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</p>
      <p style={{ margin: '10px auto 0', maxWidth: 520, fontSize: 14, color: colors.muted, lineHeight: 1.6 }}>{description}</p>
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  )
}

export async function requestContractPdfUrl(accessToken: string, contractId: string): Promise<string> {
  const res = await fetch(`/api/contracts/${contractId}/pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'PDF გენერაცია ვერ მოხერხდა.')
  return data.url as string
}
