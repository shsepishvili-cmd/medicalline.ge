import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { createPhoneChallenge, normalizeGeorgianPhone } from '@/app/lib/phone-verification'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const phone = normalizeGeorgianPhone(String(body?.phone || ''))

  if (!phone) {
    return NextResponse.json({ error: 'მიუთითეთ მოქმედი ქართული მობილურის ნომერი.' }, { status: 400 })
  }

  if (!isSmsProviderConfigured()) {
    return NextResponse.json({ error: 'SMS დადასტურება დროებით მიუწვდომელია.' }, { status: 503 })
  }

  const code = String(randomInt(100000, 1000000))

  try {
    await sendContractSms(phone, `Medical Line Georgia: ინვოისის მოთხოვნის დასადასტურებელი კოდია ${code}. კოდი მოქმედებს 5 წუთი.`)
    return NextResponse.json({ ok: true, challenge: createPhoneChallenge(phone, code), phone })
  } catch (error) {
    console.error('[cart-invoice-otp] SMS send failed', error)
    return NextResponse.json({ error: 'SMS კოდის გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით.' }, { status: 502 })
  }
}
