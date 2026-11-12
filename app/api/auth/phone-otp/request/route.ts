import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { createPhoneChallenge, normalizeGeorgianPhone } from '@/app/lib/phone-verification'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'
import { clientIp, tooManyRequests, withinRateLimits } from '@/app/lib/request-guard'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const phone = normalizeGeorgianPhone(String(body?.phone || ''))
  if (!phone) return NextResponse.json({ error: 'მიუთითეთ მოქმედი ქართული მობილურის ნომერი.' }, { status: 400 })
  if (!supabaseUrl || !serviceKey || !isSmsProviderConfigured()) {
    return NextResponse.json({ error: 'SMS დადასტურება დროებით მიუწვდომელია.' }, { status: 503 })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const allowed = await withinRateLimits(admin, [
    { key: `reg-otp:ip:${clientIp(request)}`, windowSeconds: 3600, max: 20 },
    { key: `reg-otp:phone:${phone}`, windowSeconds: 3600, max: 5 },
  ], { failOpen: true })
  if (!allowed) return tooManyRequests('კოდის ხელახლა მოთხოვნა ცოტა ხანში შეგიძლიათ.')
  const { data: profiles, error } = await admin.from('profiles').select('phone')
  if (error) return NextResponse.json({ error: 'ნომრის შემოწმება ვერ მოხერხდა.' }, { status: 500 })
  if ((profiles || []).some((profile) => normalizeGeorgianPhone(String(profile.phone || '')) === phone)) {
    return NextResponse.json({ error: 'ეს ტელეფონის ნომერი უკვე რეგისტრირებულია.' }, { status: 409 })
  }

  const code = String(randomInt(100000, 1000000))
  try {
    await sendContractSms(phone, `Medical Line Georgia: რეგისტრაციის დასადასტურებელი კოდია ${code}. კოდი მოქმედებს 5 წუთი.`)
    return NextResponse.json({ ok: true, challenge: createPhoneChallenge(phone, code), phone })
  } catch (sendError) {
    console.error('[phone-otp] SMS send failed', sendError)
    return NextResponse.json({ error: 'SMS კოდის გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით.' }, { status: 502 })
  }
}
