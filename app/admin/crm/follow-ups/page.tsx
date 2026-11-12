'use client'

import { useCallback, useEffect, useState } from 'react'
import { CRM_TASK_PRIORITY_LABELS, CRM_TASK_PRIORITY_TONES, type CrmTask } from '@/app/lib/crm-types'
import {
  AuthBlockedView,
  colors,
  CrmAdminShell,
  CrmStatusBadge,
  EmptyState,
  LoadingView,
  ui,
  useCrmAdminGate,
} from '../_components/CrmUi'

const VIEWS = [
  { id: 'overdue', label: 'ვადაგადაცილებული' },
  { id: 'due_today', label: 'დღეს' },
  { id: 'upcoming', label: 'მომავალი' },
  { id: 'completed', label: 'დასრულებული' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ka-GE')
}

export default function CrmFollowUpsPage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()
  const [view, setView] = useState<ViewId>('overdue')
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadFollowUps = useCallback(async () => {
    if (!accessToken) return
    setListLoading(true)
    setLoadError('')
    try {
      const response = await fetch(`/api/crm/tasks?type=follow_up&view=${view}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'შემდგომი კონტაქტები ვერ ჩაიტვირთა.')
      setTasks(result.tasks)
    } catch (loadErr) {
      setLoadError(loadErr instanceof Error ? loadErr.message : 'შემდგომი კონტაქტები ვერ ჩაიტვირთა.')
    } finally {
      setListLoading(false)
    }
  }, [accessToken, view])

  useEffect(() => {
    void loadFollowUps()
  }, [loadFollowUps])

  async function markDone(taskId: string) {
    if (!accessToken) return
    setBusyId(taskId)
    try {
      const response = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'done' }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'დასრულება ვერ მოხერხდა.')
      await loadFollowUps()
    } catch (doneError) {
      setLoadError(doneError instanceof Error ? doneError.message : 'დასრულება ვერ მოხერხდა.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingView label="იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="შემდგომი კონტაქტები"
      subtitle="crm_tasks-ის გაფილტრული ხედი (type = follow_up) — ცალკე ცხრილი არ არსებობს."
      profile={profile}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: view === item.id ? `2px solid ${colors.green}` : '1px solid rgba(15,23,42,0.12)',
              background: view === item.id ? colors.greenSoft : '#fff',
              color: colors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{loadError}</div>
      ) : listLoading ? (
        <LoadingView label="იტვირთება..." />
      ) : tasks.length === 0 ? (
        <EmptyState title="აქ არაფერია" description="ამ ხედში შემდგომი კონტაქტი ამჟამად არ არის." />
      ) : (
        <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
          {tasks.map((task, index) => (
            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: index === 0 ? 'none' : '1px solid rgba(15,23,42,0.07)' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>{task.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>{formatDateTime(task.due_at)}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CrmStatusBadge label={CRM_TASK_PRIORITY_LABELS[task.priority]} tone={CRM_TASK_PRIORITY_TONES[task.priority]} />
                {task.status !== 'done' ? (
                  <button type="button" disabled={busyId === task.id} onClick={() => markDone(task.id)} style={{ ...ui.secondaryButton, padding: '6px 10px', fontSize: 12 }}>
                    დასრულება
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </CrmAdminShell>
  )
}
