import { NextRequest, NextResponse } from 'next/server'
import { createSignedStorageUrl, requireWarrantySession } from '@/app/lib/supabase-server'
import { generateCleanInvoicePdf } from '@/app/lib/ai-invoice-pdf'
import { createInvoiceShareToken } from '@/app/lib/invoice-share-token'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

function siteOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || 'medicalline.ge'
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

function normalizeWhatsappPhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('995')) return digits
  if (digits.length === 9 && digits.startsWith('5')) return `995${digits}`
  if (digits.length === 8 && digits.startsWith('0')) return `995${digits.slice(1)}`
  return digits
}

function money(value: unknown, currency: string) {
  return `${Number(value || 0).toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function buildShareText(invoice: any, shareUrl: string) {
  const subject = `Medical Line ინვოისი ${invoice.invoice_number}`
  const body = [
    `გამარჯობა, ${invoice.customer_name}.`,
    '',
    `გიგზავნით Medical Line-ის ინვოისს ${invoice.invoice_number}.`,
    `სულ გადასახდელი: ${money(invoice.grand_total, invoice.currency)}`,
    '',
    `ინვოისის სანახავად გახსენით ბმული: ${shareUrl}`,
    '',
    'პატივისცემით,',
    'Medical Line Georgia',
  ].join('\n')
  const smsText = `Medical Line: ინვოისი ${invoice.invoice_number}, თანხა ${money(invoice.grand_total, invoice.currency)}. ბმული: ${shareUrl}`
  return { subject, body, smsText }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) throw new Error('Unauthorized')
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const channel = String(body?.channel || 'link')
    const { user, profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') throw new Error('Forbidden')

    const [{ data: invoice, error }, { data: settings }] = await Promise.all([
      tokenClient.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single(),
      tokenClient.from('invoice_company_settings').select('*').eq('id', 1).single(),
    ])
    if (error || !invoice) return NextResponse.json({ ok: false, error: 'Invoice not found.' }, { status: 404 })
    if (!settings) throw new Error('კომპანიის პარამეტრები ვერ მოიძებნა.')

    const pdfPath = (invoice.clean_pdf_path as string | null) || `${String(invoice.invoice_date).slice(0, 4)}/${invoice.id}/${invoice.invoice_number}-clean.pdf`
    const buffer = generateCleanInvoicePdf({ ...invoice, stamp_applied: true }, settings)
    const { error: uploadError } = await tokenClient.storage.from('invoice-documents').upload(pdfPath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) throw uploadError
    await tokenClient.from('invoices').update({ clean_pdf_path: pdfPath, stamp_applied: true, updated_at: new Date().toISOString() }).eq('id', invoice.id)

    const shareToken = createInvoiceShareToken(invoice.id)
    const shareUrl = `${siteOrigin(request)}/i/${shareToken}`
    const pdfUrl = await createSignedStorageUrl(tokenClient, 'invoice-documents', pdfPath, 60 * 60 * 24 * 7)
    const { subject, body: emailBody, smsText } = buildShareText(invoice, shareUrl)
    const whatsappPhone = normalizeWhatsappPhone(invoice.customer_phone)
    const whatsappUrl = whatsappPhone
      ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(smsText)}`
      : `https://wa.me/?text=${encodeURIComponent(smsText)}`
    const mailtoUrl = `mailto:${invoice.customer_email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`

    let smsSent = false
    let smsProvider: string | null = null
    let smsMessageId: string | number | null = null
    if (channel === 'sms') {
      if (!invoice.customer_phone) throw new Error('კლიენტის ტელეფონი არ არის მითითებული.')
      if (!isSmsProviderConfigured()) throw new Error('SMS provider არ არის კონფიგურირებული.')
      const delivery = await sendContractSms(invoice.customer_phone, smsText)
      smsSent = true
      smsProvider = delivery.provider
      smsMessageId = delivery.messageId ?? null
    }

    if (['issued', 'draft'].includes(invoice.status)) {
      await tokenClient.from('invoices').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', invoice.id)
    }
    await tokenClient.from('invoice_audit_logs').insert({
      invoice_id: invoice.id,
      user_id: user.id,
      action: channel === 'sms' ? 'invoice_sms_sent' : 'invoice_share_created',
      metadata: { channel, share_url: shareUrl, sms_sent: smsSent, sms_provider: smsProvider, sms_message_id: smsMessageId },
    })

    return NextResponse.json({
      ok: true,
      shareUrl,
      pdfUrl,
      emailSubject: subject,
      emailBody,
      mailtoUrl,
      smsText,
      whatsappUrl,
      smsSent,
      smsProvider,
      smsMessageId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invoice share could not be created.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}
