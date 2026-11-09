import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { normalizeGeorgianPhone } from '@/app/lib/phone-verification'
import { hashOtp, OTP_MAX_ATTEMPTS, parseRegistration, sameHash } from '@/app/lib/phone-auth'
import { createPhoneAccount, mintSignInToken, resolveAccount } from '@/app/lib/phone-auth-server'
import { writeAudit, maskPhone } from '@/app/lib/audit-server'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError, tooManyRequests, withinRateLimits } from '@/app/lib/request-guard'

export const runtime = 'nodejs'

// A function, not a shared object: a Response body can only be read once.
const wrongCode = () => NextResponse.json({ error: 'კოდი არასწორია.' }, { status: 403 })

// Checks the code and returns a one-time Supabase token the browser turns into
// a normal session. A new number additionally needs the registration fields;
// until they arrive the code is not used up.
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const body = await request.json().catch(() => ({}))
  const phone = normalizeGeorgianPhone(String(body?.phone || ''))
  const code = String(body?.code || '')
  if (!phone || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'შეამოწმეთ ნომერი და 6-ნიშნა კოდი.' }, { status: 400 })

  try {
    const service = createSupabaseServiceClient()
    const ip = clientIp(request)
    if (!await withinRateLimits(service, [{ key: `sms-verify:ip:${ip}`, windowSeconds: 3600, max: 40 }])) return tooManyRequests()

    // Spending a guess and checking it are separate steps, but the guess is
    // spent atomically first, so parallel requests cannot exceed the limit.
    const { data: spent, error: spendError } = await service.rpc('otp_spend_attempt', { p_phone: phone, p_max_attempts: OTP_MAX_ATTEMPTS })
    if (spendError) throw new Error(spendError.message)
    const challenge = (spent || [])[0] as { id: string; code_hash: string; attempts: number } | undefined
    if (!challenge) return NextResponse.json({ error: 'კოდის ვადა გავიდა ან ცდები ამოიწურა. მოითხოვეთ ახალი კოდი.' }, { status: 403 })
    if (!sameHash(hashOtp(phone, code), challenge.code_hash)) {
      await writeAudit(service, { action: 'sms_login.wrong_code', targetType: 'phone', targetId: maskPhone(phone), ip, details: { attempt: challenge.attempts } })
      return wrongCode()
    }

    let account = await resolveAccount(service, phone)
    if (account.kind === 'blocked') return NextResponse.json({ error: 'ანგარიში დაბლოკილია. დაგვიკავშირდით.' }, { status: 403 })
    if (account.kind === 'ambiguous') {
      return NextResponse.json({ error: 'ამ ნომრით SMS-ით შესვლა ვერ ხერხდება. შედით ელფოსტით და პაროლით ან დაგვიკავშირდით.' }, { status: 409 })
    }

    let created = false
    if (account.kind === 'new') {
      const registration = parseRegistration(body?.registration)
      if (!registration) return NextResponse.json({ needsRegistration: true })
      const result = await createPhoneAccount(service, phone, registration, ip)
      if (result.kind === 'busy') return NextResponse.json({ error: 'რეგისტრაცია უკვე მიმდინარეობს. სცადეთ წამებში.' }, { status: 409 })
      if (result.kind === 'raced') {
        account = await resolveAccount(service, phone)
        if (account.kind !== 'existing') return NextResponse.json({ error: 'სცადეთ თავიდან.' }, { status: 409 })
      } else {
        account = { kind: 'existing', userId: result.userId, email: result.email }
        created = true
      }
    }

    // Only now is the code used up; a parallel request that got here first wins.
    const { data: consumed } = await service.rpc('otp_consume', { p_id: challenge.id })
    if (consumed !== true) return wrongCode()

    if (!created) {
      await service.from('profiles').update({ phone_verified_at: new Date().toISOString() }).eq('id', account.userId).is('phone_verified_at', null)
    }
    const tokenHash = await mintSignInToken(service, account.email)
    await writeAudit(service, { actorId: account.userId, action: created ? 'sms_login.first_sign_in' : 'sms_login.signed_in', targetType: 'profile', targetId: account.userId, ip })
    return NextResponse.json({ tokenHash, created })
  } catch (cause) {
    return serverError('sms-verify', cause)
  }
}
