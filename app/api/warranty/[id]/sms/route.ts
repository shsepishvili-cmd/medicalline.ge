import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { buildWarrantyVerifyUrl, warrantySmsText } from '@/app/lib/warranty'
import { getAppBaseUrl } from '@/app/lib/warranty-server'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

export const runtime = 'nodejs'

function bearer(request: NextRequest) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = bearer(request)
    if (!accessToken) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const { tokenClient } = await requireWarrantySession(accessToken)
    const { data: warranty, error } = await tokenClient
      .from('warranties')
      .select('id, warranty_number, phone, verify_token, qr_url')
      .eq('id', id)
      .single()

    if (error || !warranty) {
      return NextResponse.json({ ok: false, error: error?.message || 'გარანტია ვერ მოიძებნა.' }, { status: 404 })
    }

    const baseUrl = getAppBaseUrl(request.headers.get('origin') || new URL(request.url).origin)
    const documentUrl = buildWarrantyVerifyUrl(baseUrl, warranty.verify_token)
    const smsText = warrantySmsText(warranty.warranty_number, documentUrl)

    if (!warranty.phone) {
      return NextResponse.json({ ok: false, code: 'missing_phone', error: 'კლიენტის ტელეფონი არ არის მითითებული.', smsText }, { status: 400 })
    }

    if (!isSmsProviderConfigured()) {
      return NextResponse.json({ ok: true, smsSent: false, smsText, documentUrl, error: 'GOSMS provider is not configured.' })
    }

    const delivery = await sendContractSms(warranty.phone, smsText)
    const sentAt = new Date().toISOString()

    await Promise.all([
      warranty.qr_url === documentUrl
        ? Promise.resolve()
        : tokenClient.from('warranties').update({ qr_url: documentUrl }).eq('id', warranty.id),
      tokenClient
        .from('order_portal_orders')
        .update({ warranty_sms_sent_at: sentAt, warranty_sms_error: null })
        .eq('warranty_id', warranty.id),
    ])

    return NextResponse.json({
      ok: true,
      smsSent: true,
      smsText,
      documentUrl,
      smsProvider: delivery.provider,
      smsMessageId: delivery.messageId ?? null,
      balance: delivery.balance ?? null,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'გარანტიის SMS ვერ გაიგზავნა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
