import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; productLinkId: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { id: dealId, productLinkId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const updates: Record<string, unknown> = {}
    if ('quantity' in body) {
      const quantity = Number(body.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ ok: false, error: 'რაოდენობა უნდა იყოს დადებითი რიცხვი.' }, { status: 400 })
      }
      updates.quantity = quantity
    }
    if ('serial_number' in body) {
      updates.serial_number = typeof body.serial_number === 'string' && body.serial_number.trim() ? body.serial_number.trim() : null
    }
    if ('notes' in body) {
      updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'განახლებისთვის ველები არ არის მითითებული.' }, { status: 400 })
    }

    const { data, error } = await tokenClient
      .from('crm_deal_products')
      .update(updates)
      .eq('id', productLinkId)
      .eq('deal_id', dealId)
      .select('*, products(id, name, slug, brand)')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, product: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'პროდუქტის განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; productLinkId: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { id: dealId, productLinkId } = await context.params

    const { error } = await tokenClient
      .from('crm_deal_products')
      .delete()
      .eq('id', productLinkId)
      .eq('deal_id', dealId)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'პროდუქტის წაშლა ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
