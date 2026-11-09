import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'
import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from '@/app/lib/crm-types'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { id } = await context.params

    const { data, error } = await tokenClient.from('crm_tasks').select('*').eq('id', id).single()
    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'დავალება ვერ მოიძებნა.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, task: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'დავალება ვერ ჩაიტვირთა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient, user } = await requireCrmSession(accessToken)
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const { data: existingTask, error: existingError } = await tokenClient
      .from('crm_tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (existingError || !existingTask) {
      return NextResponse.json({ ok: false, error: 'დავალება ვერ მოიძებნა.' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    if ('title' in body) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) return NextResponse.json({ ok: false, error: 'სათაური სავალდებულოა.' }, { status: 400 })
      updates.title = title
    }
    if ('description' in body) {
      updates.description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null
    }
    if ('priority' in body) {
      const priority = String(body.priority)
      if (!(CRM_TASK_PRIORITIES as readonly string[]).includes(priority)) {
        return NextResponse.json({ ok: false, error: 'პრიორიტეტი არასწორია.' }, { status: 400 })
      }
      updates.priority = priority
    }
    if ('due_at' in body) {
      updates.due_at = typeof body.due_at === 'string' && body.due_at ? body.due_at : null
    }
    if ('assigned_to' in body) {
      updates.assigned_to = typeof body.assigned_to === 'string' && body.assigned_to ? body.assigned_to : null
    }
    for (const field of ['lead_id', 'deal_id', 'party_id', 'contact_id'] as const) {
      if (field in body) {
        updates[field] = typeof body[field] === 'string' && body[field] ? body[field] : null
      }
    }

    let statusChangingToDone = false
    if ('status' in body) {
      const nextStatus = String(body.status)
      if (!(CRM_TASK_STATUSES as readonly string[]).includes(nextStatus)) {
        return NextResponse.json({ ok: false, error: 'სტატუსი არასწორია.' }, { status: 400 })
      }
      updates.status = nextStatus
      if (nextStatus === 'done' && existingTask.status !== 'done') {
        statusChangingToDone = true
        updates.completed_at = new Date().toISOString()
      }
      if (nextStatus !== 'done') {
        updates.completed_at = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'განახლებისთვის ველები არ არის მითითებული.' }, { status: 400 })
    }

    const { data, error } = await tokenClient
      .from('crm_tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (statusChangingToDone) {
      // A completed follow_up task logs the more specific 'follow_up' timeline
      // event; any other task type logs the generic 'task_completed' event —
      // never both, to avoid duplicate entries for the same completion.
      // Best-effort — a logging failure must never fail the completion itself.
      try {
        await tokenClient.from('crm_activities').insert({
          type: data.type === 'follow_up' ? 'follow_up' : 'task_completed',
          task_id: data.id,
          deal_id: data.deal_id,
          party_id: data.party_id,
          lead_id: data.lead_id,
          body: `დავალება დასრულდა: ${data.title}`,
          actor_id: user.id,
        })
      } catch {
        // intentionally ignored — see comment above
      }
    }

    return NextResponse.json({ ok: true, task: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'დავალების განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
