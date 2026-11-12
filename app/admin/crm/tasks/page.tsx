'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CRM_TASK_STATUS_LABELS,
  CRM_TASK_TYPE_LABELS,
  CRM_TASK_TYPES,
  CRM_TASK_PRIORITY_LABELS,
  CRM_TASK_PRIORITY_TONES,
  type CrmTask,
  type CrmTaskStatus,
} from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  CrmStatusBadge,
  EmptyState,
  Field,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../_components/CrmUi'
import { TaskForm } from '../_components/TaskForm'

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ka-GE')
}

export default function CrmTasksPage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    if (!accessToken) return
    setListLoading(true)
    setLoadError('')
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)

    try {
      const response = await fetch(`/api/crm/tasks?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'დავალებები ვერ ჩაიტვირთა.')
      setTasks(result.tasks)
    } catch (loadErr) {
      setLoadError(loadErr instanceof Error ? loadErr.message : 'დავალებები ვერ ჩაიტვირთა.')
    } finally {
      setListLoading(false)
    }
  }, [accessToken, statusFilter, typeFilter])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  async function setStatus(taskId: string, status: CrmTaskStatus) {
    if (!accessToken) return
    setBusyId(taskId)
    try {
      const response = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'სტატუსის განახლება ვერ მოხერხდა.')
      await loadTasks()
    } catch (statusError) {
      setLoadError(statusError instanceof Error ? statusError.message : 'სტატუსის განახლება ვერ მოხერხდა.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="დავალებები"
      subtitle="ყველა CRM დავალება — ზარები, შეხვედრები, ინსტალაციები, ტრენინგები და სხვა."
      profile={profile}
      actions={<button type="button" onClick={() => setShowForm((current) => !current)} style={ui.primaryButton}>{showForm ? 'დახურვა' : '+ ახალი დავალება'}</button>}
    >
      {showForm ? (
        <TaskForm accessToken={accessToken} onSaved={() => { setShowForm(false); void loadTasks() }} onCancel={() => setShowForm(false)} />
      ) : null}

      <div style={{ ...ui.panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Field label="ტიპი">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={ui.input}>
            <option value="">ყველა ტიპი</option>
            {CRM_TASK_TYPES.map((type) => <option key={type} value={type}>{CRM_TASK_TYPE_LABELS[type]}</option>)}
          </select>
        </Field>
        <Field label="სტატუსი">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={ui.input}>
            <option value="">ყველა სტატუსი</option>
            {Object.entries(CRM_TASK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>

      {loadError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{loadError}</div>
      ) : listLoading ? (
        <LoadingView label="დავალებები იტვირთება..." />
      ) : tasks.length === 0 ? (
        <EmptyState title="დავალება ვერ მოიძებნა" description="შეცვალე ფილტრები ან დაამატე ახალი დავალება." />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 1fr 1fr', gap: 12, padding: '14px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: colors.muted }}>
            <span>დავალება</span>
            <span>ტიპი</span>
            <span>პრიორიტეტი</span>
            <span>ვადა</span>
            <span>ქმედება</span>
          </div>
          {tasks.map((task) => (
            <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 1fr 1fr', gap: 12, padding: '14px 16px', borderTop: '1px solid rgba(15,23,42,0.07)', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>{task.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>{CRM_TASK_STATUS_LABELS[task.status]}</p>
              </div>
              <span style={{ fontSize: 13 }}>{CRM_TASK_TYPE_LABELS[task.type]}</span>
              <CrmStatusBadge label={CRM_TASK_PRIORITY_LABELS[task.priority]} tone={CRM_TASK_PRIORITY_TONES[task.priority]} />
              <span style={{ fontSize: 12, color: colors.muted }}>{formatDateTime(task.due_at)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {task.status !== 'done' ? (
                  <button type="button" disabled={busyId === task.id} onClick={() => setStatus(task.id, 'done')} style={{ ...ui.secondaryButton, padding: '6px 10px', fontSize: 12 }}>
                    დასრულება
                  </button>
                ) : (
                  <button type="button" disabled={busyId === task.id} onClick={() => setStatus(task.id, 'pending')} style={{ ...ui.secondaryButton, padding: '6px 10px', fontSize: 12 }}>
                    გახსნა
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </CrmAdminShell>
  )
}
