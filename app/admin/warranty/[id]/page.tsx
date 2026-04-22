'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ServiceCaseRecord, WarrantyAttachmentRecord, WarrantyRecord } from '@/app/lib/warranty-types'
import { buildWarrantyVerifyUrl, formatBoolean, formatDate, formatDateTime } from '@/app/lib/warranty'
import {
  AuthBlockedView,
  colors,
  EmptyState,
  formatAttachmentLabel,
  LoadingView,
  requestSignedFileUrl,
  ui,
  useWarrantyAdminGate,
  WarrantyAdminShell,
  WarrantyQrCard,
  WarrantyStatusBadge,
  WarrantySummaryCard,
} from '../_components/WarrantyUi'

export default function WarrantyDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { loading, error, profile, accessToken } = useWarrantyAdminGate()
  const [warranty, setWarranty] = useState<WarrantyRecord | null>(null)
  const [warrantyAttachments, setWarrantyAttachments] = useState<WarrantyAttachmentRecord[]>([])
  const [serviceCases, setServiceCases] = useState<ServiceCaseRecord[]>([])
  const [serviceAttachments, setServiceAttachments] = useState<Record<string, WarrantyAttachmentRecord[]>>({})
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!profile || !params.id) return

    async function load() {
      const [{ data: warrantyRow }, { data: cases }] = await Promise.all([
        supabase.from('warranties').select('*, products(id, name, brand, category_slug, slug)').eq('id', params.id).single(),
        supabase.from('service_cases').select('*').eq('warranty_id', params.id).order('reported_at', { ascending: false }),
      ])

      setWarranty((warrantyRow || null) as WarrantyRecord | null)
      setServiceCases((cases || []) as ServiceCaseRecord[])

      const caseIds = (cases || []).map((item) => item.id)
      const [directAttachments, linkedAttachments] = await Promise.all([
        supabase.from('warranty_attachments').select('*').eq('warranty_id', params.id).order('created_at', { ascending: false }),
        caseIds.length
          ? supabase.from('warranty_attachments').select('*').in('service_case_id', caseIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as WarrantyAttachmentRecord[] }),
      ])

      setWarrantyAttachments((directAttachments.data || []) as WarrantyAttachmentRecord[])

      const grouped = ((linkedAttachments.data || []) as WarrantyAttachmentRecord[]).reduce<Record<string, WarrantyAttachmentRecord[]>>((accumulator, attachment) => {
        const key = attachment.service_case_id || ''
        if (!accumulator[key]) accumulator[key] = []
        accumulator[key].push(attachment)
        return accumulator
      }, {})
      setServiceAttachments(grouped)
    }

    load()
  }, [params.id, profile])

  const verifyUrl = useMemo(() => {
    if (!warranty) return ''
    if (warranty.qr_url) return warranty.qr_url
    if (typeof window === 'undefined') return ''
    return buildWarrantyVerifyUrl(window.location.origin, warranty.verify_token)
  }, [warranty])

  async function openAttachment(attachmentId: string) {
    if (!accessToken) return
    const signed = await requestSignedFileUrl(accessToken, { kind: 'attachment', attachmentId })
    window.open(signed.url, '_blank', 'noopener,noreferrer')
  }

  async function openPdf(generate = false) {
    if (!accessToken || !params.id) return
    setWorking(true)

    try {
      if (generate) {
        await fetch(`/api/warranty/${params.id}/certificate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
      const signed = await requestSignedFileUrl(accessToken, { kind: 'pdf', warrantyId: params.id })
      window.open(signed.url, '_blank', 'noopener,noreferrer')
    } finally {
      setWorking(false)
    }
  }

  async function openMiniContract() {
    if (!accessToken || !params.id) return
    setWorking(true)
    try {
      const res = await fetch(`/api/warranty/${params.id}/mini-contract`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || 'შეცდომა')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `mini-contract-${warranty?.warranty_number || params.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <LoadingView label="გარანტიის დეტალები იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />
  if (!warranty) return <LoadingView label="გარანტიის ჩანაწერი ვერ მოიძებნა..." />

  return (
    <WarrantyAdminShell
      title={warranty.warranty_number}
      subtitle="გარანტიის დეტალი ერთ სივრცეში აერთიანებს სერტიფიკატს, QR ვერიფიკაციის ბმულს, დანართებსა და მიბმულ სერვის ისტორიას."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>
            {searchParams.get('pdf') ? 'PDF სერტიფიკატი წარმატებით განახლდა.' : 'მარჯვნივ არსებული მოქმედებებიდან შეგიძლია სერტიფიკატის თავიდან გენერაცია ან ახალი სერვის ქეისის დამატება.'}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => openPdf(true)} disabled={working} style={{ ...ui.primaryButton, opacity: working ? 0.7 : 1 }}>PDF სერტიფიკატი</button>
            <button type="button" onClick={() => openMiniContract()} disabled={working} style={{ ...ui.secondaryButton, opacity: working ? 0.7 : 1 }}>მინი კონტრაქტი</button>
            <Link href={`/admin/warranty/${warranty.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
            <Link href={`/admin/warranty/${warranty.id}/service/new`} style={ui.secondaryButton}>სერვის ქეისი</Link>
          </div>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 0.85fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <WarrantySummaryCard label="გარანტიის ნომერი" value={warranty.warranty_number} />
            <WarrantySummaryCard label="სტატუსი" value={<WarrantyStatusBadge status={warranty.status} />} />
            <WarrantySummaryCard label="სერიული ნომერი" value={warranty.serial_number} />
            <WarrantySummaryCard label="გარანტიის პერიოდი" value={`${formatDate(warranty.warranty_start)} → ${formatDate(warranty.warranty_end)}`} />
            <WarrantySummaryCard label="კლინიკა" value={warranty.clinic_name || '—'} />
            <WarrantySummaryCard label="ექიმი / მომხმარებელი" value={warranty.customer_name || '—'} />
            <WarrantySummaryCard label="პროდუქტი" value={warranty.product_name} />
            <WarrantySummaryCard label="ბრენდი / მოდელი" value={`${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`} />
            <WarrantySummaryCard label="ინვოისის ნომერი" value={warranty.invoice_number || '—'} />
            <WarrantySummaryCard label="გამყიდველი" value={warranty.sold_by || '—'} />
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>დანართები და სერტიფიკატი</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted }}>ფაილები ინახება private Supabase Storage-ში და იხსნება signed URL-ებით.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => openPdf(false)} style={ui.secondaryButton}>მიმდინარე PDF-ის გახსნა</button>
                <button type="button" onClick={() => openPdf(true)} style={ui.primaryButton}>PDF-ის თავიდან გენერაცია</button>
              </div>
            </div>
            {warrantyAttachments.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>პირდაპირი გარანტიის დანართები ჯერ ატვირთული არ არის.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {warrantyAttachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    onClick={() => openAttachment(attachment.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      background: '#FAFAF8',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>{formatAttachmentLabel(attachment.file_name, attachment.file_type)}</p>
                      <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>ატვირთულია {formatDateTime(attachment.created_at)}</p>
                    </div>
                    <span style={{ color: colors.green, fontWeight: 700 }}>გახსნა</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>სერვის ისტორია</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted }}>ყოველი ქეისი მიბმულია ამ გარანტიის ჩანაწერზე მომავალი დიაგნოსტიკისთვის.</p>
              </div>
              <Link href={`/admin/warranty/${warranty.id}/service/new`} style={ui.primaryButton}>სერვის ქეისის დამატება</Link>
            </div>

            {serviceCases.length === 0 ? (
              <EmptyState title="სერვის ქეისი ჯერ არ არსებობს" description="თუ ამ პროდუქტს შემდგომ სერვისი დასჭირდება, პირველი ქეისი აქედან შექმენი." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {serviceCases.map((serviceCase) => (
                  <div key={serviceCase.id} style={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 16, padding: 14, background: '#FAFAF8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text }}>{serviceCase.case_number} · {serviceCase.issue_title}</p>
                        <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>
                          დაფიქსირდა {formatDateTime(serviceCase.reported_at)} · შედეგი {serviceCase.outcome || '—'}
                        </p>
                      </div>
                      <Link href={`/admin/warranty/service-cases/${serviceCase.id}/edit`} style={ui.secondaryButton}>რედაქტირება</Link>
                    </div>
                    {serviceCase.issue_description ? (
                      <p style={{ margin: '10px 0 0', fontSize: 13, color: colors.text, lineHeight: 1.65 }}>{serviceCase.issue_description}</p>
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
                      <WarrantySummaryCard label="ინსპექტირება" value={serviceCase.inspection_result || '—'} />
                      <WarrantySummaryCard label="მექანიკური დაზიანება" value={formatBoolean(serviceCase.is_mechanical_damage)} />
                      <WarrantySummaryCard label="გარანტიაში შედის" value={formatBoolean(serviceCase.is_under_warranty)} />
                      <WarrantySummaryCard label="გატარებული ქმედება" value={serviceCase.action_taken || '—'} />
                    </div>
                    {(serviceAttachments[serviceCase.id] || []).length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {(serviceAttachments[serviceCase.id] || []).map((attachment) => (
                          <button key={attachment.id} type="button" onClick={() => openAttachment(attachment.id)} style={{ ...ui.secondaryButton, padding: '8px 12px' }}>
                            {formatAttachmentLabel(attachment.file_name, attachment.file_type)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <WarrantyQrCard verifyUrl={verifyUrl} />
          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>მომხმარებელი და კონტაქტი</p>
            <WarrantySummaryCard label="კლინიკა" value={warranty.clinic_name || '—'} />
            <WarrantySummaryCard label="მომხმარებელი" value={warranty.customer_name || '—'} />
            <WarrantySummaryCard label="ტელეფონი" value={warranty.phone || '—'} />
            <WarrantySummaryCard label="ელფოსტა" value={warranty.email || '—'} />
            <WarrantySummaryCard label="შენიშვნები" value={warranty.notes || '—'} />
          </div>
        </div>
      </div>
    </WarrantyAdminShell>
  )
}
