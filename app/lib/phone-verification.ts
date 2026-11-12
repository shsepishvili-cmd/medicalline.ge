import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

type PhoneChallenge = {
  phone: string
  codeHash: string
  nonce: string
  expiresAt: number
}

function secret() {
  const value = process.env.PHONE_OTP_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SERVICE_KEY?.trim()
  if (!value) throw new Error('PHONE_OTP_SECRET is not configured.')
  return value
}

export function normalizeGeorgianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('995') && digits.length === 12) return digits
  if (digits.length === 9 && digits.startsWith('5')) return `995${digits}`
  return ''
}

function digest(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export function createPhoneChallenge(phone: string, code: string) {
  const nonce = randomBytes(18).toString('base64url')
  const payload: PhoneChallenge = {
    phone,
    codeHash: digest(`${nonce}:${code}`),
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${digest(encoded)}`
}

export function verifyPhoneChallenge(challenge: string, phone: string, code: string) {
  const [encoded, signature] = challenge.split('.')
  if (!encoded || !signature) return false
  const expectedSignature = digest(encoded)
  if (signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false

  let payload: PhoneChallenge
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PhoneChallenge
  } catch {
    return false
  }

  if (payload.phone !== phone || payload.expiresAt < Date.now()) return false
  const expectedCodeHash = digest(`${payload.nonce}:${code}`)
  return payload.codeHash.length === expectedCodeHash.length
    && timingSafeEqual(Buffer.from(payload.codeHash), Buffer.from(expectedCodeHash))
}
