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
import { sendTransactionalEmail } from '@/app/lib/email-provider'

export const runtime = 'nodejs'

const defaultCompany = {
  company_name: 'შპს „მედიქალ ლაინ ჯორჯია“',
  tax_id: '417893569',
  address: 'თბილისი, ჯაბიძის ქუჩა 8',
  director: 'შოთა სეფიშვილი',
  bank_account: 'GE50BG0000000103262327GEL',
}

type DirectActItem = {
  product_name?: string
  product_code?: string | null
  unit?: string
  quantity?: number
  unit_price?: number
}

function bearer(request: NextRequest) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
}

export async function POST(request: NextRequest) {
  try {
    const token = bearer(request)
    if (!token) throw new Error('Unauthorized')
    const { user, profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') throw new Error('Forbidden')

    const body = await request.json().catch(() => ({}))
    const { data: dbSettings } = await tokenClient
      .from('invoice_company_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    const settings = dbSettings || defaultCompany

    let invoiceId = body.invoice_id as string | undefined
    let invoiceNumber = String(body.invoice_number || '').trim()
    const customerName = String(body.customer_name || '').trim()
    const customerTaxId = body.customer_tax_id ? String(body.customer_tax_id).trim() : null
    const customerAddress = body.customer_address ? String(body.customer_address).trim() : null
    const customerPhone = body.customer_phone ? String(body.customer_phone).trim() : null
    const customerEmail = body.customer_email ? String(body.customer_email).trim() : null
    const today = new Date().toISOString().slice(0, 10)
    const invoiceDate = String(body.invoice_date || today).trim()
    const deliveryDate = body.delivery_date ? String(body.delivery_date).trim() : today
    const notes = body.notes ? String(body.notes).trim() : null

    const rawItems: DirectActItem[] = Array.isArray(body.items) ? body.items : []
    if (!rawItems.length) {
      return NextResponse.json({ ok: false, error: 'მიუთითეთ მინიმუმ ერთი პროდუქტი.' }, { status: 400 })
    }
    if (!customerName) {
      return NextResponse.json({ ok: false, error: 'მიუთითეთ მყიდველის დასახელება.' }, { status: 400 })
    }

    const items = rawItems.map((item) => ({
      product_name: String(item.product_name || 'პროდუქტი').trim(),
      product_code: item.product_code ? String(item.product_code).trim() : null,
      unit: String(item.unit || 'ცალი').trim(),
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
    }))

    // 1. If invoice does not exist in DB, create it first
    if (!invoiceId) {
      if (!invoiceNumber) {
        const { data: generatedNumber, error: numberError } = await tokenClient.rpc('next_invoice_number', {
          p_year: Number(invoiceDate.slice(0, 4)),
        })
        invoiceNumber = (!numberError && generatedNumber) ? generatedNumber : `INV-${Date.now().toString().slice(-6)}`
      }

      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

      const { data: newInvoice, error: createInvoiceError } = await tokenClient
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          status: 'issued',
          customer_name: customerName,
          customer_tax_id: customerTaxId,
          customer_address: customerAddress,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          invoice_date: invoiceDate,
          delivery_date: deliveryDate,
          currency: 'GEL',
          vat_mode: 'without_vat',
          subtotal: totalAmount,
          discount_total: 0,
          vat_total: 0,
          grand_total: totalAmount,
          notes: notes,
          source_type: 'manual',
          created_by: user.id,
        })
        .select('*')
        .single()

      if (createInvoiceError || !newInvoice) {
        throw new Error(createInvoiceError?.message || 'ინვოისის შენახვა ვერ მოხერხდა.')
      }

      invoiceId = newInvoice.id

      // Insert items
      const itemRows = items.map((item, idx) => ({
        invoice_id: invoiceId,
        product_name: item.product_name,
        product_code: item.product_code,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: 0,
        line_total: item.quantity * item.unit_price,
        sort_order: idx,
      }))
      await tokenClient.from('invoice_items').insert(itemRows)
    }

    // 2. Acceptance act number
    const actNumber = String(body.act_number || buildInvoiceAcceptanceActNumber(invoiceNumber)).trim()
    const actDate = String(body.act_date || deliveryDate || today).trim()

    // 3. Find existing or create act
    const { data: existing } = await tokenClient
      .from('invoice_acceptance_acts')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle()

    let act = existing
    if (!act) {
      const { data, error } = await tokenClient.from('invoice_acceptance_acts').insert({
        invoice_id: invoiceId,
        act_number: actNumber,
        act_date: actDate,
        status: 'draft',
        created_by: user.id,
      }).select('*').single()
      if (error || !data) throw new Error(error?.message || 'აქტი ვერ შეიქმნა.')
      act = data
    }

    // 4. Generate PDF
    const pdf = generateInvoiceAcceptanceActPdf({
      act_number: act.act_number,
      act_date: act.act_date,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      delivery_date: deliveryDate,
      customer_name: customerName,
      customer_tax_id: customerTaxId,
      customer_address: customerAddress,
      notes,
      items,
    }, settings)

    const pdfPath = `acceptance-acts/${invoiceId}/${act.act_number}.pdf`
    const { error: uploadError } = await tokenClient.storage.from('invoice-documents').upload(pdfPath, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) {
      console.warn('Storage upload error for acceptance act:', uploadError.message)
    }

    // 5. Generate OTP & notification message
    const otp = generateAcceptanceOtp()
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const publicUrl = buildPublicInvoiceActUrl(new URL(request.url).origin, act.public_token)
    const message = buildInvoiceActMessage({
      actNumber: act.act_number,
      invoiceNumber,
      customerName,
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

    if (customerPhone) {
      if (isSmsProviderConfigured()) {
        try {
          const delivery = await sendContractSms(customerPhone, message.text)
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

    if (customerEmail) {
      try {
        const delivery = await sendTransactionalEmail({
          to: customerEmail,
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
    }

    // 6. Update act status and otp hash
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await tokenClient.from('invoice_acceptance_acts').update({
      act_number: actNumber,
      act_date: actDate,
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

    const mailtoUrl = `mailto:${customerEmail || ''}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.text)}`

    return NextResponse.json({
      ok: true,
      act: updated,
      publicUrl,
      otp,
      smsSent,
      emailSent,
      mailtoUrl,
      deliveryErrors,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'მიღება-ჩაბარების აქტის აწყობა ვერ შესრულდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
