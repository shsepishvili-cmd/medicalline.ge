'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CrmDashboardMetrics } from '@/app/lib/crm-types'
import { AuthBlockedView, CrmAdminShell, InfoStat, LoadingView, ui, useCrmAdminGate } from './_components/CrmUi'
import { ActivityTimeline } from './_components/ActivityTimeline'

export default function CrmDashboardPage() {
  const { loading, error, profile, accessToken } = useCrmAdminGate()
  const [metrics, setMetrics] = useState<CrmDashboardMetrics | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    let active = true
    setDataLoading(true)
    setLoadError('')

    fetch('/api/crm/dashboard', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return
        if (!result?.ok) {
          setLoadError(result?.error || 'დაფის მონაცემები ვერ ჩაიტვირთა.')
          return
        }
        setMetrics(result.metrics)
      })
      .catch(() => {
        if (active) setLoadError('დაფის მონაცემები ვერ ჩაიტვირთა.')
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  if (loading) return <LoadingView label="CRM იტვირთება..." />
  if (error || !profile || !accessToken) return <AuthBlockedView message={error || 'წვდომა აკრძალულია.'} />

  return (
    <CrmAdminShell
      title="CRM Dashboard"
      subtitle="ლიდები, გაყიდვების პაიფლაინი, დავალებები და ბოლო აქტივობა ერთ ადგილას."
      profile={profile}
    >
      {loadError ? (
        <div style={{ ...ui.panel, borderColor: 'rgba(185, 28, 28, 0.18)', background: '#FEF2F2', color: '#991B1B' }}>{loadError}</div>
      ) : dataLoading || !metrics ? (
        <LoadingView label="მეტრიკები იტვირთება..." />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <InfoStat value={metrics.newLeads} label="ახალი ლიდი" />
            <InfoStat value={metrics.openDeals} label="აქტიური გარიგება" />
            <InfoStat value={`${metrics.pipelineValue.toFixed(0)} GEL`} label="პაიფლაინის ღირებულება" />
            <InfoStat value={metrics.tasksDueToday} label="დღეს ვადიანი დავალება" />
            <InfoStat value={metrics.overdueFollowUps} label="ვადაგადაცილებული follow-up" />
            <InfoStat value={metrics.wonDealsThisPeriod} label="მოგებული (ამ თვეს)" />
          </div>

          <div style={{ ...ui.panel, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/admin/crm/leads" style={ui.primaryButton}>ლიდების სია</Link>
            <Link href="/admin/crm/pipeline" style={ui.secondaryButton}>გაყიდვების დაფა</Link>
            <Link href="/admin/crm/customers" style={ui.secondaryButton}>კლიენტები</Link>
            <Link href="/admin/crm/tasks" style={ui.secondaryButton}>დავალებები</Link>
            <Link href="/admin/crm/follow-ups" style={ui.secondaryButton}>Follow-ups</Link>
          </div>

          <div>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>ბოლო აქტივობა</p>
            <ActivityTimeline activities={metrics.recentActivities} />
          </div>
        </>
      )}
    </CrmAdminShell>
  )
}
