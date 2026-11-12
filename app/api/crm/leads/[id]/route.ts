import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'
import { CRM_LEAD_SOURCES } from '@/app/lib/crm-types'

const EDITABLE_TEXT_FIELDS = [
  'contact_name', 'clinic_name', 'phone', 'email', 'instagram_handle',
  'facebook_profile', 'whatsapp_phone', 'city', 'initial_interest', 'notes',
] as const

// Milestone 1 only allows moving between the pre-conversion statuses. 'converted'
// is reserved for the lead-conversion endpoint, which is not built until Milestone 2
// (see CRM_ARCHITECTURE_PLAN.md Section 11).
const EDITABLE_STATUSES = ['new', 'contacted', 'qualified', 'disqualified'] as const

function optionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { id } = await context.params

    const { data, error } = await tokenClient.from('crm_leads').select('*').eq('id', id).single()
    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'ლიდი ვერ მოიძებნა.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, lead: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ლიდი ვერ ჩაიტვირთა.'
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

    if (typeof body.source === 'string') {
      if (!(CRM_LEAD_SOURCES as readonly string[]).includes(body.source)) {
        return NextResponse.json({ ok: false, error: 'source ველი არასწორია.' }, { status: 400 })
      }
      updates.source = body.source
    }

    if (typeof body.status === 'string') {
      if (!(EDITABLE_STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json(
          {
            ok: false,
            error: '"converted" სტატუსი მხოლოდ კონვერტაციის ეტაპზე დაისმება (შემდეგი მილსტოუნი).',
          },
          { status: 400 },
        )
      }
      updates.status = body.status
      updates.disqualify_reason = body.status === 'disqualified' ? optionalText(body.disqualify_reason) : null
    }

    if (typeof body.owner_id === 'string' || body.owner_id === null) {
      updates.owner_id = body.owner_id || null
    }

    for (const field of EDITABLE_TEXT_FIELDS) {
      if (field in body) {
        updates[field] = optionalText(body[field])
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'განახლებისთვის ველები არ არის მითითებული.' }, { status: 400 })
    }

    const { data, error } = await tokenClient.from('crm_leads').update(updates).eq('id', id).select('*').single()

    if (error) {
      const isDuplicate = error.code === '23505'
      return NextResponse.json(
        {
          ok: false,
          error: isDuplicate ? 'იდენტური საკონტაქტო მონაცემით ღია ლიდი უკვე არსებობს.' : error.message,
        },
        { status: isDuplicate ? 409 : 500 },
      )
    }

    return NextResponse.json({ ok: true, lead: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ლიდის განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
