'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/app/lib/supabase'
import { WARRANTY_STATUS_LABELS, WARRANTY_STATUS_TONES, formatDate } from '@/app/lib/warranty'
import { isInternalWarrantyRole } from '@/app/lib/warranty'
import type { ProfileSummary, WarrantyStatus } from '@/app/lib/warranty-types'

export const colors = {
  green: '#085041',
  greenSoft: '#E1F5EE',
  blueSoft: '#E6F1FB',
  amberSoft: '#FAEEDA',
  border: 'rgba(8, 80, 65, 0.12)',
  canvas: '#F5F5F0',
  text: '#18212F',
  muted: '#6B7280',
}

export const ui = {
  page: {
    minHeight: '100vh',
    background: colors.canvas,
    padding: '24px 18px 40px',
  } as const,
  wrap: {
    maxWidth: 1240,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  } as const,
  card: {
    background: '#fff',
    borderRadius: 20,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 18px 50px rgba(8, 80, 65, 0.06)',
  } as const,
  panel: {
    background: '#fff',
    borderRadius: 18,
    border: `1px solid ${colors.border}`,
    padding: 18,
  } as const,
  input: {
    width: '100%',
    borderRadius: 12,
    border: '1px solid rgba(15, 23, 42, 0.14)',
    padding: '11px 12px',
    fontSize: 14,
    color: colors.text,
    background: '#fff',
    boxSizing: 'border-box',
  } as const,
  textarea: {
    width: '100%',
    minHeight: 110,
    borderRadius: 12,
    border: '1px solid rgba(15, 23, 42, 0.14)',
    padding: '11px 12px',
    fontSize: 14,
    color: colors.text,
    background: '#fff',
    boxSizing: 'border-box',
    resize: 'vertical' as const,
  } as const,
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.muted,
    marginBottom: 6,
    display: 'block',
  } as const,
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 16px',
    borderRadius: 12,
    border: 'none',
    background: colors.green,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  } as const,
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 16px',
    borderRadius: 12,
    border: '1px solid rgba(8, 80, 65, 0.18)',
    background: '#fff',
    color: colors.green,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  } as const,
}

type AuthState = {
  loading: boolean
  error: string | null
  profile: ProfileSummary | null
  accessToken: string | null
}

export function useWarrantyAdminGate(): AuthState {
  const [state, setState] = useState<AuthState>({
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
            error: 'Warranty მოდული ხელმისაწვდომია მხოლოდ ავტორიზებული admin/staff მომხმარებლებისთვის.',
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

      if (profile.status !== 'active' || !isInternalWarrantyRole(profile.role)) {
        setState({
          loading: false,
          error: 'Warranty მოდულზე წვდომა ამ ანგარიშს არ აქვს.',
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

export function WarrantyAdminShell({
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
              <p style={{ margin: 0, fontSize: 12, opacity: 0.88 }}>Admin / Warranty</p>
              <h1 style={{ margin: '8px 0 6px', fontSize: 30, fontWeight: 700 }}>{title}</h1>
              <p style={{ margin: 0, maxWidth: 720, fontSize: 14, lineHeight: 1.55, color: '#D6F2E8' }}>{subtitle}</p>
            </div>
            <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#9FE1CB' }}>Signed in as</p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600 }}>{profile.full_name || 'Medical Line Staff'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#C6ECDD' }}>{profile.role} · {profile.clinic_name || 'Medical Line Georgia'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Link href="/admin" style={ui.secondaryButton}>Admin</Link>
                <Link href="/admin/warranty" style={ui.secondaryButton}>Warranty List</Link>
                <Link href="/admin/warranty/new" style={ui.primaryButton}>New Warranty</Link>
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

export function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  const tone = WARRANTY_STATUS_TONES[status]
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
      {WARRANTY_STATUS_LABELS[status] || status}
    </span>
  )
}

export function InfoStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ ...ui.panel, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: colors.green }}>{value}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.muted }}>{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ ...ui.panel, textAlign: 'center', padding: '34px 20px' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</p>
      <p style={{ margin: '10px auto 0', maxWidth: 520, fontSize: 14, color: colors.muted, lineHeight: 1.6 }}>{description}</p>
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  )
}

export function AuthBlockedView({ message }: { message: string }) {
  return (
    <div style={ui.page}>
      <div style={{ ...ui.wrap, maxWidth: 720 }}>
        <div style={{ ...ui.panel, padding: 28, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.text }}>Warranty Module</p>
          <p style={{ margin: '10px auto 0', maxWidth: 520, fontSize: 14, color: colors.muted, lineHeight: 1.7 }}>{message}</p>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/admin" style={ui.primaryButton}>Go to Admin</Link>
            <Link href="/" style={ui.secondaryButton}>Homepage</Link>
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

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={ui.label}>{label}</span>
      {children}
    </label>
  )
}

export function formatAttachmentLabel(fileName: string, fileType?: string | null) {
  if ((fileType || '').startsWith('image/')) return `🖼 ${fileName}`
  if ((fileType || '').startsWith('video/')) return `🎥 ${fileName}`
  if ((fileType || '').includes('pdf')) return `📄 ${fileName}`
  return fileName
}

export async function requestSignedFileUrl(
  accessToken: string,
  body: { kind: 'pdf' | 'attachment'; warrantyId?: string; attachmentId?: string },
) {
  const response = await fetch('/api/warranty/files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.error || 'ფაილი ვერ გაიხსნა.')
  }

  return payload as { url: string; fileName?: string }
}

export function WarrantySummaryCard({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 14,
        border: '1px solid rgba(15, 23, 42, 0.08)',
        background: '#FAFAF8',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>{label}</p>
      <div style={{ marginTop: 5, fontSize: 14, fontWeight: 600, color: colors.text }}>{value}</div>
    </div>
  )
}

export function WarrantyQrCard({ verifyUrl }: { verifyUrl: string }) {
  const [qrSrc, setQrSrc] = useState('')

  useEffect(() => {
    let active = true

    QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0B3F34',
        light: '#FFFFFF',
      },
    }).then((src: string) => {
      if (active) setQrSrc(src)
    }).catch(() => {
      if (active) setQrSrc('')
    })

    return () => {
      active = false
    }
  }, [verifyUrl])

  return (
    <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center' }}>
      {qrSrc ? (
        <img src={qrSrc} alt="Warranty QR code" style={{ width: 190, height: 190, borderRadius: 16, border: '1px solid rgba(15, 23, 42, 0.08)' }} />
      ) : (
        <div style={{ width: 190, height: 190, borderRadius: 16, background: '#F3F4F6' }} />
      )}
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>QR Verification</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
          QR კოდი ხსნის verify გვერდს ამ გარანტიისთვის.
        </p>
      </div>
      <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ ...ui.secondaryButton, width: '100%' }}>
        Open Verify Page
      </a>
    </div>
  )
}

export function WarrantyRowMeta({
  warrantyNumber,
  serialNumber,
  clinic,
  customer,
  endDate,
}: {
  warrantyNumber: string
  serialNumber: string
  clinic?: string | null
  customer?: string | null
  endDate?: string | null
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{warrantyNumber}</p>
      <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>
        SN: {serialNumber} · {clinic || 'კლინიკა მითითებული არ არის'} · {customer || 'მყიდველი მითითებული არ არის'}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>Warranty end: {formatDate(endDate)}</p>
    </div>
  )
}
