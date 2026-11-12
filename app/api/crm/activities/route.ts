import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

export async function GET(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { searchParams } = new URL(request.url)
    const partyId = searchParams.get('party_id')
    const dealId = searchParams.get('deal_id')
    const leadId = searchParams.get('lead_id')
    const limitParam = Number(searchParams.get('limit'))
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50

    let query = tokenClient.from('crm_activities').select('*').order('created_at', { ascending: false }).limit(limit)
    if (partyId) query = query.eq('party_id', partyId)
    if (dealId) query = query.eq('deal_id', dealId)
    if (leadId) query = query.eq('lead_id', leadId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, activities: data || [] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'აქტივობები ვერ ჩაიტვირთა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

// This endpoint only ever creates manual 'note' activities — every other
// activity type is written server-side by the specific action route that
// produces it (task creation/completion, deal creation, stage moves, product
// additions). This keeps activity creation reliable: a client can never
// fabricate a system-looking entry (e.g. a fake 'erp_sale_created' row) by
// posting here, and `actor_id` always comes from the session, never the body.
export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient, user } = await requireCrmSession(accessToken)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const noteBody = typeof body.body === 'string' ? body.body.trim() : ''
    if (!noteBody) {
      return NextResponse.json({ ok: false, error: 'შენიშვნის ტექსტი სავალდებულოა.' }, { status: 400 })
    }

    const insertPayload = {
      type: 'note' as const,
      body: noteBody,
      party_id: typeof body.party_id === 'string' && body.party_id ? body.party_id : null,
      deal_id: typeof body.deal_id === 'string' && body.deal_id ? body.deal_id : null,
      lead_id: typeof body.lead_id === 'string' && body.lead_id ? body.lead_id : null,
      actor_id: user.id,
    }

    const { data, error } = await tokenClient.from('crm_activities').insert(insertPayload).select('*').single()
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, activity: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'შენიშვნის დამატება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
