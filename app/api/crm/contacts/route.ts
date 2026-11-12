import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

function optionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { searchParams } = new URL(request.url)
    const partyId = searchParams.get('party_id')

    let query = tokenClient
      .from('crm_contacts')
      .select('*')
      .is('archived_at', null)
      .order('is_primary', { ascending: false })

    if (partyId) query = query.eq('party_id', partyId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, contacts: data || [] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'კონტაქტები ვერ ჩაიტვირთა.'
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

    const partyId = typeof body.party_id === 'string' ? body.party_id : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''

    if (!partyId) {
      return NextResponse.json({ ok: false, error: 'party_id სავალდებულოა.' }, { status: 400 })
    }
    if (!fullName) {
      return NextResponse.json({ ok: false, error: 'სახელი სავალდებულოა.' }, { status: 400 })
    }

    const insertPayload = {
      party_id: partyId,
      full_name: fullName,
      title: optionalText(body.title),
      phone: optionalText(body.phone),
      email: optionalText(body.email),
      is_primary: Boolean(body.is_primary),
      notes: optionalText(body.notes),
      created_by: user.id,
    }

    const { data, error } = await tokenClient.from('crm_contacts').insert(insertPayload).select('*').single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, contact: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'კონტაქტის შექმნა ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
