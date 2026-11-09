import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, requireCrmSession } from '@/app/lib/crm-server'

// Only the Milestone 2 CRM bridge columns are editable here. Name, tax_id,
// code, party_type, company_id, opening_debit/opening_credit remain governed
// exclusively by the existing ERP admin screens — this route never touches
// them, matching the approved permission matrix ("edit erp_parties financial
// fields = admin only") by simply never exposing those fields as editable.
const EDITABLE_FIELDS = ['crm_owner_id', 'lead_source', 'city', 'is_individual'] as const

export async function GET(request: NextRequest, context: { params: Promise<{ partyId: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { partyId } = await context.params

    const { data, error } = await tokenClient
      .from('erp_parties')
      .select('id, company_id, party_type, code, name, tax_id, phone, email, address, created_at, updated_at, profile_id, crm_owner_id, lead_source, city, is_individual')
      .eq('id', partyId)
      .single()

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'კლიენტი ვერ მოიძებნა.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, customer: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'კლიენტი ვერ ჩაიტვირთა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ partyId: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { tokenClient } = await requireCrmSession(accessToken)
    const { partyId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const updates: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (!(field in body)) continue
      const value = body[field]
      if (field === 'is_individual') {
        updates[field] = Boolean(value)
      } else if (field === 'crm_owner_id') {
        updates[field] = typeof value === 'string' && value ? value : null
      } else {
        updates[field] = typeof value === 'string' && value.trim() ? value.trim() : null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'განახლებისთვის ველები არ არის მითითებული.' }, { status: 400 })
    }

    // erp_parties' only UPDATE policy is admin-only (21_erp_accounting.sql),
    // so a direct .update() here would be silently RLS-rejected for
    // engineer/dealer even though they're allowed to edit these 4 bridge
    // fields. crm_update_party_bridge_fields() is a SECURITY DEFINER RPC
    // (28_crm_erp_bridge.sql) scoped to touch only those 4 columns —
    // see that migration's comment for the full writeup.
    const { error: rpcError } = await tokenClient.rpc('crm_update_party_bridge_fields', {
      p_party_id: partyId,
      p_updates: updates,
    })

    if (rpcError) {
      const status = rpcError.message === 'Forbidden' ? 403 : rpcError.message === 'Party not found' ? 404 : 500
      return NextResponse.json({ ok: false, error: rpcError.message }, { status })
    }

    const { data, error } = await tokenClient
      .from('erp_parties')
      .select('id, company_id, party_type, code, name, tax_id, phone, email, address, created_at, updated_at, profile_id, crm_owner_id, lead_source, city, is_individual')
      .eq('id', partyId)
      .single()

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'კლიენტის განახლება ვერ მოხერხდა.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, customer: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'კლიენტის განახლება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
