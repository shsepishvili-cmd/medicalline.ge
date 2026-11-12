import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { generateInvoiceAcceptanceActPdf } from '@/app/lib/invoice-acceptance-act-pdf'
import {
  buildInvoiceAcceptanceActNumber,
  buildInvoiceActMessage,
  buildPublicInvoiceActUrl,
  generateAcceptanceOtp,
  hashAcceptanceOtp,
} from '@/app/lib/invoice-acceptance-act'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'
import { isEmailProviderConfigured, sendTransactionalEmail } from '@/app/lib/email-provider'

export const runtime = 'nodejs'

function bearer(request: NextRequest) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = bearer(request)
    if (!token) throw new Error('Unauthorized')
    const { id } = await context.params
    const { user, profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') throw new Error('Forbidden')

    const [{ data: invoice, error: invoiceError }, { data: settings }] = await Promise.all([
      tokenClient.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single(),
      tokenClient.from('invoice_company_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    if (invoiceError || !invoice) return NextResponse.json({ ok: false, error: 'ინვოისი ვერ მოიძებნა.' }, { status: 404 })
    const effectiveSettings = settings || {
      company_name: 'შპს „მედიქალ ლაინ ჯორჯია“',
      tax_id: '417893569',
      address: 'თბილისი, ჯაბიძის ქუჩა 8',
      director: 'შოთა სეფიშვილი',
      bank_account: 'GE50BG0000000103262327GEL',
    }
    if (!invoice.items?.length) return NextResponse.json({ ok: false, error: 'ინვოისში პროდუქტის პოზიციები არ არის.' }, { status: 400 })

    const { data: existing } = await tokenClient
      .from('invoice_acceptance_acts')
      .select('*')
      .eq('invoice_id', id)
      .maybeSingle()

    if (existing?.status === 'accepted') {
      const publicUrl = buildPublicInvoiceActUrl(new URL(request.url).origin, existing.public_token)
      return NextResponse.json({ ok: true, alreadyAccepted: true, act: existing, publicUrl })
    }

    let act = existing
    if (!act) {
      const { data, error } = await tokenClient.from('invoice_acceptance_acts').insert({
        invoice_id: id,
        act_number: buildInvoiceAcceptanceActNumber(invoice.invoice_number),
        act_date: invoice.delivery_date || new Date().toISOString().slice(0, 10),
        status: 'draft',
        created_by: user.id,
      }).select('*').single()
      if (error || !data) throw new Error(error?.message || 'აქტი ვერ შეიქმნა.')
      act = data
    }

    const pdf = generateInvoiceAcceptanceActPdf({
      ...invoice,
      act_number: act.act_number,
      act_date: act.act_date,
      items: invoice.items,
    }, effectiveSettings)
    const pdfPath = `acceptance-acts/${invoice.id}/${act.act_number}.pdf`
    const { error: uploadError } = await tokenClient.storage.from('invoice-documents').upload(pdfPath, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) {
      console.warn('Storage upload error for acceptance act:', uploadError.message)
    }

    const otp = generateAcceptanceOtp()
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const publicUrl = buildPublicInvoiceActUrl(new URL(request.url).origin, act.public_token)
    const message = buildInvoiceActMessage({
      actNumber: act.act_number,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      publicUrl,
      otp,
    })

    let smsSent = false
    let smsProvider: string | null = null
    let smsMessageId: string | null = null
    let emailSent = false
    let emailProvider: string | null = null
    let emailMessageId: string | null = null
    const deliveryErrors: string[] = []

    if (invoice.customer_phone) {
      if (isSmsProviderConfigured()) {
        try {
          const delivery = await sendContractSms(invoice.customer_phone, message.text)
          smsSent = delivery.sent
          smsProvider = delivery.provider
          smsMessageId = delivery.messageId == null ? null : String(delivery.messageId)
        } catch (cause) {
          deliveryErrors.push(`SMS: ${cause instanceof Error ? cause.message : 'გაგზავნა ვერ შესრულდა.'}`)
        }
      } else {
        deliveryErrors.push('SMS პროვაიდერი არ არის კონფიგურირებული.')
      }
    } else {
      deliveryErrors.push('SMS: კლიენტის ტელეფონი მითითებული არ არის.')
    }

    try {
      const delivery = await sendTransactionalEmail({
        to: invoice.customer_email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })
      emailSent = delivery.sent
      emailProvider = delivery.provider
      emailMessageId = delivery.messageId
      if (delivery.reason) deliveryErrors.push(`Email: ${delivery.reason}`)
    } catch (cause) {
      deliveryErrors.push(`Email: ${cause instanceof Error ? cause.message : 'გაგზავნა ვერ შესრულდა.'}`)
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await tokenClient.from('invoice_acceptance_acts').update({
      status: smsSent || emailSent ? 'sent' : 'draft',
      otp_hash: hashAcceptanceOtp(act.id, otp),
      otp_expires_at: otpExpiresAt,
      otp_attempts: 0,
      pdf_path: pdfPath,
      sent_at: smsSent || emailSent ? now : null,
      sms_sent: smsSent,
      sms_provider: smsProvider,
      sms_message_id: smsMessageId,
      email_sent: emailSent,
      email_provider: emailProvider,
      email_message_id: emailMessageId,
      last_delivery_error: deliveryErrors.length ? deliveryErrors.join(' | ') : null,
    }).eq('id', act.id).select('*').single()
    if (updateError) throw updateError

    await tokenClient.from('invoice_audit_logs').insert({
      invoice_id: invoice.id,
      user_id: user.id,
      action: 'acceptance_act_created_and_sent',
      metadata: {
        acceptance_act_id: act.id,
        act_number: act.act_number,
        sms_sent: smsSent,
        email_sent: emailSent,
        otp_expires_at: otpExpiresAt,
        delivery_errors: deliveryErrors,
      },
    }).then(() => null, () => null)

    const mailtoUrl = `mailto:${invoice.customer_email || ''}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.text)}`
    return NextResponse.json({
      ok: true,
      act: updated,
      publicUrl,
      otp,
      smsSent,
      emailSent,
      emailConfigured: isEmailProviderConfigured(),
      mailtoUrl,
      deliveryErrors,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'მიღება-ჩაბარების აქტი ვერ შეიქმნა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
