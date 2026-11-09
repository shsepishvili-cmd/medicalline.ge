import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { normalizeGeorgianPhone, verifyPhoneChallenge } from '@/app/lib/phone-verification'
import { clientIp, tooManyRequests, withinRateLimits } from '@/app/lib/request-guard'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'რეგისტრაცია დროებით მიუწვდომელია.' }, { status: 503 })
  const body = await request.json().catch(() => ({}))
  const fullName = String(body?.fullName || '').trim()
  const clinicName = String(body?.clinicName || '').trim()
  const city = String(body?.city || '').trim()
  const phone = normalizeGeorgianPhone(String(body?.phone || ''))
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const code = String(body?.code || '').trim()
  const challenge = String(body?.challenge || '')

  if (!fullName || !clinicName || !city || !phone || !email || !password) {
    return NextResponse.json({ error: 'გთხოვთ შეავსოთ ყველა სავალდებულო ველი.' }, { status: 400 })
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'ელფოსტის ფორმატი არასწორია.' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს.' }, { status: 400 })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  // The code itself is stateless, so guesses are limited here instead.
  const allowed = await withinRateLimits(admin, [
    { key: `register:ip:${clientIp(request)}`, windowSeconds: 3600, max: 30 },
    { key: `register:phone:${phone}`, windowSeconds: 900, max: 6 },
  ], { failOpen: true })
  if (!allowed) return tooManyRequests()

  if (!/^\d{6}$/.test(code) || !verifyPhoneChallenge(challenge, phone, code)) {
    return NextResponse.json({ error: 'SMS კოდი არასწორია ან ვადა გაუვიდა.' }, { status: 400 })
  }

  const { data: profiles, error: profileError } = await admin.from('profiles').select('phone')
  if (profileError) return NextResponse.json({ error: 'ნომრის შემოწმება ვერ მოხერხდა.' }, { status: 500 })
  if ((profiles || []).some((profile) => normalizeGeorgianPhone(String(profile.phone || '')) === phone)) {
    return NextResponse.json({ error: 'ეს ტელეფონის ნომერი უკვე რეგისტრირებულია.' }, { status: 409 })
  }

  // Claim the number first so a parallel SMS sign-up cannot create a second
  // account for it. Before migration 54 the table does not exist; then the
  // earlier profile check above is the only guard, as it always was.
  const claim = await admin.from('phone_identities').insert({ phone })
  const claimMissing = Boolean(claim.error && /phone_identities|schema cache|does not exist/i.test(claim.error.message))
  if (claim.error && !claimMissing) return NextResponse.json({ error: 'ეს ტელეფონის ნომერი უკვე რეგისტრირებულია.' }, { status: 409 })

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, clinic_name: clinicName, city, phone, role: 'doctor', phone_verified: true },
  })
  if (error || !data.user) {
    if (!claimMissing) await admin.from('phone_identities').delete().eq('phone', phone).is('user_id', null)
    const duplicate = error?.message?.toLowerCase().includes('already')
    return NextResponse.json({ error: duplicate ? 'ეს ელფოსტა უკვე რეგისტრირებულია.' : (error?.message || 'რეგისტრაცია ვერ მოხერხდა.') }, { status: duplicate ? 409 : 400 })
  }

  if (!claimMissing) {
    await admin.from('phone_identities').update({ user_id: data.user.id, updated_at: new Date().toISOString() }).eq('phone', phone)
    await admin.from('profiles').update({ phone_verified_at: new Date().toISOString() }).eq('id', data.user.id)
  }

  return NextResponse.json({ ok: true })
}
