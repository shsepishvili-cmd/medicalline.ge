import 'server-only'
import crypto from 'crypto'

type InvoiceSharePayload = {
  invoiceId: string
  exp: number
}

function secret() {
  const value =
    process.env.INVOICE_SECRET?.trim() ||
    process.env.AUTH_OTP_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ''
  if (!value) throw new Error('Invoice share secret is not configured.')
  return value
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createInvoiceShareToken(invoiceId: string, expiresInSeconds = 60 * 60 * 24 * 30) {
  const payload = Buffer.from(JSON.stringify({
    invoiceId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  } satisfies InvoiceSharePayload)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyInvoiceShareToken(token: string) {
  try {
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null
    const expected = sign(payload)
    const left = Buffer.from(signature)
    const right = Buffer.from(expected)
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<InvoiceSharePayload>
    if (!decoded.invoiceId || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null
    return decoded as InvoiceSharePayload
  } catch {
    return null
  }
}
