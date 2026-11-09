import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { verifyAcceptanceOtp } from '@/app/lib/invoice-acceptance-act'
import { generateInvoiceAcceptanceActPdf } from '@/app/lib/invoice-acceptance-act-pdf'

export const runtime = 'nodejs'

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const body = await request.json().catch(() => ({}))
    const otp = String(body?.otpCode || '').trim()
    const acceptedBy = String(body?.acceptedBy || '').trim()
    if (!body?.acceptTerms) return NextResponse.json({ error: 'აქტის პირობებზე თანხმობა მონიშნეთ.' }, { status: 400 })
    if (acceptedBy.length < 3) return NextResponse.json({ error: 'მიუთითეთ მიმღების სახელი და გვარი.' }, { status: 400 })
    if (!/^\d{6}$/.test(otp)) return NextResponse.json({ error: 'შეიყვანეთ 6-ნიშნა OTP კოდი.' }, { status: 400 })

    const admin = createSupabaseServiceClient()
    const [{ data: act, error }, { data: settings }] = await Promise.all([
      admin.from('invoice_acceptance_acts').select('*, invoice:invoices(*, items:invoice_items(*))').eq('public_token', token).neq('status', 'cancelled').single(),
      admin.from('invoice_company_settings').select('*').eq('id', 1).single(),
    ])
    if (error || !act?.invoice) return NextResponse.json({ error: 'აქტი ვერ მოიძებნა.' }, { status: 404 })
    if (act.status === 'accepted') return NextResponse.json({ ok: true, status: 'accepted' })
    if (act.otp_attempts >= 10) return NextResponse.json({ error: 'OTP მცდელობების ლიმიტი ამოიწურა. მოითხოვეთ ახალი კოდი.' }, { status: 429 })
    if (!act.otp_hash || !act.otp_expires_at || new Date(act.otp_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'OTP კოდის ვადა ამოიწურა. მოითხოვეთ ახალი კოდი.' }, { status: 400 })
    }
    if (!verifyAcceptanceOtp(act.id, otp, act.otp_hash)) {
      await admin.from('invoice_acceptance_acts').update({ otp_attempts: act.otp_attempts + 1 }).eq('id', act.id)
      return NextResponse.json({ error: 'OTP კოდი არასწორია.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: updateError } = await admin.from('invoice_acceptance_acts').update({
      status: 'accepted',
      accepted_at: now,
      accepted_by: acceptedBy,
      accepted_phone: act.invoice.customer_phone,
      accepted_email: act.invoice.customer_email,
      acceptance_ip: requestIp(request),
      acceptance_user_agent: request.headers.get('user-agent'),
      otp_hash: null,
      otp_expires_at: null,
    }).eq('id', act.id)
    if (updateError) throw updateError

    if (settings && act.pdf_path) {
      const pdf = generateInvoiceAcceptanceActPdf({
        ...act.invoice,
        act_number: act.act_number,
        act_date: act.act_date,
        accepted_at: now,
        accepted_by: acceptedBy,
        items: act.invoice.items || [],
      }, settings)
      await admin.storage.from('invoice-documents').upload(act.pdf_path, pdf, { contentType: 'application/pdf', upsert: true })
    }

    return NextResponse.json({ ok: true, status: 'accepted', acceptedAt: now })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'დადასტურება ვერ შესრულდა.' }, { status: 500 })
  }
}
