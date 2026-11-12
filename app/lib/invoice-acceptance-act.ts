import 'server-only'
import crypto from 'crypto'

export function buildInvoiceAcceptanceActNumber(invoiceNumber: string) {
  const normalized = invoiceNumber.trim().replace(/^INV-/i, '')
  return `ACT-${normalized}`
}

export function generateAcceptanceOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

function otpSecret() {
  const value =
    process.env.AUTH_OTP_SECRET?.trim() ||
    process.env.INVOICE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''
  if (!value) throw new Error('OTP secret is not configured.')
  return value
}

export function hashAcceptanceOtp(actId: string, otp: string) {
  return crypto.createHmac('sha256', otpSecret()).update(`${actId}:${otp.trim()}`).digest('hex')
}

export function verifyAcceptanceOtp(actId: string, otp: string, expectedHash: string) {
  const actual = Buffer.from(hashAcceptanceOtp(actId, otp))
  const expected = Buffer.from(expectedHash)
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

export function buildPublicInvoiceActUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/acceptance-act/${token}`
}

export function buildInvoiceActMessage(input: {
  actNumber: string
  invoiceNumber: string
  customerName: string
  publicUrl: string
  otp: string
}) {
  const text = [
    `${input.customerName || 'კლიენტო'}, გიგზავნით მიღება-ჩაბარების აქტს ${input.actNumber}.`,
    `ინვოისი: ${input.invoiceNumber}`,
    `აქტი და PDF: ${input.publicUrl}`,
    `OTP დადასტურების კოდი: ${input.otp}`,
    'კოდი მოქმედებს 24 საათი.',
  ].join('\n')
  const subject = `მიღება-ჩაბარების აქტი ${input.actNumber}`
  const html = `
    <div style="font-family:Arial,sans-serif;color:#17201d;line-height:1.6;max-width:620px;margin:auto">
      <h2 style="color:#075344">მიღება-ჩაბარების აქტი</h2>
      <p>${escapeHtml(input.customerName || 'კლიენტო')}, გიგზავნით ინვოისის
        <strong>${escapeHtml(input.invoiceNumber)}</strong> მიღება-ჩაბარების აქტს.</p>
      <p><a href="${escapeHtml(input.publicUrl)}" style="display:inline-block;background:#075344;color:#fff;text-decoration:none;padding:12px 18px;border-radius:9px;font-weight:700">აქტის ნახვა და დადასტურება</a></p>
      <p>ერთჯერადი OTP კოდი: <strong style="font-size:22px;letter-spacing:3px">${escapeHtml(input.otp)}</strong></p>
      <p style="color:#64748b;font-size:13px">კოდი მოქმედებს 24 საათი. აქტის გვერდიდან შესაძლებელია ბეჭდიანი PDF-ის ჩამოტვირთვაც.</p>
    </div>`
  return { text, subject, html }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
