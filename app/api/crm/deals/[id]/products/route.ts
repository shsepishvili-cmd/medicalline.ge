import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient, user } = await requireCrmSession(accessToken)
    const { id: dealId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const productId = typeof body.product_id === 'string' && body.product_id ? body.product_id : null
    const quantity = Number(body.quantity)

    const { data: deal, error: dealError } = await tokenClient
      .from('crm_deals')
      .select('id, party_id')
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ ok: false, error: 'გარიგება ვერ მოიძებნა.' }, { status: 404 })
    }

    const insertPayload = {
      deal_id: dealId,
      product_id: productId,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      serial_number: typeof body.serial_number === 'string' && body.serial_number.trim() ? body.serial_number.trim() : null,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    }

    const { data, error } = await tokenClient
      .from('crm_deal_products')
      .insert(insertPayload)
      .select('*, products(id, name, slug, brand)')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const productName = (data as { products?: { name?: string } | null }).products?.name || 'პროდუქტი'
    try {
      await tokenClient.from('crm_activities').insert({
        type: 'product_added',
        deal_id: dealId,
        party_id: deal.party_id,
        body: `დაემატა პროდუქტი: ${productName}`,
        actor_id: user.id,
      })
    } catch {
      // best-effort logging — must never fail the product-add itself
    }

    return NextResponse.json({ ok: true, product: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'პროდუქტის დამატება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
