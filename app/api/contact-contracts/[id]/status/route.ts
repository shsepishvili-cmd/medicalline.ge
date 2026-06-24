import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import type { ContractStatus } from '@/app/lib/contract-types'
import { getRequestIp, getRequestUserAgent } from '@/app/lib/contact-contract-server'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

const ALLOWED_STATUSES: ContractStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'signed', 'paid', 'cancelled']

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const status = String(body?.status || '') as ContractStatus
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const { user, tokenClient } = await requireWarrantySession(accessToken)
    const patch: Record<string, string | null> = { status }

    if (status === 'paid') patch.paid_at = new Date().toISOString()
    if (status === 'accepted') patch.accepted_at = new Date().toISOString()
    if (status === 'signed') patch.signed_at = new Date().toISOString()

    const { data: contract, error: updateErr } = await tokenClient
      .from('contracts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr || !contract) {
      return NextResponse.json({ error: updateErr?.message || 'Contract not found.' }, { status: 404 })
    }

    await tokenClient.from('contract_audit_logs').insert({
      contract_id: id,
      event_type: 'status_changed',
      event_status: status,
      ip_address: getRequestIp(req.headers),
      user_agent: getRequestUserAgent(req.headers),
      phone: contract.phone,
      email: contract.email,
      document_version: contract.document_version || 1,
      actor_user_id: user.id,
      metadata: {
        source: 'contact-hub',
      },
    })

    return NextResponse.json({ ok: true, contract })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Status update failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
