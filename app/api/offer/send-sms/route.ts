import { NextRequest, NextResponse } from 'next/server'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

function isAuthorized(request: NextRequest) {
  const secret = process.env.INVOICE_SECRET?.trim()
  if (!secret) return true
  return request.headers.get('x-offer-secret') === secret
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'არასწორი პაროლი.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const phone = String(body?.phone || '').trim()
  const text = String(body?.text || '').trim()

  if (!phone) return NextResponse.json({ error: 'მიუთითე კლიენტის ნომერი.' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'SMS ტექსტი ცარიელია.' }, { status: 400 })
  if (text.length > 459) return NextResponse.json({ error: 'SMS ტექსტი ძალიან გრძელია.' }, { status: 400 })

  if (!isSmsProviderConfigured()) {
    return NextResponse.json({ error: 'GoSMS არ არის კონფიგურირებული Vercel environment variables-ში.' }, { status: 500 })
  }

  try {
    const delivery = await sendContractSms(phone, text)
    return NextResponse.json({
      ok: true,
      messageId: delivery.messageId ?? null,
      balance: delivery.balance ?? null,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SMS ვერ გაიგზავნა.' }, { status: 400 })
  }
}
