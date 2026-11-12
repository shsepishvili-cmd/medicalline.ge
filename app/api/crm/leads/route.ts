import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'
import { CRM_LEAD_SOURCES, CRM_LEAD_STATUSES } from '@/app/lib/crm-types'

const IDENTIFIER_FIELDS = ['phone', 'email', 'instagram_handle', 'facebook_profile', 'whatsapp_phone', 'contact_name'] as const

function hasIdentifier(body: Record<string, unknown>) {
  return IDENTIFIER_FIELDS.some((key) => typeof body[key] === 'string' && body[key].trim().length > 0)
}

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
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const ownerId = searchParams.get('owner_id')

    let query = tokenClient.from('crm_leads').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (source) query = query.eq('source', source)
    if (ownerId) query = query.eq('owner_id', ownerId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, leads: data || [] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ლიდები ვერ ჩაიტვირთა.'
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

    const source = String(body.source || '').trim()
    if (!(CRM_LEAD_SOURCES as readonly string[]).includes(source)) {
      return NextResponse.json({ ok: false, error: 'source ველი არასწორია.', code: 'invalid_source' }, { status: 400 })
    }

    if (!hasIdentifier(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'საჭიროა მინიმუმ ერთი საკონტაქტო მონაცემი: ტელეფონი, ელფოსტა, Instagram, Facebook, WhatsApp ან სახელი.',
          code: 'missing_identifier',
        },
        { status: 400 },
      )
    }

    const status = typeof body.status === 'string' && (CRM_LEAD_STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : 'new'

    const insertPayload = {
      source,
      status,
      contact_name: optionalText(body.contact_name),
      clinic_name: optionalText(body.clinic_name),
      phone: optionalText(body.phone),
      email: optionalText(body.email),
      instagram_handle: optionalText(body.instagram_handle),
      facebook_profile: optionalText(body.facebook_profile),
      whatsapp_phone: optionalText(body.whatsapp_phone),
      city: optionalText(body.city),
      initial_interest: optionalText(body.initial_interest),
      notes: optionalText(body.notes),
      created_by: user.id,
    }

    const { data, error } = await tokenClient.from('crm_leads').insert(insertPayload).select('*').single()

    if (error) {
      const isDuplicate = error.code === '23505'
      return NextResponse.json(
        {
          ok: false,
          error: isDuplicate
            ? 'იდენტური საკონტაქტო მონაცემით ღია ლიდი უკვე არსებობს.'
            : error.message,
          code: isDuplicate ? 'duplicate_open_lead' : undefined,
        },
        { status: isDuplicate ? 409 : 500 },
      )
    }

    return NextResponse.json({ ok: true, lead: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ლიდის შექმნა ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
