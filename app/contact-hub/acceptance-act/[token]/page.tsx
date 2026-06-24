'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ACCEPTANCE_ACT_STATUS_LABELS, type PublicAcceptanceActSummary } from '@/app/lib/acceptance-act-types'

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ka-GE')
}

function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '')
}

export default function PublicAcceptanceActPage() {
  const params = useParams<{ token: string }>()
  const [token, setToken] = useState('')
  const [act, setAct] = useState<PublicAcceptanceActSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [identitySuffix, setIdentitySuffix] = useState('')
  const [acceptorName, setAcceptorName] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [isPhone, setIsPhone] = useState(false)

  useEffect(() => {
    const resolvedToken = typeof params?.token === 'string' ? params.token : ''
    if (!resolvedToken) return

    setToken(resolvedToken)
    fetch(`/api/public-acceptance-acts/${resolvedToken}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'დოკუმენტი ვერ ჩაიტვირთა.')
        setAct(data.act as PublicAcceptanceActSummary)
        setError('')
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'დოკუმენტი ვერ ჩაიტვირთა.')
      })
      .finally(() => setLoading(false))
  }, [params])

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 640)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function accept() {
    if (!token) return
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/public-acceptance-acts/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpCode,
          acceptTerms,
          identitySuffix,
          acceptorName,
          phone: act?.phone,
          email: act?.email,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'დადასტურება ვერ შესრულდა.')

      const now = new Date().toISOString()
      setSuccess('მიღება-ჩაბარების აქტი წარმატებით დადასტურდა.')
      setAct((current) => current ? { ...current, status: 'accepted', accepted_at: now, accepted_by: acceptorName } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'დადასტურება ვერ შესრულდა.')
    } finally {
      setSaving(false)
    }
  }

  const isCompleted = act?.status === 'accepted'
  const requiresIdentitySuffix = onlyDigits(act?.customer_id_number).length >= 4

  if (loading) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F3F4F6' }}><p style={{ color: '#4B5563' }}>დოკუმენტი იტვირთება...</p></main>
  }

  if (error && !act) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F3F4F6', padding: 20 }}>
        <div style={{ maxWidth: 520, background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #E5E7EB', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24, color: '#111827' }}>დოკუმენტი ვერ მოიძებნა</h1>
          <p style={{ margin: '12px 0 0', color: '#6B7280', lineHeight: 1.7 }}>{error}</p>
          <Link href="/" style={{ marginTop: 18, display: 'inline-flex', padding: '12px 16px', borderRadius: 12, background: '#111827', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>Medical Line-ზე დაბრუნება</Link>
        </div>
      </main>
    )
  }

  if (!act) return null

  return (
    <main style={{ minHeight: '100vh', background: '#F3F4F6', paddingBottom: isPhone ? 24 : 260 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FFFFFFE6', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: isPhone ? '12px 12px' : '14px 16px', display: 'flex', alignItems: isPhone ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Medical Line Georgia</div>
            <div style={{ fontSize: isPhone ? 16 : 18, color: '#111827', fontWeight: 800 }}>მიღება-ჩაბარების აქტის დადასტურება</div>
          </div>
          <span style={{ borderRadius: 999, padding: '6px 10px', background: isCompleted ? '#DCFCE7' : '#DBEAFE', color: isCompleted ? '#166534' : '#1D4ED8', fontSize: 12, fontWeight: 800 }}>
            {ACCEPTANCE_ACT_STATUS_LABELS[act.status]}
          </span>
        </div>
      </header>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: isPhone ? '10px 8px 0' : '18px 14px 0' }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 35px rgba(15,23,42,0.08)' }}>
          <div style={{ padding: isPhone ? 14 : 18, borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>აქტი: {act.act_number} · ხელშეკრულება: {act.contract_number}</div>
            <h1 style={{ margin: '8px 0 0', fontSize: isPhone ? 18 : 22, lineHeight: 1.25, color: '#111827' }}>{act.product_name}</h1>
            <p style={{ margin: '8px 0 0', color: '#4B5563', lineHeight: 1.6, fontSize: 14 }}>
              გადახედეთ მიღება-ჩაბარების აქტს და დაადასტურეთ SMS კოდით ქვედა ბლოკში.
            </p>
          </div>

          <div style={{ padding: isPhone ? '16px 12px 18px' : '22px 18px 24px' }}>
            <article style={{ maxWidth: 680, margin: '0 auto', color: '#111827', fontFamily: 'Sylfaen, Georgia, serif' }}>
              {(act.act_body || '').split('\n').map((line, index) => {
                const isHeading = index < 3
                return (
                  <p key={`${index}-${line}`} style={{
                    margin: line.trim() ? (isHeading ? '0 0 4px' : '0 0 9px') : '0 0 12px',
                    minHeight: line.trim() ? undefined : 6,
                    fontSize: isPhone ? (isHeading ? 14 : 13) : (isHeading ? 15 : 14),
                    lineHeight: isHeading ? 1.35 : 1.62,
                    fontWeight: isHeading ? 800 : 400,
                    textAlign: isHeading ? 'center' : 'left',
                  }}>
                    {line}
                  </p>
                )
              })}
            </article>
          </div>

          <div style={{ padding: 18, display: 'grid', gap: 8, background: '#F9FAFB', borderTop: '1px solid #E5E7EB', fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
            <div>აქტის თარიღი: <strong>{fmtDate(act.act_date)}</strong> · გაგზავნა: <strong>{fmtDate(act.sent_at)}</strong> · ნახვა: <strong>{fmtDate(act.viewed_at)}</strong></div>
            <div>შემძენი: <strong>{act.clinic_name || act.customer_name || '-'}</strong> · ს/კ: <strong>{act.customer_id_number || '-'}</strong></div>
          </div>
        </div>
      </section>

      <section style={{ position: isPhone ? 'static' : 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, margin: isPhone ? '14px 8px 0' : 0, background: '#FFFFFFF2', backdropFilter: 'blur(16px)', border: isPhone ? '1px solid #E5E7EB' : undefined, borderTop: '1px solid #E5E7EB', borderRadius: isPhone ? 18 : 0, boxShadow: isPhone ? '0 12px 35px rgba(15,23,42,0.08)' : '0 -16px 35px rgba(15,23,42,0.12)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: isPhone ? '12px' : '14px 14px 18px', display: 'grid', gap: 10 }}>
          {success ? <div style={{ padding: 11, borderRadius: 12, background: '#DCFCE7', color: '#166534', fontSize: 14 }}>{success}</div> : null}
          {error && act ? <div style={{ padding: 11, borderRadius: 12, background: '#FEF2F2', color: '#991B1B', fontSize: 14 }}>{error}</div> : null}

          <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <input value={acceptorName} onChange={(event) => setAcceptorName(event.target.value)} disabled={Boolean(isCompleted)} placeholder="დამადასტურებელი პირი" style={{ minWidth: 0, borderRadius: 12, border: '1px solid #D1D5DB', padding: '12px', fontSize: 14, boxSizing: 'border-box' }} />
            <input value={identitySuffix} onChange={(event) => setIdentitySuffix(event.target.value.replace(/\D/g, '').slice(0, 4))} disabled={Boolean(isCompleted)} inputMode="numeric" placeholder={requiresIdentitySuffix ? 'ს/კ ბოლო 4 ციფრი' : 'ს/კ ბოლო 4 ციფრი (თუ არის)'} style={{ minWidth: 0, borderRadius: 12, border: '1px solid #D1D5DB', padding: '12px', fontSize: 14, boxSizing: 'border-box', letterSpacing: 1 }} />
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#374151', lineHeight: 1.45 }}>
            <input type="checkbox" checked={acceptTerms || Boolean(isCompleted)} onChange={(event) => setAcceptTerms(event.target.checked)} disabled={Boolean(isCompleted)} style={{ marginTop: 2 }} />
            <span>ვეთანხმები მიღება-ჩაბარების აქტს და ვადასტურებ, რომ უფლებამოსილი ვარ იურიდიული პირის სახელით დადასტურებაზე.</span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'minmax(0, 1fr) minmax(140px, 190px)', gap: 10 }}>
            <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} disabled={Boolean(isCompleted)} inputMode="numeric" placeholder="SMS კოდი" style={{ minWidth: 0, borderRadius: 12, border: '1px solid #D1D5DB', padding: '13px 12px', fontSize: 16, boxSizing: 'border-box', letterSpacing: 2 }} />
            <button type="button" onClick={accept} disabled={saving || Boolean(isCompleted)} style={{ border: 'none', borderRadius: 12, padding: '13px 14px', background: saving || isCompleted ? '#9CA3AF' : '#0F766E', color: '#fff', fontWeight: 900, cursor: saving ? 'wait' : 'pointer' }}>
              {isCompleted ? 'დადასტურებულია' : saving ? '...' : 'დადასტურება'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
