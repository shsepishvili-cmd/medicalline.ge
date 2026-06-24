'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { calcVatAmount, formatCurrency } from '@/app/lib/contract'
import { CONTRACT_STATUS_LABELS, type PublicContractSummary } from '@/app/lib/contract-types'

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ka-GE')
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 12, color: '#6B7280' }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 15, color: '#111827', fontWeight: 650, wordBreak: 'break-word' }}>{value || '-'}</div>
    </div>
  )
}

function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '')
}

export default function PublicContractAcceptPage() {
  const params = useParams<{ token: string }>()
  const [token, setToken] = useState('')
  const [contract, setContract] = useState<PublicContractSummary | null>(null)
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
    fetch(`/api/public-contracts/${resolvedToken}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'დოკუმენტი ვერ ჩაიტვირთა.')
        setContract(data.contract as PublicContractSummary)
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
      const response = await fetch(`/api/public-contracts/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpCode,
          acceptTerms,
          identitySuffix,
          acceptorName,
          phone: contract?.phone,
          email: contract?.email,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'დადასტურება ვერ შესრულდა.')

      const now = new Date().toISOString()
      setSuccess('ხელშეკრულება წარმატებით დადასტურდა.')
      setContract((current) => current ? { ...current, status: 'signed', signed_at: now, accepted_at: now, agreed_to_terms: true } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'დადასტურება ვერ შესრულდა.')
    } finally {
      setSaving(false)
    }
  }

  const isCompleted = contract?.status === 'signed' || contract?.status === 'paid'
  const fin = useMemo(() => (
    contract
      ? calcVatAmount(Number(contract.unit_price || 0), Number(contract.quantity || 1), Number(contract.vat_rate || 0), contract.vat_included)
      : null
  ), [contract])
  const requiresIdentitySuffix = onlyDigits(contract?.customer_id_number).length >= 4

  if (loading) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F3F4F6' }}><p style={{ color: '#4B5563' }}>დოკუმენტი იტვირთება...</p></main>
  }

  if (error && !contract) {
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

  if (!contract || !fin) return null

  return (
    <main style={{ minHeight: '100vh', background: '#F3F4F6', paddingBottom: isPhone ? 24 : 270 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FFFFFFE6', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: isPhone ? '12px 12px' : '14px 16px', display: 'flex', alignItems: isPhone ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Medical Line Georgia</div>
            <div style={{ fontSize: isPhone ? 16 : 18, color: '#111827', fontWeight: 800 }}>ხელშეკრულების დადასტურება</div>
          </div>
          <span style={{ borderRadius: 999, padding: '6px 10px', background: isCompleted ? '#DCFCE7' : '#DBEAFE', color: isCompleted ? '#166534' : '#1D4ED8', fontSize: 12, fontWeight: 800 }}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </span>
        </div>
      </header>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: isPhone ? '10px 8px 0' : '18px 14px 0' }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 35px rgba(15,23,42,0.08)' }}>
          <div style={{ padding: isPhone ? 14 : 18, borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>ხელშეკრულება: {contract.contract_number}</div>
            <h1 style={{ margin: '8px 0 0', fontSize: isPhone ? 18 : 22, lineHeight: 1.25, color: '#111827' }}>{contract.product_name}</h1>
            <p style={{ margin: '8px 0 0', color: '#4B5563', lineHeight: 1.6, fontSize: 14 }}>
              გადაამოწმეთ პირობები, ჩამოტვირთეთ სრული PDF საჭიროების შემთხვევაში და ბოლოს დაადასტურეთ ქვედა ბლოკში.
            </p>
          </div>

          <div style={{ padding: contract.contract_body ? (isPhone ? '16px 12px 18px' : '22px 18px 24px') : (isPhone ? '4px 14px 14px' : '6px 18px 18px') }}>
            {contract.contract_body ? (
              <article style={{ maxWidth: 680, margin: '0 auto', color: '#111827', fontFamily: 'Sylfaen, Georgia, serif' }}>
                {contract.contract_body.split('\n').map((line, index) => {
                  const isHeading = index < 5
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
            ) : (
              <>
                <DetailRow label="იურიდიული პირი / კლიენტი" value={contract.clinic_name || contract.customer_name || '-'} />
                <DetailRow label="საიდენტიფიკაციო კოდი" value={contract.customer_id_number || '-'} />
                <DetailRow label="საკონტაქტო პირი" value={contract.customer_name || '-'} />
                <DetailRow label="ტელეფონი" value={contract.phone || '-'} />
                <DetailRow label="ელფოსტა" value={contract.email || '-'} />
                <DetailRow label="თარიღი" value={fmtDate(contract.contract_date)} />
                <DetailRow label="ბრენდი / მოდელი" value={`${contract.brand}${contract.model ? ` / ${contract.model}` : ''}`} />
                <DetailRow label="სერიული ნომერი" value={contract.serial_number || '-'} />
                <DetailRow label="რაოდენობა და ფასი" value={`${contract.quantity} x ${formatCurrency(Number(contract.unit_price || 0), contract.currency)}`} />
                <DetailRow label="ჯამური თანხა" value={formatCurrency(fin.gross, contract.currency)} />
                <DetailRow label="გადახდის პირობა" value={contract.payment_terms || '-'} />
                <DetailRow label="მიწოდების მისამართი" value={contract.delivery_address || '-'} />
                <DetailRow label="გარანტია" value={`${contract.warranty_months || 0} თვე`} />
                {contract.special_terms ? <DetailRow label="დამატებითი პირობები" value={contract.special_terms} /> : null}
              </>
            )}
          </div>

          <div style={{ padding: 18, display: 'grid', gap: 10, background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
            <a href={`/api/public-contracts/${token}/pdf`} style={{ display: 'inline-flex', justifyContent: 'center', padding: '13px 16px', borderRadius: 12, background: '#111827', color: '#fff', textDecoration: 'none', fontWeight: 800 }}>
              ხელშეკრულების PDF ჩამოტვირთვა
            </a>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
              გაგზავნა: <strong>{fmtDate(contract.sent_at)}</strong> · ნახვა: <strong>{fmtDate(contract.viewed_at)}</strong> · ვერსია: <strong>{contract.document_version}</strong>
            </div>
          </div>
        </div>
      </section>

      <section style={{ position: isPhone ? 'static' : 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, margin: isPhone ? '14px 8px 0' : 0, background: '#FFFFFFF2', backdropFilter: 'blur(16px)', border: isPhone ? '1px solid #E5E7EB' : undefined, borderTop: '1px solid #E5E7EB', borderRadius: isPhone ? 18 : 0, boxShadow: isPhone ? '0 12px 35px rgba(15,23,42,0.08)' : '0 -16px 35px rgba(15,23,42,0.12)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: isPhone ? '12px' : '14px 14px 18px', display: 'grid', gap: 10 }}>
          {success ? <div style={{ padding: 11, borderRadius: 12, background: '#DCFCE7', color: '#166534', fontSize: 14 }}>{success}</div> : null}
          {error && contract ? <div style={{ padding: 11, borderRadius: 12, background: '#FEF2F2', color: '#991B1B', fontSize: 14 }}>{error}</div> : null}

          <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <input value={acceptorName} onChange={(event) => setAcceptorName(event.target.value)} disabled={Boolean(isCompleted)} placeholder="დამადასტურებელი პირი" style={{ minWidth: 0, borderRadius: 12, border: '1px solid #D1D5DB', padding: '12px', fontSize: 14, boxSizing: 'border-box' }} />
            <input value={identitySuffix} onChange={(event) => setIdentitySuffix(event.target.value.replace(/\D/g, '').slice(0, 4))} disabled={Boolean(isCompleted)} inputMode="numeric" placeholder={requiresIdentitySuffix ? 'ს/კ ბოლო 4 ციფრი' : 'ს/კ ბოლო 4 ციფრი (თუ არის)'} style={{ minWidth: 0, borderRadius: 12, border: '1px solid #D1D5DB', padding: '12px', fontSize: 14, boxSizing: 'border-box', letterSpacing: 1 }} />
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#374151', lineHeight: 1.45 }}>
            <input type="checkbox" checked={acceptTerms || Boolean(isCompleted)} onChange={(event) => setAcceptTerms(event.target.checked)} disabled={Boolean(isCompleted)} style={{ marginTop: 2 }} />
            <span>ვეთანხმები ხელშეკრულების პირობებს და ვადასტურებ, რომ უფლებამოსილი ვარ იურიდიული პირის სახელით დადასტურებაზე.</span>
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
