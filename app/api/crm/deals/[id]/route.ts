import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'
import { CRM_DEAL_CURRENCIES } from '@/app/lib/crm-types'

// Editable general deal fields (checked individually below): title, party_id,
// contact_id, owner_id, expected_value, currency, probability_percent,
// expected_close_date, notes, source. `status`/`stage_id` are intentionally
// excluded: stage moves stay on the dedicated PATCH .../stage route
// (Milestone 1), and `status` (open/won_pending_setup/won/lost) is
// display-only in Milestone 2 — the Won/Lost workflow actions are a later
// milestone (CRM_PHASE1_M2_REPORT.md).

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { id } = await context.params

    const { data: deal, error: dealError } = await tokenClient
      .from('crm_deals')
      .select('*, crm_pipeline_stages(id, key, label, is_won, is_lost), crm_pipelines(id, name)')
      .eq('id', id)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ ok: false, error: 'გარიგება ვერ მოიძებნა.' }, { status: 404 })
    }

    const [productsResult, tasksResult, activitiesResult, partyResult, contactResult, ownerResult] = await Promise.all([
      tokenClient.from('crm_deal_products').select('*, products(id, name, slug, brand)').eq('deal_id', id),
      tokenClient.from('crm_tasks').select('*').eq('deal_id', id).order('due_at', { ascending: true, nullsFirst: false }),
      tokenClient.from('crm_activities').select('*').eq('deal_id', id).order('created_at', { ascending: false }).limit(50),
      deal.party_id
        ? tokenClient.from('erp_parties').select('id, name, city, is_individual').eq('id', deal.party_id).single()
        : Promise.resolve({ data: null, error: null }),
      deal.contact_id
        ? tokenClient.from('crm_contacts').select('id, full_name, phone, email').eq('id', deal.contact_id).single()
        : Promise.resolve({ data: null, error: null }),
      deal.owner_id
        ? tokenClient.from('profiles').select('id, full_name').eq('id', deal.owner_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])

    return NextResponse.json({
      ok: true,
      deal,
      party: partyResult.data || null,
      contact: contactResult.data || null,
      owner: ownerResult.data || null,
      products: productsResult.data || [],
      tasks: tasksResult.data || [],
      activities: activitiesResult.data || [],
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'გარიგება ვერ ჩაიტვირთა.'
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

    const { tokenClient } = await requireCrmSession(accessToken)
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const updates: Record<string, unknown> = {}

    if ('title' in body) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) {
        return NextResponse.json({ ok: false, error: 'გარიგების სათაური სავალდებულოა.' }, { status: 400 })
      }
      updates.title = title
    }
    if ('party_id' in body) updates.party_id = typeof body.party_id === 'string' && body.party_id ? body.party_id : null
    if ('contact_id' in body) updates.contact_id = typeof body.contact_id === 'string' && body.contact_id ? body.contact_id : null
    if ('owner_id' in body) updates.owner_id = typeof body.owner_id === 'string' && body.owner_id ? body.owner_id : null
    if ('expected_value' in body) {
      const value = Number(body.expected_value)
      updates.expected_value = Number.isFinite(value) ? value : 0
    }
    if ('currency' in body) {
      const currency = String(body.currency)
      if (!(CRM_DEAL_CURRENCIES as readonly string[]).includes(currency)) {
        return NextResponse.json({ ok: false, error: 'ვალუტა არასწორია.' }, { status: 400 })
      }
      updates.currency = currency
    }
    if ('probability_percent' in body) {
      const value = Number(body.probability_percent)
      updates.probability_percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
    }
    if ('expected_close_date' in body) {
      updates.expected_close_date = typeof body.expected_close_date === 'string' && body.expected_close_date ? body.expected_close_date : null
    }
    if ('notes' in body) {
      updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    }
    if ('source' in body) {
      updates.source = typeof body.source === 'string' && body.source.trim() ? body.source.trim() : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'განახლებისთვის ველები არ არის მითითებული.' }, { status: 400 })
    }

    const { data, error } = await tokenClient
      .from('crm_deals')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deal: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'გარიგების განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
