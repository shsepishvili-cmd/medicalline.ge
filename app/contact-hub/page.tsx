'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONES, type ContractRecord, type ContractStatus } from '@/app/lib/contract-types'
import { buildPublicContractUrl, formatCurrency } from '@/app/lib/contract'
import { supabase } from '@/app/lib/supabase'
import { colors, EmptyState, Field, LoadingView, requestContractPdfUrl, ui, useContractAdminGate } from '@/app/admin/contracts/_components/ContractUi'

type SharePayload = {
  publicUrl: string
  otpCode: string
  otpExpiresAt: string
  whatsappUrl: string | null
  smsText: string
  emailSubject: string
  emailBody: string
  pdfUrl: string
  status: string
  smsSent?: boolean
  smsProvider?: string | null
  smsMessageId?: string | number | null
}

type StepKey = 'draft' | 'sent' | 'viewed' | 'signed' | 'paid'

const FLOW_STEPS: Array<{ key: StepKey; label: string }> = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'signed', label: 'Signed' },
  { key: 'paid', label: 'Paid' },
]

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ka-GE')
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const tone = CONTRACT_STATUS_TONES[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', background: tone.background, color: tone.color, fontSize: 12, fontWeight: 700 }}>
      {CONTRACT_STATUS_LABELS[status]}
    </span>
  )
}

function getStepState(contract: ContractRecord, step: StepKey) {
  if (step === 'draft') return true
  if (step === 'sent') return Boolean(contract.sent_at || contract.status !== 'draft')
  if (step === 'viewed') return Boolean(contract.viewed_at || contract.status === 'viewed' || contract.status === 'accepted' || contract.status === 'signed' || contract.status === 'paid')
  if (step === 'signed') return Boolean(contract.signed_at || contract.status === 'signed' || contract.status === 'paid')
  return Boolean(contract.paid_at || contract.status === 'paid')
}

function getStepDate(contract: ContractRecord, step: StepKey) {
  if (step === 'draft') return contract.created_at
  if (step === 'sent') return contract.sent_at
  if (step === 'viewed') return contract.viewed_at
  if (step === 'signed') return contract.signed_at || contract.accepted_at
  return contract.paid_at
}

function WorkflowStrip({ contract }: { contract: ContractRecord }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
      {FLOW_STEPS.map((step) => {
        const active = getStepState(contract, step.key)
        return (
          <div
            key={step.key}
            style={{
              minHeight: 74,
              padding: '12px 10px',
              borderRadius: 14,
              border: active ? '1px solid rgba(29,78,216,0.18)' : '1px solid rgba(15,23,42,0.08)',
              background: active ? '#EFF6FF' : '#FFFFFF',
              display: 'grid',
              gap: 6,
              alignContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: active ? '#1D4ED8' : '#CBD5E1',
                flexShrink: 0,
              }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#0F172A' : '#64748B' }}>{step.label}</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748B', lineHeight: 1.35 }}>{fmtDate(getStepDate(contract, step.key))}</span>
          </div>
        )
      })}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  label: string
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
}) {
  const base = primary ? ui.primaryButton : ui.secondaryButton
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, opacity: disabled ? 0.65 : 1 }}
    >
      {label}
    </button>
  )
}

