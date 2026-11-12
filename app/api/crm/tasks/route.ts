import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'
import { CRM_TASK_PRIORITIES, CRM_TASK_TYPES } from '@/app/lib/crm-types'

// Supports the Follow-ups filtered views (due today / overdue / upcoming /
// completed) via query params, in addition to the general Tasks list —
// Follow-ups is a view over this same table, not a separate one
// (CRM_ARCHITECTURE_PLAN.md Section 15).
export async function GET(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assigned_to')
    const partyId = searchParams.get('party_id')
    const dealId = searchParams.get('deal_id')
    const leadId = searchParams.get('lead_id')
    const view = searchParams.get('view') // due_today | overdue | upcoming | completed

    let query = tokenClient.from('crm_tasks').select('*')

    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (partyId) query = query.eq('party_id', partyId)
    if (dealId) query = query.eq('deal_id', dealId)
    if (leadId) query = query.eq('lead_id', leadId)

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    if (view === 'due_today') {
      query = query.gte('due_at', startOfToday).lt('due_at', startOfTomorrow).not('status', 'in', '(done,cancelled)')
    } else if (view === 'overdue') {
      query = query.lt('due_at', startOfToday).not('status', 'in', '(done,cancelled)')
    } else if (view === 'upcoming') {
      query = query.gte('due_at', startOfTomorrow).not('status', 'in', '(done,cancelled)')
    } else if (view === 'completed') {
      query = query.eq('status', 'done')
    }

    query = query.order('due_at', { ascending: true, nullsFirst: false })

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, tasks: data || [] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'დავალებები ვერ ჩაიტვირთა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient, user } = await requireCrmSession(accessToken)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const type = String(body.type || '')
    if (!(CRM_TASK_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ ok: false, error: 'დავალების ტიპი არასწორია.' }, { status: 400 })
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return NextResponse.json({ ok: false, error: 'დავალების სათაური სავალდებულოა.' }, { status: 400 })
    }

    const priority = typeof body.priority === 'string' && (CRM_TASK_PRIORITIES as readonly string[]).includes(body.priority)
      ? body.priority
      : 'normal'

    const insertPayload = {
      type,
      title,
      description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
      priority,
      due_at: typeof body.due_at === 'string' && body.due_at ? body.due_at : null,
      assigned_to: typeof body.assigned_to === 'string' && body.assigned_to ? body.assigned_to : null,
      lead_id: typeof body.lead_id === 'string' && body.lead_id ? body.lead_id : null,
      deal_id: typeof body.deal_id === 'string' && body.deal_id ? body.deal_id : null,
      party_id: typeof body.party_id === 'string' && body.party_id ? body.party_id : null,
      contact_id: typeof body.contact_id === 'string' && body.contact_id ? body.contact_id : null,
      created_by: user.id,
    }

    const { data, error } = await tokenClient.from('crm_tasks').insert(insertPayload).select('*').single()
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    try {
      await tokenClient.from('crm_activities').insert({
        type: 'task_created',
        task_id: data.id,
        deal_id: data.deal_id,
        party_id: data.party_id,
        lead_id: data.lead_id,
        body: `დავალება შეიქმნა: ${data.title}`,
        actor_id: user.id,
      })
    } catch {
      // best-effort logging — must never fail task creation itself
    }

    return NextResponse.json({ ok: true, task: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'დავალების შექმნა ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
