'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, CheckCircle2, ClipboardCheck, History, LineChart, Loader2, MessageSquareText, PackageCheck, PhoneCall, PhoneOff, Power, RefreshCw, Target, WalletCards } from 'lucide-react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { AuthBlockedView, LoadingView, useWarrantyAdminGate } from '@/app/admin/warranty/_components/WarrantyUi'

type OperatorStatus = {
  calls_enabled: boolean
  disabled_reason: string | null
  updated_at: string | null
}

const sections = [
  { icon: PhoneCall, title: 'AI Calls', href: '/admin/ai-calls', description: 'ზარის დავალებები და ისტორია' },
  { icon: Target, title: 'Campaigns', href: '/admin/ai-campaigns', description: 'დიალოგის მიზნები და შეზღუდვები' },
  { icon: Brain, title: 'Knowledge Base', href: '/admin/ai-knowledge', description: 'დამტკიცებული კომპანიის ცოდნა' },
  { icon: ClipboardCheck, title: 'Test Lab', href: '/admin/ai-test-lab', description: 'ლოკალური retrieval ტესტები' },
  { icon: MessageSquareText, title: 'AI Training', href: '/admin/ai-training', description: 'სცენარები და იდეალური პასუხები' },
  { icon: CheckCircle2, title: 'Corrections', href: '/admin/ai-corrections', description: 'ადმინისტრატორის შესწორებები' },
  { icon: PackageCheck, title: 'AI Orders', href: '/admin/ai-orders', description: 'AI voice agent შეკვეთები' },
  { icon: History, title: 'Follow-ups', href: '/admin/ai-followups', description: 'დაგეგმილი follow-up-ები' },
  { icon: WalletCards, title: 'Debt Reminders', href: '/admin/ai-debt-reminders', description: 'დავალიანების შეხსენებების მართვა' },
  { icon: LineChart, title: 'AI Analytics', href: '/admin/ai-analytics', description: 'ზარები, შედეგები და corrections' },
  { icon: ClipboardCheck, title: 'AI Evaluation', href: '/admin/ai-evaluation', description: 'AI ქცევის ტესტები და შეფასება' },
] as const

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(8,80,65,.12)',
  borderRadius: 12,
  boxShadow: '0 16px 40px rgba(8,80,65,.05)',
}

function formatStatusDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ka-GE') : 'ჯერ არ შეცვლილა'
}

export default function AiCenterPage() {
  const { loading, error, profile } = useWarrantyAdminGate()
  const [status, setStatus] = useState<OperatorStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadStatus() {
    setStatusError('')
    const { data, error: rpcError } = await supabase.rpc('get_ai_operator_status')
    if (rpcError) {
      setStatusError(rpcError.message)
      return
    }
    const nextStatus = Array.isArray(data) ? data[0] : data
    setStatus(nextStatus || null)
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return
    void loadStatus()
    const channel = supabase
      .channel('ai-operator-settings-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_operator_settings' }, () => void loadStatus())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  async function setCallsEnabled(enabled: boolean) {
    setSaving(true)
    setStatusError('')
    const { data, error: rpcError } = await supabase.rpc('set_ai_operator_enabled', {
      enabled,
      reason: enabled ? null : 'Manual pause from admin panel',
    })
    setSaving(false)
    if (rpcError) {
      setStatusError(rpcError.message)
      return
    }
    const nextStatus = Array.isArray(data) ? data[0] : data
    setStatus(nextStatus || null)
  }

  if (loading) return <LoadingView label="AI Operator იტვირთება..." />
  if (error || !profile || profile.role !== 'admin') return <AuthBlockedView message={error || 'AI Operator-ზე წვდომა მხოლოდ admin-ს აქვს.'} />

  const callsEnabled = status?.calls_enabled === true

  return (
    <main style={{ minHeight: '100vh', background: '#F5F5F0', padding: '28px 18px 52px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Link href="/admin" style={{ color: '#085041', fontSize: 13 }}>← Admin Panel</Link>

        <header style={{ margin: '14px 0 22px' }}>
          <h1 style={{ margin: 0, color: '#18212F', fontSize: 32 }}>AI Operator</h1>
          <p style={{ margin: '8px 0 0', color: '#52606D' }}>Medical Line-ის AI ზარების, ცოდნის და სწავლების მართვის ცენტრი</p>
        </header>

        <section style={{ ...cardStyle, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: callsEnabled ? '#E1F5EE' : '#FEE4E2', color: callsEnabled ? '#085041' : '#B42318', display: 'grid', placeItems: 'center' }}>
                {callsEnabled ? <PhoneCall size={24} /> : <PhoneOff size={24} />}
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#18212F', fontSize: 20 }}>{callsEnabled ? 'AI ასისტენტი ჩართულია' : 'AI ასისტენტი გამორთულია'}</h2>
                <p style={{ margin: '5px 0 0', color: '#6B7280', fontSize: 13 }}>
                  {callsEnabled ? 'Worker იღებს ახალ queued ზარებს.' : 'ნომერი თავისუფალია ჩვეულებრივი ზარებისთვის; worker ახალ ზარებს არ აიღებს.'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void loadStatus()}
                title="სტატუსის განახლება"
                style={{ border: '1px solid #CBD5E1', borderRadius: 10, width: 42, height: 42, background: '#fff', color: '#18212F', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <RefreshCw size={18} />
              </button>
              <button
                type="button"
                disabled={saving || !status}
                onClick={() => void setCallsEnabled(!callsEnabled)}
                style={{ border: 0, borderRadius: 10, padding: '11px 16px', background: callsEnabled ? '#B42318' : '#085041', color: '#fff', fontWeight: 700, cursor: saving || !status ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {saving ? <Loader2 size={18} /> : <Power size={18} />}
                {callsEnabled ? 'გამორთვა' : 'ჩართვა'}
              </button>
            </div>
          </div>
          <p style={{ margin: '14px 0 0', color: '#6B7280', fontSize: 12 }}>ბოლო ცვლილება: {formatStatusDate(status?.updated_at)}</p>
          {status?.disabled_reason ? <p style={{ margin: '6px 0 0', color: '#8A4B08', fontSize: 12 }}>მიზეზი: {status.disabled_reason}</p> : null}
          {statusError ? <p style={{ margin: '10px 0 0', color: '#B42318', fontSize: 13 }}>{statusError}</p> : null}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {sections.map(({ icon: Icon, title, href, description }) => (
            <Link key={title} href={href} style={{ ...cardStyle, padding: 18, textDecoration: 'none', color: '#18212F', minHeight: 108 }}>
              <Icon size={24} color="#085041" />
              <strong style={{ display: 'block', marginTop: 10 }}>{title}</strong>
              <span style={{ display: 'block', color: '#6B7280', fontSize: 13, marginTop: 5 }}>{description}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