export default function ContactHubPage() {
  const { loading, error, profile, accessToken } = useContractAdminGate()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [shareResult, setShareResult] = useState<SharePayload | null>(null)
  const [shareContract, setShareContract] = useState<ContractRecord | null>(null)

  useEffect(() => {
    if (!profile) return
    let active = true
    setListLoading(true)
    setListError('')

    supabase
      .from('contracts')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setListError(queryError.message)
          setContracts([])
          return
        }
        setContracts((data || []) as ContractRecord[])
      })
      .finally(() => {
        if (active) setListLoading(false)
      })

    return () => {
      active = false
    }
  }, [profile])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contracts.filter((contract) => {
      if (status && contract.status !== status) return false
      if (!q) return true
      return [
        contract.contract_number,
        contract.customer_name,
        contract.clinic_name,
        contract.phone,
        contract.email,
        contract.product_name,
      ].some((value) => String(value || '').toLowerCase().includes(q))
    })
  }, [contracts, search, status])

  const stats = useMemo(() => ({
    total: contracts.length,
    sent: contracts.filter((contract) => contract.status === 'sent' || contract.status === 'viewed').length,
    signed: contracts.filter((contract) => contract.status === 'signed').length,
    paid: contracts.filter((contract) => contract.status === 'paid').length,
  }), [contracts])

  const focusList = useMemo(() => ({
    needsSend: contracts.filter((contract) => contract.status === 'draft').length,
    needsFollowUp: contracts.filter((contract) => contract.status === 'sent' || contract.status === 'viewed').length,
    readyToClose: contracts.filter((contract) => contract.status === 'signed').length,
  }), [contracts])

  async function refreshContracts() {
    const { data } = await supabase.from('contracts').select('*').order('updated_at', { ascending: false })
    setContracts((data || []) as ContractRecord[])
  }

  async function openPdf(contract: ContractRecord) {
    if (!accessToken) return
    setBusyId(contract.id)
    try {
      const url = await requestContractPdfUrl(accessToken, contract.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setBusyId(null)
    }
  }

  async function sendContract(contract: ContractRecord, channel: 'whatsapp' | 'email' | 'sms') {
    if (!accessToken) return
    setBusyId(contract.id)
    try {
      const res = await fetch(`/api/contact-contracts/${contract.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'გაგზავნა ვერ შესრულდა.')
      setShareContract(contract)
      setShareResult(data as SharePayload)
      await refreshContracts()
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'გაგზავნა ვერ შესრულდა.')
    } finally {
      setBusyId(null)
    }
  }

  async function changeStatus(contract: ContractRecord, nextStatus: ContractStatus) {
    if (!accessToken) return
    setBusyId(contract.id)
    try {
      const res = await fetch(`/api/contact-contracts/${contract.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'სტატუსი ვერ განახლდა.')
      await refreshContracts()
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'სტატუსი ვერ განახლდა.')
    } finally {
      setBusyId(null)
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
  }

  if (loading) return <LoadingView label="Contact Hub იტვირთება..." />
  if (error || !profile || !accessToken) {
    return (
      <EmptyState
        title="წვდომა აკრძალულია"
        description={error || 'ამ მოდულზე წვდომა არ გაქვს.'}
        action={<Link href="/admin" style={ui.primaryButton}>ადმინში დაბრუნება</Link>}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.canvas, padding: '24px 18px 40px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ ...ui.panel, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.82 }}>contact.medicalline.ge MVP</p>
              <h1 style={{ margin: '8px 0 6px', fontSize: 34, fontWeight: 800 }}>Contract Acceptance Hub</h1>
              <p style={{ margin: 0, maxWidth: 760, fontSize: 14, lineHeight: 1.65, color: '#DBEAFE' }}>
                შექმენი draft, გაუგზავნე კლიენტს link და OTP, აკონტროლე proof trail და დახურე გადახდამდე ერთი სამუშაო დაფიდან.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Link href="/admin/contracts/new" style={ui.primaryButton}>ახალი დოკუმენტი</Link>
              <Link href="/admin/contracts" style={ui.secondaryButton}>Contracts Admin</Link>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'სულ დოკუმენტი', value: stats.total, color: '#0f172a' },
            { label: 'გაგზავნილი / ნანახი', value: stats.sent, color: '#1D4ED8' },
            { label: 'ხელმოწერილი', value: stats.signed, color: '#15803D' },
            { label: 'გადახდილი', value: stats.paid, color: '#3F6212' },
          ].map((item) => (
            <div key={item.label} style={{ ...ui.panel, padding: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.muted }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div style={{ ...ui.panel, padding: 18 }}>
            <div style={{ fontSize: 12, color: colors.muted }}>დღევანდელი ფოკუსი</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: colors.text }}>{focusList.needsSend} draft ელოდება გაგზავნას</div>
            <div style={{ marginTop: 6, fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>პირველი ნაბიჯი არის public link-ის და OTP-ის გენერაცია.</div>
          </div>
          <div style={{ ...ui.panel, padding: 18 }}>
            <div style={{ fontSize: 12, color: colors.muted }}>Follow-up</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: colors.text }}>{focusList.needsFollowUp} დოკუმენტს სჭირდება მიყოლა</div>
            <div style={{ marginTop: 6, fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>Sent და Viewed ეტაპები ერთ ადგილას ჩანს, რომ გუნდი არ დაეკარგოს პროცესს.</div>
          </div>
          <div style={{ ...ui.panel, padding: 18 }}>
            <div style={{ fontSize: 12, color: colors.muted }}>Ready to close</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: colors.text }}>{focusList.readyToClose} signed დოკუმენტი ელოდება Paid-ს</div>
            <div style={{ marginTop: 6, fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>ხელმოწერის შემდეგ ერთი ღილაკით გადაიყვანე ფინანსურად დახურულ სტატუსში.</div>
          </div>
        </div>

        <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="ძებნა">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="კლიენტი, ტელეფონი, პროდუქტი..." style={ui.input} />
          </Field>
          <Field label="სტატუსი">
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={ui.input}>
              <option value="">ყველა სტატუსი</option>
              {Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </Field>
        </div>

        {listError ? <div style={{ ...ui.panel, background: '#FEF2F2', color: '#991B1B', borderColor: 'rgba(185,28,28,0.18)' }}>{listError}</div> : null}
        {listLoading ? <LoadingView label="დოკუმენტები იტვირთება..." /> : null}

        {!listLoading && filtered.length === 0 ? (
          <EmptyState
            title="დოკუმენტები ვერ მოიძებნა"
            description="MVP იყენებს არსებულ contracts ბაზას. ჯერ შექმენი draft და შემდეგ აქედან გაუგზავნე კლიენტს."
            action={<Link href="/admin/contracts/new" style={ui.primaryButton}>ახალი draft</Link>}
          />
        ) : null}

        {!listLoading && filtered.length > 0 ? (
          <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
            {filtered.map((contract, index) => {
              const publicUrl = contract.public_token && origin ? buildPublicContractUrl(origin, contract.public_token) : null
              return (
                <div key={contract.id} style={{ padding: 18, borderTop: index === 0 ? 'none' : '1px solid rgba(15,23,42,0.08)', display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <strong style={{ fontSize: 16, color: colors.text }}>{contract.contract_number}</strong>
                        <StatusBadge status={contract.status} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: colors.muted }}>
                        {contract.customer_name || contract.clinic_name || 'კლიენტი არაა მითითებული'} · {contract.phone || 'ტელეფონი არაა მითითებული'} · {contract.email || 'ელფოსტა არაა მითითებული'}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: colors.muted }}>
                        {contract.product_name} · {formatCurrency(Number(contract.total_amount || 0), contract.currency)} · ვერსია {contract.document_version || 1}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={`/admin/contracts/${contract.id}`} style={ui.secondaryButton}>დეტალები</Link>
                      <ActionButton label="PDF" onClick={() => openPdf(contract)} disabled={busyId === contract.id} />
                      <ActionButton label="Paid" onClick={() => changeStatus(contract, 'paid')} disabled={busyId === contract.id || contract.status === 'paid'} />
                    </div>
                  </div>

                  <WorkflowStrip contract={contract} />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: '#FAFAF8', border: '1px solid rgba(15,23,42,0.08)' }}>
                      <div style={{ fontSize: 12, color: colors.muted }}>Public link</div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 600, color: colors.text, wordBreak: 'break-all' }}>{publicUrl || 'ჯერ არაა გენერირებული'}</div>
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: '#FAFAF8', border: '1px solid rgba(15,23,42,0.08)' }}>
                      <div style={{ fontSize: 12, color: colors.muted }}>Proof snapshot</div>
                      <div style={{ marginTop: 5, fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
                        OTP verified: {fmtDate(contract.otp_verified_at)}<br />
                        Accepted: {fmtDate(contract.accepted_at)}<br />
                        Last channel: {contract.last_sent_channel || '-'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                    <ActionButton label="SMS OTP გაგზავნა" primary onClick={() => sendContract(contract, 'sms')} disabled={busyId === contract.id} />
                    <ActionButton label="WhatsApp გაგზავნა" onClick={() => sendContract(contract, 'whatsapp')} disabled={busyId === contract.id} />
                    <ActionButton label="Email draft" onClick={() => sendContract(contract, 'email')} disabled={busyId === contract.id} />
                    <ActionButton label="Public link copy" onClick={() => { if (publicUrl) void copy(publicUrl) }} disabled={!publicUrl} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {shareResult && shareContract ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div style={{ ...ui.panel, width: '100%', maxWidth: 780, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: colors.text }}>გაგზავნის პაკეტი მზადაა</h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted }}>{shareContract.contract_number} · OTP იწურება {fmtDate(shareResult.otpExpiresAt)}</p>
              </div>
              <button type="button" onClick={() => { setShareResult(null); setShareContract(null) }} style={ui.secondaryButton}>დახურვა</button>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 260px)', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 14, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 12, color: '#1D4ED8' }}>Public acceptance link</div>
                  <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: '#0F172A', wordBreak: 'break-all' }}>{shareResult.publicUrl}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 12, color: '#1D4ED8' }}>OTP კოდი</div>
                  <div style={{ marginTop: 4, fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: 3 }}>{shareResult.otpCode}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                {shareResult.whatsappUrl ? <a href={shareResult.whatsappUrl} target="_blank" rel="noreferrer" style={ui.primaryButton}>WhatsApp გახსნა</a> : null}
                <a href={`mailto:${shareContract.email || ''}?subject=${encodeURIComponent(shareResult.emailSubject)}&body=${encodeURIComponent(shareResult.emailBody)}`} style={ui.secondaryButton}>Email draft</a>
                <button type="button" onClick={() => copy(shareResult.publicUrl)} style={ui.secondaryButton}>Link copy</button>
                <button type="button" onClick={() => copy(shareResult.smsText)} style={ui.secondaryButton}>SMS ტექსტი</button>
                <button type="button" onClick={() => copy(shareResult.otpCode)} style={ui.secondaryButton}>OTP copy</button>
                <a href={shareResult.pdfUrl} target="_blank" rel="noreferrer" style={ui.secondaryButton}>PDF</a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 14, background: '#FAFAF8', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <div style={{ fontSize: 12, color: colors.muted }}>SMS / WhatsApp ტექსტი</div>
                  <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: colors.text }}>{shareResult.smsText}</pre>
                </div>
                <div style={{ padding: 14, borderRadius: 14, background: '#FAFAF8', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <div style={{ fontSize: 12, color: colors.muted }}>Email ტექსტი</div>
                  <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: colors.text }}>{shareResult.emailBody}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
