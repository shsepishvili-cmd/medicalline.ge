'use client'

import { useState } from 'react'
import {
  CRM_TASK_PRIORITIES,
  CRM_TASK_PRIORITY_LABELS,
  CRM_TASK_TYPE_LABELS,
  CRM_TASK_TYPES,
  type CrmTask,
  type CrmTaskPriority,
  type CrmTaskType,
} from '@/app/lib/crm-types'
import { Field, ui } from './CrmUi'

export function TaskForm({
  accessToken,
  defaultPartyId,
  defaultDealId,
  defaultLeadId,
  onSaved,
  onCancel,
}: {
  accessToken: string
  defaultPartyId?: string | null
  defaultDealId?: string | null
  defaultLeadId?: string | null
  onSaved: (task: CrmTask) => void
  onCancel?: () => void
}) {
  const [type, setType] = useState<CrmTaskType>('follow_up')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<CrmTaskPriority>('normal')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('სათაური სავალდებულოა.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
          party_id: defaultPartyId || undefined,
          deal_id: defaultDealId || undefined,
          lead_id: defaultLeadId || undefined,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'დავალების შექმნა ვერ მოხერხდა.')
      }
      setTitle('')
      setDescription('')
      setDueAt('')
      onSaved(result.task as CrmTask)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'დავალების შექმნა ვერ მოხერხდა.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...ui.panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Field label="ტიპი">
          <select value={type} onChange={(event) => setType(event.target.value as CrmTaskType)} style={ui.input}>
            {CRM_TASK_TYPES.map((item) => (
              <option key={item} value={item}>{CRM_TASK_TYPE_LABELS[item]}</option>
            ))}
          </select>
        </Field>
        <Field label="პრიორიტეტი">
          <select value={priority} onChange={(event) => setPriority(event.target.value as CrmTaskPriority)} style={ui.input}>
            {CRM_TASK_PRIORITIES.map((item) => (
              <option key={item} value={item}>{CRM_TASK_PRIORITY_LABELS[item]}</option>
            ))}
          </select>
        </Field>
        <Field label="ვადა">
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} style={ui.input} />
        </Field>
      </div>
      <Field label="სათაური">
        <input value={title} onChange={(event) => setTitle(event.target.value)} style={ui.input} placeholder="მაგ: დარეკვა კლინიკაში" />
      </Field>
      <Field label="აღწერა">
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} style={ui.textarea} />
      </Field>
      {error ? <div style={{ padding: '10px 14px', borderRadius: 12, background: '#FCEBEB', color: '#9B1C1C', fontSize: 13 }}>{error}</div> : null}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={saving} style={{ ...ui.primaryButton, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'ინახება...' : 'დავალების დამატება'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} style={ui.secondaryButton}>გაუქმება</button>
        ) : null}
      </div>
    </form>
  )
}
