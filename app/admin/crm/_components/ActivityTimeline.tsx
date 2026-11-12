'use client'

import { CRM_ACTIVITY_TYPE_LABELS, type CrmActivity } from '@/app/lib/crm-types'
import { colors, ui, EmptyState } from './CrmUi'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ka-GE')
}

export function ActivityTimeline({ activities }: { activities: CrmActivity[] }) {
  if (activities.length === 0) {
    return <EmptyState title="აქტივობა არ არის" description="ეს ჩანაწერი ჯერ არცერთ მოვლენას არ შეიცავს." />
  }

  return (
    <div style={{ ...ui.panel, padding: 0, overflow: 'hidden' }}>
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          style={{
            padding: '12px 16px',
            borderTop: index === 0 ? 'none' : '1px solid rgba(15, 23, 42, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.green }}>
              {CRM_ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
            </span>
            <span style={{ fontSize: 11, color: colors.muted }}>{formatDateTime(activity.created_at)}</span>
          </div>
          {activity.body ? <p style={{ margin: 0, fontSize: 13, color: colors.text }}>{activity.body}</p> : null}
        </div>
      ))}
    </div>
  )
}
