import { NextRequest, NextResponse } from 'next/server'
import { buildAcceptanceActBody, buildAcceptanceActNumber } from '@/app/lib/acceptance-act'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import type { ContractRecord } from '@/app/lib/contract-types'
import type { ContractAcceptanceActRecord } from '@/app/lib/acceptance-act-types'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const { user, tokenClient } = await requireWarrantySession(accessToken)

    const { data: contract, error: contractErr } = await tokenClient
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
    }

    const { data: existing, error: existingErr } = await tokenClient
      .from('contract_acceptance_acts')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 })
    }

    if (existing?.[0]) {
      return NextResponse.json({ act: existing[0] as ContractAcceptanceActRecord, created: false })
    }

    const record = contract as ContractRecord
    const draftAct = {
      act_number: buildAcceptanceActNumber(record),
      act_date: new Date().toISOString().slice(0, 10),
      delivery_address: record.delivery_address,
      equipment_condition: 'აპარატი მიღებულია ვიზუალურად გამართული მდგომარეობით',
      installation_completed: Boolean(record.installation_included),
      training_completed: true,
      missing_items: null,
      remarks: null,
    }
    const actBody = buildAcceptanceActBody(record, draftAct as ContractAcceptanceActRecord)

    const { data: act, error: insertErr } = await tokenClient
      .from('contract_acceptance_acts')
      .insert({
        contract_id: id,
        ...draftAct,
        act_body: actBody,
        status: 'draft',
        document_version: 1,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (insertErr || !act) {
      return NextResponse.json({ error: insertErr?.message || 'Acceptance act could not be created.' }, { status: 500 })
    }

    await tokenClient.from('contract_audit_logs').insert({
      contract_id: id,
      event_type: 'acceptance_act_created',
      event_status: 'draft',
      channel: null,
      ip_address: null,
      user_agent: null,
      phone: record.phone,
      email: record.email,
      document_version: 1,
      actor_user_id: user.id,
      metadata: { acceptance_act_id: act.id, act_number: act.act_number },
    }).then(() => null, () => null)

    return NextResponse.json({ act: act as ContractAcceptanceActRecord, created: true })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Acceptance act flow failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
