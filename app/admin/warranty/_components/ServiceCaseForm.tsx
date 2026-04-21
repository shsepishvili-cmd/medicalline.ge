'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { createEmptyServiceCaseForm, sanitizeFileName } from '@/app/lib/warranty'
import type { ProfileSummary, ServiceCaseFormValues, ServiceCaseRecord } from '@/app/lib/warranty-types'
import { colors, Field, ui } from './WarrantyUi'

function mapCaseToFormValues(serviceCase: ServiceCaseRecord): ServiceCaseFormValues {
  return {
    issueTitle: serviceCase.issue_title || '',
    issueDescription: serviceCase.issue_description || '',
    reportedAt: serviceCase.reported_at ? serviceCase.reported_at.slice(0, 16) : '',
    inspectionResult: serviceCase.inspection_result || '',
    isMechanicalDamage: serviceCase.is_mechanical_damage,
    isUnderWarranty: serviceCase.is_under_warranty,
    actionTaken: serviceCase.action_taken || '',
    replacedUnit: serviceCase.replaced_unit || '',
    sentToFactory: serviceCase.sent_to_factory,
    factorySentAt: serviceCase.factory_sent_at ? serviceCase.factory_sent_at.slice(0, 16) : '',
    factoryReturnedAt: serviceCase.factory_returned_at ? serviceCase.factory_returned_at.slice(0, 16) : '',
    closedAt: serviceCase.closed_at ? serviceCase.closed_at.slice(0, 16) : '',
    outcome: serviceCase.outcome || '',
    notes: serviceCase.notes || '',
  }
}

export function ServiceCaseForm({
  warrantyId,
  profile,
  serviceCase,
}: {
  warrantyId: string
  profile: ProfileSummary
  serviceCase?: ServiceCaseRecord
}) {
  const router = useRouter()
  const [values, setValues] = useState<ServiceCaseFormValues>(() => (serviceCase ? mapCaseToFormValues(serviceCase) : createEmptyServiceCaseForm()))
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setValue<K extends keyof ServiceCaseFormValues>(key: K, value: ServiceCaseFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function uploadAttachments(serviceCaseId: string) {
    if (!files.length) return

    const rows = []

    for (const file of files) {
      const path = `service/${serviceCaseId}/${Date.now()}-${sanitizeFileName(file.name)}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from('service-attachments')
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError || !uploaded?.path) {
        throw new Error(uploadError?.message || `ატვირთვა ვერ მოხერხდა: ${file.name}`)
      }

      rows.push({
        service_case_id: serviceCaseId,
        file_name: file.name,
        file_path: uploaded.path,
        file_bucket: 'service-attachments',
        file_type: file.type || null,
        uploaded_by: profile.id,
      })
    }

    if (rows.length) {
      const { error: insertError } = await supabase.from('warranty_attachments').insert(rows)
      if (insertError) throw new Error(insertError.message)
    }
  }

  async function save() {
    if (!values.issueTitle.trim()) {
      setError('Issue title required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        warranty_id: warrantyId,
        issue_title: values.issueTitle.trim(),
        issue_description: values.issueDescription.trim() || null,
        reported_at: values.reportedAt ? new Date(values.reportedAt).toISOString() : new Date().toISOString(),
        inspection_result: values.inspectionResult.trim() || null,
        is_mechanical_damage: values.isMechanicalDamage,
        is_under_warranty: values.isUnderWarranty,
        action_taken: values.actionTaken.trim() || null,
        replaced_unit: values.replacedUnit.trim() || null,
        sent_to_factory: values.sentToFactory,
        factory_sent_at: values.factorySentAt ? new Date(values.factorySentAt).toISOString() : null,
        factory_returned_at: values.factoryReturnedAt ? new Date(values.factoryReturnedAt).toISOString() : null,
        closed_at: values.closedAt ? new Date(values.closedAt).toISOString() : null,
        outcome: values.outcome || null,
        notes: values.notes.trim() || null,
        created_by: serviceCase?.created_by || profile.id,
      }

      const query = serviceCase
        ? supabase.from('service_cases').update(payload).eq('id', serviceCase.id)
        : supabase.from('service_cases').insert(payload)

      const { data: savedRows, error: saveError } = await query.select('*').limit(1)
      if (saveError) throw new Error(saveError.message)

      const savedCase = (savedRows || [])[0] as ServiceCaseRecord | undefined
      if (!savedCase?.id) throw new Error('Service case could not be saved.')

      await uploadAttachments(savedCase.id)

      router.push(`/admin/warranty/${warrantyId}`)
      router.refresh()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Service case save failed.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Field label="Issue title *">
          <input value={values.issueTitle} onChange={(event) => setValue('issueTitle', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Reported at">
          <input type="datetime-local" value={values.reportedAt} onChange={(event) => setValue('reportedAt', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Inspection result">
          <input value={values.inspectionResult} onChange={(event) => setValue('inspectionResult', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Action taken">
          <input value={values.actionTaken} onChange={(event) => setValue('actionTaken', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Mechanical damage">
          <select value={String(values.isMechanicalDamage)} onChange={(event) => setValue('isMechanicalDamage', event.target.value === 'true' ? true : event.target.value === 'false' ? false : null)} style={ui.input}>
            <option value="null">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="Under warranty">
          <select value={String(values.isUnderWarranty)} onChange={(event) => setValue('isUnderWarranty', event.target.value === 'true' ? true : event.target.value === 'false' ? false : null)} style={ui.input}>
            <option value="null">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="Replaced unit / part">
          <input value={values.replacedUnit} onChange={(event) => setValue('replacedUnit', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Sent to factory">
          <select value={String(values.sentToFactory)} onChange={(event) => setValue('sentToFactory', event.target.value === 'true')} style={ui.input}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
        <Field label="Factory sent at">
          <input type="datetime-local" value={values.factorySentAt} onChange={(event) => setValue('factorySentAt', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Factory returned at">
          <input type="datetime-local" value={values.factoryReturnedAt} onChange={(event) => setValue('factoryReturnedAt', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Closed at">
          <input type="datetime-local" value={values.closedAt} onChange={(event) => setValue('closedAt', event.target.value)} style={ui.input} />
        </Field>
        <Field label="Outcome">
          <select value={values.outcome} onChange={(event) => setValue('outcome', event.target.value as ServiceCaseFormValues['outcome'])} style={ui.input}>
            <option value="">Select outcome</option>
            <option value="repaired">repaired</option>
            <option value="replaced">replaced</option>
            <option value="rejected">rejected</option>
            <option value="returned_from_factory">returned_from_factory</option>
            <option value="closed_no_fault_found">closed_no_fault_found</option>
          </select>
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Issue description">
            <textarea value={values.issueDescription} onChange={(event) => setValue('issueDescription', event.target.value)} style={ui.textarea} />
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Internal notes">
            <textarea value={values.notes} onChange={(event) => setValue('notes', event.target.value)} style={ui.textarea} />
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Attachments">
            <input
              type="file"
              multiple
              accept=".pdf,image/*,video/mp4,video/quicktime"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              style={ui.input}
            />
          </Field>
          {files.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, background: '#F3F4F6', color: '#374151' }}>
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>
          {error}
        </div>
      ) : null}

      <div style={{ ...ui.panel, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
            {serviceCase ? 'Update service case' : 'Create service case'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
            Every service case stays linked to the selected warranty.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={`/admin/warranty/${warrantyId}`} style={ui.secondaryButton}>
            Cancel
          </Link>
          <button type="button" onClick={save} disabled={saving} style={{ ...ui.primaryButton, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Service Case'}
          </button>
        </div>
      </div>
    </div>
  )
}
