import { NextResponse } from 'next/server'
import { isBogPaymentsEnabled, isBogTestMode } from '@/app/lib/clinic-payment-provider'
import { createClinicServiceClient, requireClinicUser } from '@/app/lib/clinic-portal-server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    if (!isBogTestMode() || !isBogPaymentsEnabled()) return NextResponse.json({ error: 'BOG 1 GEL test რეჟიმი გამორთულია.' }, { status: 503 })
    const { user, profile } = await requireClinicUser(request)
    if (profile.role === 'admin') return NextResponse.json({ error: 'ტესტი გაუშვით Clinic/Doctor ანგარიშიდან.' }, { status: 403 })
    const service = createClinicServiceClient()

    const { data: existing } = await service.from('offers')
      .select('id, status, payment_schedules(id,status)')
      .eq('user_id', user.id).like('offer_number', 'BOG-TEST-%')
      .in('status', ['accepted', 'partially_paid']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existing) return NextResponse.json({ ok: true, offerId: existing.id, reused: true })

    const offerNumber = `BOG-TEST-${Date.now().toString().slice(-10)}`
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const now = new Date().toISOString()
    const { data: offer, error: offerError } = await service.from('offers').insert({
      user_id: user.id, clinic_name_snapshot: profile.clinic_name || 'Test Clinic', offer_number: offerNumber,
      status: 'accepted', currency: 'GEL', subtotal_amount: 1, discount_amount: 0, total_amount: 1,
      advance_amount: 1, vat_included: true, valid_until: tomorrow,
      payment_terms: 'BOG Preview გარემოს რეალური 1 GEL სატესტო გადახდა.',
      delivery_terms: 'ციფრული სატესტო ოპერაცია — მიწოდება არ ხდება.', notes: 'Preview-only payment test.',
      accepted_at: now, created_by: user.id,
    }).select('id').single()
    if (offerError || !offer) throw new Error(offerError?.message || 'Test offer could not be created.')

    const [itemResult, scheduleResult] = await Promise.all([
      service.from('offer_items').insert({ offer_id: offer.id, product_id: null, product_name_snapshot: 'BOG ონლაინ გადახდის ტესტი', sku_snapshot: 'BOG-TEST-1-GEL', quantity: 1, unit_price: 1, discount_percent: 0, total_price: 1 }),
      service.from('payment_schedules').insert({ offer_id: offer.id, installment_number: 1, title: 'რეალური 1 GEL სატესტო გადახდა', due_date: new Date().toISOString().slice(0, 10), amount: 1, status: 'available' }),
    ])
    if (itemResult.error || scheduleResult.error) {
      await service.from('offers').delete().eq('id', offer.id)
      throw new Error(itemResult.error?.message || scheduleResult.error?.message || 'Test schedule could not be created.')
    }
    return NextResponse.json({ ok: true, offerId: offer.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Test offer could not be created.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}
