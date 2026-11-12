import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

// Aggregated Customer 360 payload — one authenticated round trip instead of
// the page firing 6+ separate client queries, per CRM_ARCHITECTURE_PLAN.md
// Section 14. Read-only: this route never creates/modifies anything.
export async function GET(request: NextRequest, context: { params: Promise<{ partyId: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { partyId } = await context.params

    const { data: account, error: accountError } = await tokenClient
      .from('erp_parties')
      .select('id, company_id, party_type, code, name, tax_id, phone, email, address, created_at, updated_at, profile_id, crm_owner_id, lead_source, city, is_individual')
      .eq('id', partyId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ ok: false, error: 'კლიენტი ვერ მოიძებნა.' }, { status: 404 })
    }

    const [ownerResult, contactsResult, dealsResult, tasksResult, activitiesResult, warrantiesResult] = await Promise.all([
      account.crm_owner_id
        ? tokenClient.from('profiles').select('id, full_name').eq('id', account.crm_owner_id).single()
        : Promise.resolve({ data: null, error: null }),
      tokenClient
        .from('crm_contacts')
        .select('*')
        .eq('party_id', partyId)
        .is('archived_at', null)
        .order('is_primary', { ascending: false }),
      tokenClient
        .from('crm_deals')
        .select('*, crm_pipeline_stages(label, is_won, is_lost)')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false }),
      tokenClient
        .from('crm_tasks')
        .select('*')
        .eq('party_id', partyId)
        .order('due_at', { ascending: true, nullsFirst: false }),
      tokenClient
        .from('crm_activities')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false })
        .limit(50),
      tokenClient
        .from('warranties')
        .select('id, warranty_number, brand, product_name, model, serial_number, warranty_start, warranty_end, status')
        .eq('erp_party_id', partyId)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
    ])

    const deals = dealsResult.data || []
    const dealIds = deals.map((deal) => deal.id)

    let productInterests: unknown[] = []
    if (dealIds.length > 0) {
      const { data: products } = await tokenClient
        .from('crm_deal_products')
        .select('*, products(id, name, slug, brand)')
        .in('deal_id', dealIds)
      productInterests = products || []
    }

    return NextResponse.json({
      ok: true,
      account,
      ownerProfile: ownerResult.data || null,
      contacts: contactsResult.data || [],
      deals,
      tasks: tasksResult.data || [],
      activities: activitiesResult.data || [],
      productInterests,
      warranties: warrantiesResult.data || [],
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Customer 360 ვერ ჩაიტვირთა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
