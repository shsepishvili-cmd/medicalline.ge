import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'
import { CRM_DEAL_CURRENCIES } from '@/app/lib/crm-types'

export async function GET(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get('pipeline_id')

    let query = tokenClient.from('crm_deals').select('*').order('created_at', { ascending: false })
    if (pipelineId) query = query.eq('pipeline_id', pipelineId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deals: data || [] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'გარიგებები ვერ ჩაიტვირთა.'
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

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return NextResponse.json({ ok: false, error: 'გარიგების სათაური სავალდებულოა.' }, { status: 400 })
    }

    let pipelineId = typeof body.pipeline_id === 'string' ? body.pipeline_id : ''
    let stageId = typeof body.stage_id === 'string' ? body.stage_id : ''

    if (!pipelineId) {
      const { data: defaultPipeline, error: pipelineError } = await tokenClient
        .from('crm_pipelines')
        .select('id')
        .eq('is_default', true)
        .single()

      if (pipelineError || !defaultPipeline) {
        return NextResponse.json({ ok: false, error: 'ნაგულისხმევი პაიფლაინი ვერ მოიძებნა.' }, { status: 500 })
      }
      pipelineId = defaultPipeline.id
    }

    if (!stageId) {
      const { data: firstStage, error: stageError } = await tokenClient
        .from('crm_pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()

      if (stageError || !firstStage) {
        return NextResponse.json({ ok: false, error: 'საწყისი ეტაპი ვერ მოიძებნა.' }, { status: 500 })
      }
      stageId = firstStage.id
    }

    const currency = (CRM_DEAL_CURRENCIES as readonly string[]).includes(String(body.currency))
      ? (body.currency as string)
      : 'GEL'

    const expectedValue = Number(body.expected_value)
    const probability = Number(body.probability_percent)

    const insertPayload = {
      pipeline_id: pipelineId,
      stage_id: stageId,
      title,
      lead_id: typeof body.lead_id === 'string' ? body.lead_id : null,
      party_id: typeof body.party_id === 'string' ? body.party_id : null,
      contact_id: typeof body.contact_id === 'string' ? body.contact_id : null,
      owner_id: typeof body.owner_id === 'string' ? body.owner_id : null,
      expected_value: Number.isFinite(expectedValue) ? expectedValue : 0,
      currency,
      probability_percent: Number.isFinite(probability) ? Math.min(100, Math.max(0, probability)) : 0,
      expected_close_date: typeof body.expected_close_date === 'string' ? body.expected_close_date : null,
      source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : null,
      created_by: user.id,
    }

    const { data, error } = await tokenClient.from('crm_deals').insert(insertPayload).select('*').single()
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Milestone 2: log the deal's creation on the Customer 360 / deal timeline.
    // Best-effort — a logging failure must never fail the deal creation itself.
    try {
      await tokenClient.from('crm_activities').insert({
        type: 'deal_created',
        deal_id: data.id,
        party_id: data.party_id,
        body: `გარიგება შეიქმნა: ${data.title}`,
        actor_id: user.id,
      })
    } catch {
      // intentionally ignored — see comment above
    }

    return NextResponse.json({ ok: true, deal: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'გარიგების შექმნა ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
