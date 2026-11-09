import { NextResponse } from 'next/server'
import { isBogPaymentsEnabled } from '@/app/lib/clinic-payment-provider'
import { POST as createPaymentOrder } from '@/app/api/clinic/payments/create/route'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isBogPaymentsEnabled()) {
    return NextResponse.json({
      error: 'ონლაინ გადახდა დროებით მიუწვდომელია. გთხოვთ დაგვიკავშირდეთ: +995 514 011 116',
      code: 'bog_payments_disabled',
    }, { status: 503 })
  }

  return createPaymentOrder(request)
}

