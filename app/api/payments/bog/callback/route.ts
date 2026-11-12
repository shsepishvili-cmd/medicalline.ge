import { NextResponse } from 'next/server'
import { isBogPaymentsEnabled } from '@/app/lib/clinic-payment-provider'
import { POST as handlePaymentCallback } from '@/app/api/clinic/payments/webhook/route'
import { handleInstallmentCallback } from '@/app/lib/installments-server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isBogPaymentsEnabled()) {
    return NextResponse.json({ error: 'BOG payments are disabled.' }, { status: 503 })
  }

  // Installment payments share this URL. Anything else, or any failure in that
  // check, continues to the clinic handler with the request body untouched.
  try {
    const signature = request.headers.get('callback-signature') || request.headers.get('x-payment-signature') || request.headers.get('x-signature') || ''
    const handled = await handleInstallmentCallback(await request.clone().text(), signature)
    if (handled) return handled
  } catch (cause) {
    console.error('[bog/callback] installment check failed', cause)
  }

  // Do not enable BOG_PAYMENTS_ENABLED until BOG's production callback
  // signature header and payload mapping are confirmed against its API contract.
  return handlePaymentCallback(request)
}

