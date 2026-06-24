import { NextRequest, NextResponse } from 'next/server'
import { buildAcceptanceActBody, buildAcceptanceActSharePayload } from '@/app/lib/acceptance-act'
import { generateOtpCode, getAppBaseUrl, getRequestIp, getRequestUserAgent } from '@/app/lib/contact-contract-server'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'
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
    const body = await req.json().catch(() => ({}))
    const channel = String(body?.channel || 'whatsapp')
    const { user, tokenClient } = await requireWarrantySession(accessToken)

    const { data: act, error: actErr } = await tokenClient
      .from('contract_acceptance_acts')
      .select('*, contracts(*)')
      .eq('id', id)
      .single()

    if (actErr || !act) {
      return NextResponse.json({ error: 'Acceptance act not found.' }, { status: 404 })
    }

    const record = act as ContractAcceptanceActRecord & { contracts: ContractRecord }
    const contract = record.contracts
    const otpCode = generateOtpCode()
    const publicToken = record.public_token || crypto.randomUUID()
    const nowIso = new Date().toISOString()
    const otpExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    const nextStatus = record.status === 'draft' ? 'sent' : record.status
    const actBody = record.act_body?.trim() ? record.act_body : buildAcceptanceActBody(contract, record)

    const { error: updateErr } = await tokenClient
      .from('contract_acceptance_acts')
      .update({
        public_token: publicToken,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_verified_at: null,
        sent_at: nowIso,
        status: nextStatus,
        last_sent_channel: channel,
        act_body: actBody,
      })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    const share = buildAcceptanceActSharePayload(
      getAppBaseUrl(req.headers.get('origin') || new URL(req.url).origin),
      { act_number: record.act_number, public_token: publicToken },
      contract,
      otpCode,
    )

    let smsDelivery: Awaited<ReturnType<typeof sendContractSms>> | null = null
    if (channel === 'sms' && isSmsProviderConfigured()) {
      smsDelivery = await sendContractSms(contract.phone, share.smsText)
    }

    await tokenClient.from('contract_audit_logs').insert({
      contract_id: record.contract_id,
      event_type: 'acceptance_act_sent',
      event_status: nextStatus,
      channel,
      ip_address: getRequestIp(req.headers),
      user_agent: getRequestUserAgent(req.headers),
      phone: contract.phone,
      email: contract.email,
      document_version: record.document_version || 1,
      actor_user_id: user.id,
      metadata: {
        acceptance_act_id: id,
        act_number: record.act_number,
        public_token: publicToken,
        otp_expires_at: otpExpiresAt,
        sms_provider: smsDelivery?.provider || null,
        sms_message_id: smsDelivery?.messageId || null,
        sms_sent: Boolean(smsDelivery?.sent),
      },
    }).then(() => null, () => null)

    return NextResponse.json({
      ok: true,
      status: nextStatus,
      otpExpiresAt,
      smsSent: Boolean(smsDelivery?.sent),
      smsProvider: smsDelivery?.provider || null,
      smsMessageId: smsDelivery?.messageId || null,
      ...share,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Acceptance act share failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
