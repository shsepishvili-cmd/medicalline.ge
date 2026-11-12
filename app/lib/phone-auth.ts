// Pure helpers for SMS sign-in, shared by the server code and the tests.
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export const OTP_TTL_SECONDS = 300
export const OTP_MAX_ATTEMPTS = 5
// Offer links last two weeks; opening one still needs an SMS sign-in by the
// doctor it was made for.
export const OFFER_LINK_TTL_DAYS = 14
export const OFFER_LINK_TTL_MINUTES = OFFER_LINK_TTL_DAYS * 24 * 60

export function otpSecret() {
  const value = process.env.PHONE_OTP_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SERVICE_KEY?.trim()
  if (!value || value.length < 32) throw new Error('PHONE_OTP_SECRET is not configured.')
  return value
}

export function newOtpCode() {
  return String(randomInt(100000, 1000000))
}

// Bound to the phone number, so a code cannot be replayed for another number.
export function hashOtp(phone: string, code: string, secret = otpSecret()) {
  return createHmac('sha256', secret).update(`otp:${phone}:${code}`).digest('hex')
}

export function sameHash(a: string, b: string) {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right)
}

// 256 bits; only its SHA-256 is stored, so the database alone cannot open an offer.
export function newLinkToken() {
  return randomBytes(32).toString('base64url')
}

export function hashLinkToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function isWellFormedLinkToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
}

// Accounts created by SMS sign-in have no mailbox. Supabase still needs an
// e-mail, so a fixed, non-deliverable address derived from the number is used.
export function phoneLoginEmail(phone: string) {
  return `${phone}@phone.medicalline.ge`
}

export const PROFESSIONS = ['სტომატოლოგი', 'კლინიკის მფლობელი / მენეჯერი', 'სტომატოლოგიური ტექნიკოსი', 'დისტრიბუტორი', 'სხვა'] as const

export type RegistrationInput = {
  fullName: string
  profession: string
  clinicName: string
  city: string
  privacyAccepted: boolean
  marketingConsent: boolean
}

export function parseRegistration(raw: unknown): RegistrationInput | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const text = (key: string, max: number) => (typeof value[key] === 'string' ? (value[key] as string).trim().slice(0, max) : '')
  const fullName = text('fullName', 120)
  const profession = text('profession', 80)
  if (fullName.length < 2 || !(PROFESSIONS as readonly string[]).includes(profession)) return null
  if (value.privacyAccepted !== true) return null
  return {
    fullName,
    profession,
    clinicName: text('clinicName', 120),
    city: text('city', 80),
    privacyAccepted: true,
    marketingConsent: value.marketingConsent === true,
  }
}
