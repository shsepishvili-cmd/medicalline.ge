import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

// Milestone 1 safety boundary: this route updates crm_deals.stage_id ONLY.
// It never touches crm_deals.status, never writes erp_sales/erp_sale_items,
// never creates a warranty, and never creates crm_tasks — even when the target
// stage is the pipeline's "won" or "lost" stage. That business logic (the
// two-step Won workflow) is deferred to a later milestone (see
// CRM_ARCHITECTURE_PLAN.md Section 18).
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient, user } = await requireCrmSession(accessToken)
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const stageId = typeof body.stage_id === 'string' ? body.stage_id.trim() : ''
    if (!stageId) {
      return NextResponse.json({ ok: false, error: 'stage_id სავალდებულოა.' }, { status: 400 })
    }

    const { data: deal, error: dealError } = await tokenClient
      .from('crm_deals')
      .select('id, pipeline_id, stage_id, party_id')
      .eq('id', id)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ ok: false, error: 'გარიგება ვერ მოიძებნა.' }, { status: 404 })
    }

    const { data: targetStage, error: stageError } = await tokenClient
      .from('crm_pipeline_stages')
      .select('id, pipeline_id, label')
      .eq('id', stageId)
      .single()

    if (stageError || !targetStage) {
      return NextResponse.json({ ok: false, error: 'ეტაპი ვერ მოიძებნა.' }, { status: 404 })
    }

    if (targetStage.pipeline_id !== deal.pipeline_id) {
      return NextResponse.json({ ok: false, error: 'ეტაპი სხვა პაიფლაინს ეკუთვნის.' }, { status: 400 })
    }

    if (targetStage.id === deal.stage_id) {
      return NextResponse.json({ ok: true, deal })
    }

    const { data: updatedDeal, error: updateError } = await tokenClient
      .from('crm_deals')
      .update({ stage_id: targetStage.id })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    await tokenClient.from('crm_activities').insert({
      type: 'stage_change',
      deal_id: id,
      party_id: deal.party_id,
      body: `ეტაპი შეიცვალა: ${targetStage.label}`,
      metadata: { from_stage_id: deal.stage_id, to_stage_id: targetStage.id },
      actor_id: user.id,
    })

    return NextResponse.json({ ok: true, deal: updatedDeal })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ეტაპის განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
