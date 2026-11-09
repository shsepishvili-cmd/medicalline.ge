import { NextResponse } from 'next/server'
import { createProviderPaymentSession, getPaymentAvailability, isBogTestMode } from '@/app/lib/clinic-payment-provider'
import { createClinicServiceClient, requireClinicUser } from '@/app/lib/clinic-portal-server'

export async function POST(request: Request) {
  try {
    const { user, profile, client } = await requireClinicUser(request)
    const { paymentScheduleId } = await request.json().catch(() => ({})) as { paymentScheduleId?: string }
    if (!paymentScheduleId) return NextResponse.json({ error: 'გადახდის ეტაპი არ არის მითითებული.' }, { status: 400 })

    const { data: schedule, error } = await client
      .from('payment_schedules')
      .select('id, offer_id, title, due_date, amount, status, offers!inner(id, user_id, offer_number, status, currency, total_amount, valid_until, accepted_at)')
      .eq('id', paymentScheduleId)
      .single()
    if (error || !schedule) return NextResponse.json({ error: 'გადახდის ეტაპი ვერ მოიძებნა.' }, { status: 404 })
    const offer = Array.isArray(schedule.offers) ? schedule.offers[0] : schedule.offers
    if (!offer || offer.user_id !== user.id) return NextResponse.json({ error: 'წვდომა აკრძალულია.' }, { status: 403 })
    if (!['accepted', 'partially_paid'].includes(offer.status)) return NextResponse.json({ error: 'გადახდამდე შეთავაზება უნდა დაადასტუროთ.' }, { status: 409 })
    const testMode = isBogTestMode()
    if (testMode) {
      const isExactlyOneGel = Math.round(Number(schedule.amount) * 100) === 100 && Math.round(Number(offer.total_amount) * 100) === 100 && offer.currency === 'GEL'
      if (!isExactlyOneGel) return NextResponse.json({ error: 'Preview test რეჟიმში მხოლოდ ზუსტად 1 GEL-იანი შეთავაზებაა დაშვებული.' }, { status: 409 })
      if (!offer.accepted_at) return NextResponse.json({ error: 'სატესტო შეთავაზება არ არის დადასტურებული.' }, { status: 409 })
    } else {
      const { data: consent } = await client.from('offers').select('offer_terms_accepted_at, delivery_policy_accepted_at, privacy_terms_accepted_at').eq('id', offer.id).single()
      if (!consent?.offer_terms_accepted_at || !consent.delivery_policy_accepted_at || !consent.privacy_terms_accepted_at) return NextResponse.json({ error: 'გადახდამდე საჭიროა ყველა სავალდებულო პირობის დადასტურება.' }, { status: 409 })
    }
    if (offer.valid_until && new Date(`${offer.valid_until}T23:59:59`).getTime() < Date.now()) return NextResponse.json({ error: 'შეთავაზების ვადა გასულია.' }, { status: 409 })
    if (!['available', 'overdue'].includes(schedule.status)) return NextResponse.json({ error: schedule.status === 'paid' ? 'ეს ეტაპი უკვე გადახდილია.' : 'ეს ეტაპი ჯერ არ არის ხელმისაწვდომი.' }, { status: 409 })

    const paymentConfig = getPaymentAvailability()
    if (!paymentConfig.configured) return NextResponse.json({ error: 'ონლაინ გადახდა დროებით მიუწვდომელია. გთხოვთ დაგვიკავშირდეთ: +995 514 011 116', code: 'payment_not_configured' }, { status: 503 })
    const service = createClinicServiceClient()
    const { data: activeTransaction } = await service.from('payment_transactions').select('id, status, updated_at').eq('payment_schedule_id', schedule.id).in('status', ['initiated', 'pending', 'succeeded']).maybeSingle()
    if (activeTransaction?.status === 'succeeded') return NextResponse.json({ error: 'ეს ეტაპი უკვე გადახდილია.' }, { status: 409 })
    if (activeTransaction) {
      const staleAfterMs = 30 * 60 * 1000
      const isStale = Date.now() - new Date(activeTransaction.updated_at).getTime() > staleAfterMs
      if (!isStale) return NextResponse.json({ error: 'ამ ეტაპისთვის გადახდა უკვე მუშავდება. თუ ბანკის გვერდი დახურეთ, დაბრუნდით გადახდის შედეგის გვერდიდან ან სცადეთ ცოტა მოგვიანებით.' }, { status: 409 })
      await service.from('payment_transactions').update({ status: 'cancelled', raw_response: { reason: 'expired_before_retry' } }).eq('id', activeTransaction.id).in('status', ['initiated', 'pending'])
    }
    const { data: transaction, error: transactionError } = await service.from('payment_transactions').insert({
      offer_id: schedule.offer_id, payment_schedule_id: schedule.id, user_id: user.id, amount: schedule.amount,
      currency: offer.currency, provider: paymentConfig.provider, status: 'initiated',
    }).select('id').single()
    if (transactionError || !transaction) throw new Error(transactionError?.message || 'Transaction could not be created.')

    const origin = new URL(request.url).origin
    try {
      const session = await createProviderPaymentSession({
        transactionId: transaction.id, amount: Number(schedule.amount), currency: offer.currency,
        description: `${offer.offer_number} · ${schedule.title}`,
        successUrl: `${origin}/payment/result?transaction=${transaction.id}`,
        cancelUrl: `${origin}/payment/result?transaction=${transaction.id}&cancelled=1`,
        webhookUrl: `${origin}/api/payments/bog/callback`,
        customer: { name: profile.full_name, email: user.email, phone: profile.phone },
      })
      await service.from('payment_transactions').update({ status: 'pending', provider_order_id: session.providerOrderId, raw_response: session.raw }).eq('id', transaction.id)
      return NextResponse.json({ ok: true, redirectUrl: session.redirectUrl, transactionId: transaction.id })
    } catch (providerError) {
      await service.from('payment_transactions').update({ status: 'failed', raw_response: { error: providerError instanceof Error ? providerError.message : 'Provider error' } }).eq('id', transaction.id)
      throw providerError
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment could not be created.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : message === 'PAYMENT_NOT_CONFIGURED' ? 503 : 500
    return NextResponse.json({ error: status === 503 ? 'ონლაინ გადახდა დროებით მიუწვდომელია. გთხოვთ დაგვიკავშირდეთ: +995 514 011 116' : message }, { status })
  }
}
