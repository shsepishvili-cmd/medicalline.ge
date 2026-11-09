import { NextResponse } from 'next/server'
import { getPaymentAvailability, verifyPaymentWebhook } from '@/app/lib/clinic-payment-provider'
import { createClinicServiceClient } from '@/app/lib/clinic-portal-server'

type ProviderPayload = {
  transaction_id?: string
  merchant_order_id?: string
  order_id?: string
  provider_transaction_id?: string
  payment_id?: string
  status?: string
  event?: string
  body?: {
    order_id?: string
    order_status?: { key?: string }
    payment_detail?: { transaction_id?: string }
  }
}

export async function POST(request: Request) {
  const paymentConfig = getPaymentAvailability()
  if (!paymentConfig.featureEnabled) return NextResponse.json({ error: 'Payments are disabled.' }, { status: 503 })
  const rawBody = await request.text()
  const signature = request.headers.get('callback-signature') || request.headers.get('x-payment-signature') || request.headers.get('x-signature') || ''
  if (!verifyPaymentWebhook(rawBody, signature)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  let payload: ProviderPayload
  try { payload = JSON.parse(rawBody) as ProviderPayload } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const service = createClinicServiceClient()
  const localId = payload.transaction_id || payload.merchant_order_id
  const providerOrderId = payload.body?.order_id || payload.order_id
  let query = service.from('payment_transactions').select('id, status')
  if (localId) query = query.eq('id', localId)
  else if (providerOrderId) query = query.eq('provider_order_id', providerOrderId)
  else return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 })
  const { data: transaction, error } = await query.single()
  if (error || !transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  const normalizedStatus = String(payload.body?.order_status?.key || payload.status || '').toLowerCase()
  const providerTransactionId = payload.body?.payment_detail?.transaction_id || payload.provider_transaction_id || payload.payment_id || providerOrderId || transaction.id
  if (normalizedStatus === 'completed' || ['succeeded', 'success', 'paid'].includes(normalizedStatus)) {
    const { error: rpcError } = await service.rpc('complete_clinic_payment', { p_transaction_id: transaction.id, p_provider_transaction_id: providerTransactionId, p_raw_response: payload })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 409 })
  } else if (['rejected', 'failed', 'cancelled', 'canceled'].includes(normalizedStatus) && transaction.status !== 'succeeded') {
    await service.from('payment_transactions').update({ status: normalizedStatus.startsWith('cancel') ? 'cancelled' : 'failed', raw_response: payload }).eq('id', transaction.id)
  }
  return NextResponse.json({ received: true })
}
