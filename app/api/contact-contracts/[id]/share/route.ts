import { NextRequest, NextResponse } from 'next/server'
import { buildContractPdfStoragePath, generateContractPdfBuffer } from '@/app/lib/contract-server'
import { buildContractSharePayload, generateOtpCode, getAppBaseUrl, getRequestIp, getRequestUserAgent } from '@/app/lib/contact-contract-server'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'
import { createSignedStorageUrl, requireWarrantySession } from '@/app/lib/supabase-server'
import type { ContractRecord } from '@/app/lib/contract-types'

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

    const { data: contract, error: contractErr } = await tokenClient
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
    }

    const record = contract as ContractRecord
    const otpCode = generateOtpCode()
    const publicToken = record.public_token || crypto.randomUUID()
    const pdfPath = record.pdf_path || buildContractPdfStoragePath(record)

    if (!record.pdf_path) {
      const pdfBuffer = await generateContractPdfBuffer({ ...record, public_token: publicToken })
      const { error: uploadErr } = await tokenClient.storage
        .from('warranty-documents')
        .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })

      if (uploadErr) {
        return NextResponse.json({ error: uploadErr.message }, { status: 500 })
      }
    }

    const nowIso = new Date().toISOString()
    const otpExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    const nextStatus = record.status === 'draft' ? 'sent' : record.status

    const fullUpdate = {
      pdf_path: pdfPath,
      generated_at: nowIso,
      public_token: publicToken,
      sent_at: nowIso,
      status: nextStatus,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt,
      otp_verified_at: null,
      last_sent_channel: channel,
      document_version: record.document_version || 1,
    }

    const { error: fullUpdateErr } = await tokenClient
      .from('contracts')
      .update(fullUpdate)
      .eq('id', id)

    if (fullUpdateErr) {
      return NextResponse.json({
        error: `Contract workflow columns are not ready in Supabase: ${fullUpdateErr.message}`,
      }, { status: 500 })
    }

    const { data: persistedContract, error: persistedErr } = await tokenClient
      .from('contracts')
      .select('id, public_token, otp_expires_at, sent_at, status, pdf_path')
      .eq('id', id)
      .single()

    if (persistedErr || !persistedContract?.public_token || persistedContract.public_token !== publicToken) {
      return NextResponse.json({
        error: 'Public confirmation link was not saved. Please run the contract workflow SQL migration and try again.',
      }, { status: 500 })
    }

    if (!persistedContract.otp_expires_at) {
      return NextResponse.json({
        error: 'OTP was not saved. Please run the contract workflow SQL migration and try again.',
      }, { status: 500 })
    }

    const pdfUrl = await createSignedStorageUrl(tokenClient, 'warranty-documents', pdfPath)
    const share = buildContractSharePayload(
      getAppBaseUrl(req.headers.get('origin') || new URL(req.url).origin),
      {
        contract_number: record.contract_number,
        customer_name: record.customer_name,
        product_name: record.product_name,
        phone: record.phone,
        email: record.email,
        public_token: publicToken,
      },
      otpCode,
    )

    let smsDelivery: Awaited<ReturnType<typeof sendContractSms>> | null = null
    if (channel === 'sms' && isSmsProviderConfigured()) {
      smsDelivery = await sendContractSms(record.phone, share.smsText)
    }

    await tokenClient.from('contract_audit_logs').insert({
      contract_id: id,
      event_type: 'sent',
      event_status: nextStatus,
      channel,
      ip_address: getRequestIp(req.headers),
      user_agent: getRequestUserAgent(req.headers),
      phone: record.phone,
      email: record.email,
      document_version: null,
      actor_user_id: user.id,
      metadata: {
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
      pdfUrl,
      otpExpiresAt,
      smsSent: Boolean(smsDelivery?.sent),
      smsProvider: smsDelivery?.provider || null,
      smsMessageId: smsDelivery?.messageId || null,
      ...share,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Share flow failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
