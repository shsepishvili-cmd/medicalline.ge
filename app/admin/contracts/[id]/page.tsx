'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ContractAcceptanceActRecord } from '@/app/lib/acceptance-act-types'
import type { ContractAuditLogRecord, ContractRecord, ContractStatus } from '@/app/lib/contract-types'
import { calcVatAmount, formatCurrency } from '@/app/lib/contract'
import {
  AuthBlockedView,
  colors,
  ContractAdminShell,
  ContractStatusBadge,
  LoadingView,
  requestContractPdfUrl,
  SummaryCard,
  ui,
  useContractAdminGate,
} from '../_components/ContractUi'

function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ka-GE')
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ka-GE')
}

function fmtBool(v: boolean) {
  return v ? 'კი' : 'არა'
}

function auditLabel(eventType: string) {
  const labels: Record<string, string> = {
    sent: 'გაგზავნილი',
    viewed: 'გახსნილი',
    accepted: 'პირობები დადასტურდა',
    signed: 'ხელმოწერილი',
    status_changed: 'სტატუსი შეიცვალა',
  }
  return labels[eventType] || eventType
}

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

type ActSharePayload = Omit<SharePayload, 'pdfUrl'>

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { loading, error, profile, accessToken } = useContractAdminGate()
  const [contract, setContract] = useState<ContractRecord | null>(null)
  const [auditLogs, setAuditLogs] = useState<ContractAuditLogRecord[]>([])
  const [acceptanceActs, setAcceptanceActs] = useState<ContractAcceptanceActRecord[]>([])
  const [working, setWorking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [shareBusy, setShareBusy] = useState<'sms' | 'whatsapp' | 'email' | null>(null)
  const [actBusy, setActBusy] = useState<'create' | 'sms' | 'whatsapp' | 'email' | null>(null)
  const [shareResult, setShareResult] = useState<SharePayload | null>(null)
  const [actShareResult, setActShareResult] = useState<ActSharePayload | null>(null)
  const [isPhone, setIsPhone] = useState(false)
  const uploadRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 760)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!profile || !params.id) return

    supabase
      .from('contracts')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => setContract(data as ContractRecord | null))

    supabase
      .from('contract_audit_logs')
      .select('*')
      .eq('contract_id', params.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAuditLogs((data || []) as ContractAuditLogRecord[]))

    supabase
      .from('contract_acceptance_acts')
      .select('*')
      .eq('contract_id', params.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAcceptanceActs((data || []) as ContractAcceptanceActRecord[]), () => setAcceptanceActs([]))
  }, [params.id, profile])

  async function refreshAll() {
    if (!params.id) return
    const [{ data: contractData }, { data: auditData }, actsResult] = await Promise.all([
      supabase.from('contracts').select('*').eq('id', params.id).single(),
      supabase.from('contract_audit_logs').select('*').eq('contract_id', params.id).order('created_at', { ascending: false }),
      supabase.from('contract_acceptance_acts').select('*').eq('contract_id', params.id).order('created_at', { ascending: false }).then((res) => res, () => ({ data: [] })),
    ])
    if (contractData) setContract(contractData as ContractRecord)
    setAuditLogs((auditData || []) as ContractAuditLogRecord[])
    setAcceptanceActs(((actsResult as { data?: unknown[] }).data || []) as ContractAcceptanceActRecord[])
  }

  async function openPdf() {
    if (!accessToken || !params.id) return
    setWorking(true)
    try {
      const url = await requestContractPdfUrl(accessToken, params.id)
      window.open(url, '_blank', 'noopener,noreferrer')
      await refreshAll()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF შეცდომა')
    } finally {
      setWorking(false)
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    alert('დაკოპირდა.')
  }

  async function sendContract(channel: 'sms' | 'whatsapp' | 'email') {
    if (!accessToken || !params.id) return
    setShareBusy(channel)
    try {
      const res = await fetch(`/api/contact-contracts/${params.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'გაგზავნის პაკეტი ვერ შეიქმნა.')

      const payload = data as SharePayload
      setShareResult(payload)
      await refreshAll()

      if (channel === 'whatsapp' && payload.whatsappUrl) {
        window.open(payload.whatsappUrl, '_blank', 'noopener,noreferrer')
      }
      if (channel === 'email') {
        window.location.href = `mailto:${contract?.email || ''}?subject=${encodeURIComponent(payload.emailSubject)}&body=${encodeURIComponent(payload.emailBody)}`
      }
      if (channel === 'sms') {
        if (payload.smsSent) {
          alert('SMS გაიგზავნა კლიენტის ნომერზე.')
        } else {
          await navigator.clipboard.writeText(payload.smsText)
          alert('SMS provider არ არის ჩართული. ტექსტი დაკოპირდა ხელით გასაგზავნად.')
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'გაგზავნის პაკეტი ვერ შეიქმნა.')
    } finally {
      setShareBusy(null)
    }
  }

  async function createAcceptanceAct() {
    if (!accessToken || !params.id) return
    setActBusy('create')
    try {
      const res = await fetch(`/api/contracts/${params.id}/acceptance-act`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'მიღება-ჩაბარების აქტი ვერ შეიქმნა.')
      await refreshAll()
      alert(data?.created ? 'მიღება-ჩაბარების აქტი შეიქმნა და ხელშეკრულებას მიება.' : 'მიღება-ჩაბარების აქტი უკვე მიბმულია.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'მიღება-ჩაბარების აქტი ვერ შეიქმნა.')
    } finally {
      setActBusy(null)
    }
  }

  async function sendAcceptanceAct(channel: 'sms' | 'whatsapp' | 'email') {
    if (!accessToken || !acceptanceActs[0]) return
    setActBusy(channel)
    try {
      const res = await fetch(`/api/acceptance-acts/${acceptanceActs[0].id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'მიღება-ჩაბარების აქტის გაგზავნა ვერ შესრულდა.')

      const payload = data as ActSharePayload
      setActShareResult(payload)
      await refreshAll()

      if (channel === 'whatsapp' && payload.whatsappUrl) {
        window.open(payload.whatsappUrl, '_blank', 'noopener,noreferrer')
      }
      if (channel === 'email') {
        window.location.href = `mailto:${contract?.email || ''}?subject=${encodeURIComponent(payload.emailSubject)}&body=${encodeURIComponent(payload.emailBody)}`
      }
      if (channel === 'sms') {
        if (payload.smsSent) {
          alert('მიღება-ჩაბარების აქტის SMS გაიგზავნა კლიენტის ნომერზე.')
        } else {
          await navigator.clipboard.writeText(payload.smsText)
          alert('SMS provider არ არის ჩართული. ტექსტი დაკოპირდა ხელით გასაგზავნად.')
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'მიღება-ჩაბარების აქტის გაგზავნა ვერ შესრულდა.')
    } finally {
      setActBusy(null)
    }
  }

  async function uploadPdf(file: File) {
    if (!accessToken || !params.id) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/contact-contracts/${params.id}/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'ატვირთვა ვერ შესრულდა.')
      await refreshAll()
      alert('PDF აიტვირთა და მიება ხელშეკრულებას.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF ატვირთვის შეცდომა')
    } finally {
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  if (loading) return <LoadingView label="ხელშეკრულება იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (!contract) return <LoadingView label="ჩანაწერი ვერ მოიძებნა..." />

  const fin = calcVatAmount(contract.unit_price, contract.quantity, contract.vat_rate, contract.vat_included)
  const acceptanceAct = acceptanceActs[0] || null

  return (
    <ContractAdminShell
      title={contract.contract_number}
      subtitle="გაყიდვის ხელშეკრულების დეტალი, მტკიცებულების ჯაჭვი და კლიენტის დადასტურების კვალი ერთ გვერდზე."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>
            {searchParams.get('pdf') ? 'PDF წარმატებით გენერირდა.' : 'PDF-ის გენერაცია და audit trail-ის შემოწმება აქედან შეგიძლია.'}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => sendContract('sms')} disabled={Boolean(shareBusy)} style={{ ...ui.primaryButton, opacity: shareBusy ? 0.7 : 1 }}>
              {shareBusy === 'sms' ? 'მზადდება...' : 'SMS ტექსტი'}
            </button>
            <button type="button" onClick={() => sendContract('whatsapp')} disabled={Boolean(shareBusy)} style={{ ...ui.secondaryButton, opacity: shareBusy ? 0.7 : 1 }}>
              {shareBusy === 'whatsapp' ? 'მზადდება...' : 'WhatsApp'}
            </button>
            <button type="button" onClick={() => sendContract('email')} disabled={Boolean(shareBusy)} style={{ ...ui.secondaryButton, opacity: shareBusy ? 0.7 : 1 }}>
              {shareBusy === 'email' ? 'მზადდება...' : 'Email draft'}
            </button>
            <button type="button" onClick={openPdf} disabled={working} style={{ ...ui.primaryButton, opacity: working ? 0.7 : 1 }}>
              {working ? 'მუშავდება...' : 'PDF გენერაცია'}
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              style={{ ...ui.secondaryButton, opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? 'იტვირთება...' : 'PDF ატვირთვა'}
            </button>
            <Link href={`/admin/contracts/${contract.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
            <input
              ref={uploadRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadPdf(file)
              }}
            />
          </div>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : 'minmax(0, 2fr) minmax(320px, 0.95fr)', gap: isPhone ? 12 : 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <SummaryCard label="ხელშეკრულების ნომერი" value={contract.contract_number} />
            <SummaryCard label="სტატუსი" value={<ContractStatusBadge status={contract.status} />} />
            <SummaryCard label="თარიღი" value={fmtDate(contract.contract_date)} />
            <SummaryCard label="PDF გენ. თარიღი" value={fmtDateTime(contract.generated_at)} />
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>პროდუქტი და ფინანსები</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <SummaryCard label="პროდუქტი" value={contract.product_name} />
              <SummaryCard label="ბრენდი / მოდელი" value={`${contract.brand}${contract.model ? ` / ${contract.model}` : ''}`} />
              <SummaryCard label="სერიული ნომერი" value={contract.serial_number || '-'} />
              <SummaryCard label="რაოდენობა" value={String(contract.quantity)} />
              <SummaryCard label="ერთეულის ფასი" value={formatCurrency(contract.unit_price, contract.currency)} />
              <SummaryCard label={`დღგ ${contract.vat_rate}%`} value={formatCurrency(fin.vat, contract.currency)} />
              <SummaryCard label="სულ გადასახდელი" value={<span style={{ color: '#085041', fontWeight: 700, fontSize: 16 }}>{formatCurrency(fin.gross, contract.currency)}</span>} />
              <SummaryCard label="დღგ ჩათვლილია ფასში" value={fmtBool(contract.vat_included)} />
            </div>
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>მიწოდება და გარანტია</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <SummaryCard label="გადახდის პირობები" value={contract.payment_terms || '-'} />
              <SummaryCard label="მიწოდების თარიღი" value={fmtDate(contract.delivery_date)} />
              <SummaryCard label="მიწოდების მისამართი" value={contract.delivery_address || '-'} />
              <SummaryCard label="ინსტალაცია" value={fmtBool(contract.installation_included)} />
              <SummaryCard label="გარანტიის ვადა" value={contract.warranty_months > 0 ? `${contract.warranty_months} თვე` : '-'} />
              <SummaryCard label="ვერსია" value={String(contract.document_version || 1)} />
            </div>
          </div>

          {contract.special_terms ? (
            <div style={{ ...ui.panel }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: colors.text }}>სპეციალური პირობები</p>
              <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.7 }}>{contract.special_terms}</p>
            </div>
          ) : null}

          {contract.notes ? (
            <div style={{ ...ui.panel }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: colors.text }}>შენიშვნები (შიდა)</p>
              <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.7 }}>{contract.notes}</p>
            </div>
          ) : null}

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>Audit trail</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>
                იურიდიული კვალი: გახსნა, დადასტურება, IP, დრო, ტელეფონი, ელფოსტა და დოკუმენტის ვერსია.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>ჯერ audit ჩანაწერი არ არის.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(15,23,42,0.08)', background: '#FAFAF8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <strong style={{ fontSize: 14, color: colors.text }}>{auditLabel(log.event_type)}</strong>
                        {log.event_status ? <ContractStatusBadge status={log.event_status as ContractStatus} /> : null}
                      </div>
                      <span style={{ fontSize: 12, color: colors.muted }}>{fmtDateTime(log.created_at)}</span>
                    </div>

                    <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: colors.muted }}>IP</div>
                        <div style={{ marginTop: 3, fontSize: 13, color: colors.text }}>{log.ip_address || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: colors.muted }}>ტელეფონი</div>
                        <div style={{ marginTop: 3, fontSize: 13, color: colors.text }}>{log.phone || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: colors.muted }}>ელფოსტა</div>
                        <div style={{ marginTop: 3, fontSize: 13, color: colors.text }}>{log.email || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: colors.muted }}>არხი</div>
                        <div style={{ marginTop: 3, fontSize: 13, color: colors.text }}>{log.channel || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: colors.muted }}>დოკუმენტის ვერსია</div>
                        <div style={{ marginTop: 3, fontSize: 13, color: colors.text }}>{log.document_version || '-'}</div>
                      </div>
                    </div>

                    {log.user_agent ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: colors.muted }}>User agent</div>
                        <div style={{ marginTop: 3, fontSize: 12, color: colors.muted, lineHeight: 1.5, wordBreak: 'break-word' }}>{log.user_agent}</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>კლიენტთან გაგზავნა</p>
            <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
              აქ იქმნება public link და SMS/OTP კოდი. SMS ღილაკი ტექსტს აკოპირებს, WhatsApp ხსნის ჩატს, Email draft კი წერილის შაბლონს.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              <button type="button" onClick={() => sendContract('sms')} disabled={Boolean(shareBusy)} style={{ ...ui.primaryButton, justifyContent: 'center', opacity: shareBusy ? 0.7 : 1 }}>
                SMS
              </button>
              <button type="button" onClick={() => sendContract('whatsapp')} disabled={Boolean(shareBusy)} style={{ ...ui.secondaryButton, justifyContent: 'center', opacity: shareBusy ? 0.7 : 1 }}>
                WhatsApp
              </button>
              <button type="button" onClick={() => sendContract('email')} disabled={Boolean(shareBusy)} style={{ ...ui.secondaryButton, justifyContent: 'center', opacity: shareBusy ? 0.7 : 1 }}>
                Email
              </button>
            </div>
            {shareResult ? (
              <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, color: colors.muted }}>Public link</div>
                <div style={{ fontSize: 12, color: colors.text, wordBreak: 'break-all' }}>{shareResult.publicUrl}</div>
                <div style={{ fontSize: 12, color: colors.muted }}>OTP</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, letterSpacing: 3 }}>{shareResult.otpCode}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => copy(shareResult.smsText)} style={ui.secondaryButton}>SMS copy</button>
                  <button type="button" onClick={() => copy(shareResult.publicUrl)} style={ui.secondaryButton}>Link copy</button>
                  <a href={shareResult.pdfUrl} target="_blank" rel="noreferrer" style={ui.secondaryButton}>PDF</a>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>მიღება-ჩაბარების აქტი</p>
            <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
              აქტი ავტომატურად მიებმება ამ ხელშეკრულებას და კლიენტი SMS/OTP კოდით დაადასტურებს მიღებას.
            </p>

            {acceptanceAct ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  <SummaryCard label="აქტის ნომერი" value={acceptanceAct.act_number} />
                  <SummaryCard label="სტატუსი" value={<ContractStatusBadge status={acceptanceAct.status as ContractStatus} />} />
                  <SummaryCard label="გაგზავნა" value={fmtDateTime(acceptanceAct.sent_at)} />
                  <SummaryCard label="დადასტურება" value={fmtDateTime(acceptanceAct.accepted_at)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  <button type="button" onClick={() => sendAcceptanceAct('sms')} disabled={Boolean(actBusy)} style={{ ...ui.primaryButton, justifyContent: 'center', opacity: actBusy ? 0.7 : 1 }}>
                    {actBusy === 'sms' ? '...' : 'SMS'}
                  </button>
                  <button type="button" onClick={() => sendAcceptanceAct('whatsapp')} disabled={Boolean(actBusy)} style={{ ...ui.secondaryButton, justifyContent: 'center', opacity: actBusy ? 0.7 : 1 }}>
                    {actBusy === 'whatsapp' ? '...' : 'WhatsApp'}
                  </button>
                  <button type="button" onClick={() => sendAcceptanceAct('email')} disabled={Boolean(actBusy)} style={{ ...ui.secondaryButton, justifyContent: 'center', opacity: actBusy ? 0.7 : 1 }}>
                    {actBusy === 'email' ? '...' : 'Email'}
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={createAcceptanceAct} disabled={Boolean(actBusy)} style={{ ...ui.primaryButton, justifyContent: 'center', opacity: actBusy ? 0.7 : 1 }}>
                {actBusy === 'create' ? 'იქმნება...' : 'აქტის შექმნა'}
              </button>
            )}

            {actShareResult ? (
              <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, color: colors.muted }}>Public link</div>
                <div style={{ fontSize: 12, color: colors.text, wordBreak: 'break-all' }}>{actShareResult.publicUrl}</div>
                <div style={{ fontSize: 12, color: colors.muted }}>OTP</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, letterSpacing: 3 }}>{actShareResult.otpCode}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => copy(actShareResult.smsText)} style={ui.secondaryButton}>SMS copy</button>
                  <button type="button" onClick={() => copy(actShareResult.publicUrl)} style={ui.secondaryButton}>Link copy</button>
                  <a href={actShareResult.publicUrl} target="_blank" rel="noreferrer" style={ui.secondaryButton}>გახსნა</a>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>მყიდველი / კლინიკა</p>
            <SummaryCard label="კლინიკა" value={contract.clinic_name || '-'} />
            <SummaryCard label="მომხმარებელი" value={contract.customer_name || '-'} />
            <SummaryCard label="პ/ნ ან კოდი" value={contract.customer_id_number || '-'} />
            <SummaryCard label="მისამართი" value={contract.customer_address || '-'} />
            <SummaryCard label="ტელეფონი" value={contract.phone || '-'} />
            <SummaryCard label="ელფოსტა" value={contract.email || '-'} />
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>საბუთის დადასტურების კვალი</p>
            <SummaryCard label="გაგზავნილი" value={fmtDateTime(contract.sent_at)} />
            <SummaryCard label="ნანახი" value={fmtDateTime(contract.viewed_at)} />
            <SummaryCard label="დათანხმდა პირობებს" value={fmtBool(contract.agreed_to_terms)} />
            <SummaryCard label="Accepted" value={fmtDateTime(contract.accepted_at)} />
            <SummaryCard label="Signed" value={fmtDateTime(contract.signed_at)} />
            <SummaryCard label="Paid" value={fmtDateTime(contract.paid_at)} />
            <SummaryCard label="OTP დადასტურება" value={fmtDateTime(contract.otp_verified_at)} />
            <SummaryCard label="დადასტურებული ტელეფონი" value={contract.accepted_phone || '-'} />
            <SummaryCard label="დადასტურებული ელფოსტა" value={contract.accepted_email || '-'} />
            <SummaryCard label="ბოლო გაგზავნის არხი" value={contract.last_sent_channel || '-'} />
          </div>

          {contract.warranty_id ? (
            <div style={{ ...ui.panel }}>
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: colors.text }}>მიბმული გარანტია</p>
              <Link href={`/admin/warranty/${contract.warranty_id}`} style={ui.secondaryButton}>
                გარანტიის ნახვა
              </Link>
            </div>
          ) : null}

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>PDF ხელშეკრულება</p>
            <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
              PDF ყოველ გენერაციაზე ხელახლა იქმნება.
              {contract.generated_at ? ` ბოლო გენერაცია: ${fmtDateTime(contract.generated_at)}` : ' ჯერ არ არის გენერირებული.'}
            </p>
            <button type="button" onClick={openPdf} disabled={working} style={{ ...ui.primaryButton, opacity: working ? 0.7 : 1 }}>
              {working ? 'მუშავდება...' : 'PDF გენერაცია / გახსნა'}
            </button>
          </div>
        </div>
      </div>
    </ContractAdminShell>
  )
}
