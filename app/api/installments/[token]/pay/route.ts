import { NextResponse } from 'next/server'
import { createProviderPaymentSession, getPaymentAvailability, isBogTestMode } from '@/app/lib/clinic-payment-provider'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { remainingAmount, toTetri } from '@/app/lib/installments'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UNAVAILABLE = 'ონლაინ გადახდა დროებით მიუწვდომელია. გთხოვთ დაგვიკავშირდეთ: +995 514 011 116'
const STALE_AFTER_MS = 30 * 60 * 1000

// The secret link identifies the client. The amount always comes from the
// database, never from the browser.
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const body = await request.json().catch(() => ({})) as { scheduleId?: string }
    if (!UUID.test(token) || !body.scheduleId || !UUID.test(body.scheduleId)) {
      return NextResponse.json({ error: 'არასწორი მოთხოვნა.' }, { status: 400 })
    }

    const paymentConfig = getPaymentAvailability()
    if (!paymentConfig.configured) return NextResponse.json({ error: UNAVAILABLE, code: 'payment_not_configured' }, { status: 503 })

    const service = createSupabaseServiceClient()
    const { data: contract } = await service
      .from('installment_contracts')
      .select('id, contract_number, customer_name, status')
      .eq('public_token', token)
      .maybeSingle()
    if (!contract) return NextResponse.json({ error: 'ხელშეკრულება ვერ მოიძებნა.' }, { status: 404 })
    if (contract.status !== 'active') return NextResponse.json({ error: 'ეს ხელშეკრულება აქტიური აღარ არის.' }, { status: 409 })

    const { data: row } = await service
      .from('installment_schedule')
      .select('id, installment_number, amount, paid_amount, status')
      .eq('id', body.scheduleId)
      .eq('contract_id', contract.id)
      .maybeSingle()
    if (!row) return NextResponse.json({ error: 'შენატანი ვერ მოიძებნა.' }, { status: 404 })
    if (row.status !== 'pending') return NextResponse.json({ error: 'ეს შენატანი უკვე გადახდილია.' }, { status: 409 })

    const amount = remainingAmount(row)
    if (toTetri(amount) <= 0) return NextResponse.json({ error: 'ეს შენატანი უკვე გადახდილია.' }, { status: 409 })

    // Same safety rule as clinic payments: outside production, only an exact 1 GEL test may charge a card.
    if (process.env.VERCEL_ENV !== 'production' && (!isBogTestMode() || toTetri(amount) !== 100)) {
      return NextResponse.json({ error: 'სატესტო გარემოში დაშვებულია მხოლოდ ზუსტად 1 GEL-იანი გადახდა.' }, { status: 409 })
    }

    const { data: open } = await service
      .from('installment_payments')
      .select('id, updated_at')
      .eq('schedule_id', row.id)
      .eq('method', 'bog_online')
      .eq('status', 'pending')
      .maybeSingle()
    if (open) {
      if (Date.now() - new Date(open.updated_at).getTime() <= STALE_AFTER_MS) {
        return NextResponse.json({ error: 'ამ შენატანის გადახდა უკვე მუშავდება. სცადეთ რამდენიმე წუთში.' }, { status: 409 })
      }
      await service
        .from('installment_payments')
        .update({ status: 'cancelled', raw_response: { reason: 'expired_before_retry' }, updated_at: new Date().toISOString() })
        .eq('id', open.id)
        .eq('status', 'pending')
    }

    const { data: payment, error: insertError } = await service
      .from('installment_payments')
      .insert({ contract_id: contract.id, schedule_id: row.id, amount, method: 'bog_online', status: 'pending' })
      .select('id')
      .single()
    if (insertError || !payment) {
      // The unique index caught a double click.
      return NextResponse.json({ error: 'ამ შენატანის გადახდა უკვე მუშავდება. სცადეთ რამდენიმე წუთში.' }, { status: 409 })
    }

    const origin = new URL(request.url).origin
    const returnUrl = `${origin}/installment/${token}`
    try {
      const session = await createProviderPaymentSession({
        transactionId: payment.id,
        amount,
        currency: 'GEL',
        description: `${contract.contract_number} · შენატანი №${row.installment_number}`,
        successUrl: `${returnUrl}?paid=1`,
        cancelUrl: `${returnUrl}?cancelled=1`,
        webhookUrl: `${origin}/api/payments/bog/callback`,
        customer: { name: contract.customer_name },
        // The configured redirects lead to the clinic result page, which knows nothing about this payment.
        useProvidedRedirects: true,
      })
      await service
        .from('installment_payments')
        .update({ provider_order_id: session.providerOrderId, raw_response: session.raw, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
      return NextResponse.json({ ok: true, redirectUrl: session.redirectUrl })
    } catch (providerError) {
      await service
        .from('installment_payments')
        .update({ status: 'failed', raw_response: { error: providerError instanceof Error ? providerError.message : 'Provider error' }, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
      console.error('[installments/pay] provider error', providerError)
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }
  } catch (cause) {
    console.error('[installments/pay]', cause)
    return NextResponse.json({ error: UNAVAILABLE }, { status: 500 })
  }
}
