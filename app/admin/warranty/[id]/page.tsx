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
  Field,
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

  if (loading) return <LoadingView label="Loading warranty detail…" />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'Access denied.'} />
  if (!warranty) return <LoadingView label="Warranty record not found yet…" />

  return (
    <WarrantyAdminShell
      title={warranty.warranty_number}
      subtitle="Warranty detail keeps the certificate, QR verify link, attachments, and linked service history in one place."
      profile={profile}
      actions={
        <>
          <span style={{ fontSize: 13, color: colors.muted }}>
            {searchParams.get('pdf') ? 'PDF certificate regenerated successfully.' : 'Use the actions on the right to regenerate the certificate or log a new service case.'}
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => openPdf(true)} disabled={working} style={{ ...ui.primaryButton, opacity: working ? 0.7 : 1 }}>Generate PDF</button>
            <Link href={`/admin/warranty/${warranty.id}/edit`} style={ui.secondaryButton}>Edit Warranty</Link>
            <Link href={`/admin/warranty/${warranty.id}/service/new`} style={ui.secondaryButton}>Add Service Case</Link>
          </div>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 0.85fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <WarrantySummaryCard label="Warranty number" value={warranty.warranty_number} />
            <WarrantySummaryCard label="Status" value={<WarrantyStatusBadge status={warranty.status} />} />
            <WarrantySummaryCard label="Serial number" value={warranty.serial_number} />
            <WarrantySummaryCard label="Warranty period" value={`${formatDate(warranty.warranty_start)} → ${formatDate(warranty.warranty_end)}`} />
            <WarrantySummaryCard label="Clinic" value={warranty.clinic_name || '—'} />
            <WarrantySummaryCard label="Doctor / customer" value={warranty.customer_name || '—'} />
            <WarrantySummaryCard label="Product" value={warranty.product_name} />
            <WarrantySummaryCard label="Brand / model" value={`${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`} />
            <WarrantySummaryCard label="Invoice number" value={warranty.invoice_number || '—'} />
            <WarrantySummaryCard label="Sold by" value={warranty.sold_by || '—'} />
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>Attachments & Certificate</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted }}>Private files live in Supabase Storage and open through signed URLs.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => openPdf(false)} style={ui.secondaryButton}>Open Current PDF</button>
                <button type="button" onClick={() => openPdf(true)} style={ui.primaryButton}>Regenerate PDF</button>
              </div>
            </div>
            {warrantyAttachments.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>No direct warranty attachments uploaded yet.</p>
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
                      <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>Uploaded {formatDateTime(attachment.created_at)}</p>
                    </div>
                    <span style={{ color: colors.green, fontWeight: 700 }}>Open</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>Service History</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: colors.muted }}>Every case stays linked to this warranty record for future triage.</p>
              </div>
              <Link href={`/admin/warranty/${warranty.id}/service/new`} style={ui.primaryButton}>Add Service Case</Link>
            </div>

            {serviceCases.length === 0 ? (
              <EmptyState title="No service cases yet" description="When this product needs inspection or repair, create the first service case from here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {serviceCases.map((serviceCase) => (
                  <div key={serviceCase.id} style={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 16, padding: 14, background: '#FAFAF8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text }}>{serviceCase.case_number} · {serviceCase.issue_title}</p>
                        <p style={{ margin: '5px 0 0', fontSize: 12, color: colors.muted }}>
                          Reported {formatDateTime(serviceCase.reported_at)} · Outcome {serviceCase.outcome || '—'}
                        </p>
                      </div>
                      <Link href={`/admin/warranty/service-cases/${serviceCase.id}/edit`} style={ui.secondaryButton}>Edit</Link>
                    </div>
                    {serviceCase.issue_description ? (
                      <p style={{ margin: '10px 0 0', fontSize: 13, color: colors.text, lineHeight: 1.65 }}>{serviceCase.issue_description}</p>
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
                      <WarrantySummaryCard label="Inspection" value={serviceCase.inspection_result || '—'} />
                      <WarrantySummaryCard label="Mechanical damage" value={formatBoolean(serviceCase.is_mechanical_damage)} />
                      <WarrantySummaryCard label="Under warranty" value={formatBoolean(serviceCase.is_under_warranty)} />
                      <WarrantySummaryCard label="Action taken" value={serviceCase.action_taken || '—'} />
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
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>Customer & Contact</p>
            <WarrantySummaryCard label="Clinic" value={warranty.clinic_name || '—'} />
            <WarrantySummaryCard label="Customer" value={warranty.customer_name || '—'} />
            <WarrantySummaryCard label="Phone" value={warranty.phone || '—'} />
            <WarrantySummaryCard label="Email" value={warranty.email || '—'} />
            <WarrantySummaryCard label="Notes" value={warranty.notes || '—'} />
          </div>
        </div>
      </div>
    </WarrantyAdminShell>
  )
}
