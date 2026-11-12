import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { normalizeGeorgianPhone } from '@/app/lib/phone-verification'
import { hashOtp, newOtpCode, OTP_TTL_SECONDS } from '@/app/lib/phone-auth'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError, tooManyRequests, withinRateLimits } from '@/app/lib/request-guard'
import { sendMessage } from '@/app/lib/messaging-server'
import { isSmsProviderConfigured } from '@/app/lib/sms-provider'

export const runtime = 'nodejs'

// Sends a sign-in code. The answer is the same whether or not the number
// already has an account, so the endpoint cannot be used to look up doctors.
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const body = await request.json().catch(() => ({}))
  const phone = normalizeGeorgianPhone(String(body?.phone || ''))
  if (!phone) return NextResponse.json({ error: 'შეიყვანეთ საქართველოს მობილურის სწორი ნომერი.' }, { status: 400 })
  if (!isSmsProviderConfigured()) return NextResponse.json({ error: 'SMS სერვისი დროებით მიუწვდომელია.' }, { status: 503 })

  try {
    const service = createSupabaseServiceClient()
    const ip = clientIp(request)
    const allowed = await withinRateLimits(service, [
      { key: `sms-send:ip:${ip}`, windowSeconds: 3600, max: 20 },
      { key: `sms-send:phone:${phone}`, windowSeconds: 60, max: 1 },
      { key: `sms-send:phone-hour:${phone}`, windowSeconds: 3600, max: 5 },
    ])
    if (!allowed) return tooManyRequests('კოდის ხელახლა მოთხოვნა ცოტა ხანში შეგიძლიათ.')

    const code = newOtpCode()
    const { data: challenge, error } = await service.from('otp_challenges').insert({
      phone, code_hash: hashOtp(phone, code), expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(), ip,
    }).select('id').single()
    if (error || !challenge) throw new Error(error?.message || 'OTP not stored')

    const delivery = await sendMessage(service, {
      recipient: phone,
      body: `Medical Line Georgia: shesvlis kodi ${code}. moqmedebs 5 wuti. nu gaugzavnit sxvas.`,
      purpose: 'sms_login',
      relatedType: 'otp_challenge',
      relatedId: challenge.id,
    })
    if (!delivery.delivered) {
      // A late code is useless: cancel it instead of retrying later.
      await service.from('otp_challenges').delete().eq('id', challenge.id)
      if (delivery.id) await service.from('message_outbox').update({ status: 'cancelled', body: null }).eq('id', delivery.id)
      return NextResponse.json({ error: 'SMS-ის გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.' }, { status: 502 })
    }
    return NextResponse.json({ sent: true, expiresIn: OTP_TTL_SECONDS })
  } catch (cause) {
    return serverError('sms-send', cause)
  }
}
