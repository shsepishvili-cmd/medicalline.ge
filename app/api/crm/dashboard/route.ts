import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

// All server-side, protected by requireCrmSession() like every other CRM
// route — the dashboard is not a special case.
//
// "Won deals this period" deliberately counts crm_deals.status = 'won', not
// stage.is_won — moving a card into the Kanban "Won" column is a visual
// position only (Milestone 1 safety design) and never sets status='won' by
// itself. Since Milestone 2 does not implement the Won workflow, this metric
// will legitimately read 0 until that later milestone ships — that is
// expected, not a bug (see CRM_PHASE1_M2_REPORT.md).
export async function GET(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      newLeadsResult,
      openDealsResult,
      tasksDueTodayResult,
      overdueFollowUpsResult,
      wonDealsResult,
      recentActivitiesResult,
    ] = await Promise.all([
      tokenClient.from('crm_leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      tokenClient.from('crm_deals').select('id, expected_value').eq('status', 'open'),
      tokenClient
        .from('crm_tasks')
        .select('id', { count: 'exact', head: true })
        .gte('due_at', startOfToday)
        .lt('due_at', startOfTomorrow)
        .not('status', 'in', '(done,cancelled)'),
      tokenClient
        .from('crm_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'follow_up')
        .lt('due_at', startOfToday)
        .not('status', 'in', '(done,cancelled)'),
      tokenClient
        .from('crm_deals')
        .select('id, expected_value')
        .eq('status', 'won')
        .gte('won_at', startOfMonth),
      tokenClient.from('crm_activities').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    const openDeals = openDealsResult.data || []
    const wonDeals = wonDealsResult.data || []

    const pipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.expected_value || 0), 0)
    const wonValueThisPeriod = wonDeals.reduce((sum, deal) => sum + Number(deal.expected_value || 0), 0)

    return NextResponse.json({
      ok: true,
      metrics: {
        newLeads: newLeadsResult.count || 0,
        openDeals: openDeals.length,
        pipelineValue,
        tasksDueToday: tasksDueTodayResult.count || 0,
        overdueFollowUps: overdueFollowUpsResult.count || 0,
        wonDealsThisPeriod: wonDeals.length,
        wonValueThisPeriod,
        recentActivities: recentActivitiesResult.data || [],
      },
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'დაფის მონაცემები ვერ ჩაიტვირთა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
