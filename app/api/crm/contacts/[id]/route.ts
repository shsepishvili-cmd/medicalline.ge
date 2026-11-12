import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

function optionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const EDITABLE_TEXT_FIELDS = ['full_name', 'title', 'phone', 'email', 'notes'] as const

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

    for (const field of EDITABLE_TEXT_FIELDS) {
      if (field in body) updates[field] = optionalText(body[field])
    }
    if ('is_primary' in body) updates.is_primary = Boolean(body.is_primary)
    if (body.archive === true) updates.archived_at = new Date().toISOString()
    if (body.archive === false) updates.archived_at = null

    if (updates.full_name === null) {
      return NextResponse.json({ ok: false, error: 'სახელი სავალდებულოა.' }, { status: 400 })
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'განახლებისთვის ველები არ არის მითითებული.' }, { status: 400 })
    }

    const { data, error } = await tokenClient
      .from('crm_contacts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, contact: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'კონტაქტის განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
