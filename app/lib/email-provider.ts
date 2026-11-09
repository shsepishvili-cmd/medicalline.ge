import 'server-only'

export type EmailSendResult = {
  sent: boolean
  provider: 'resend' | 'none'
  messageId: string | null
  reason?: string
}

export function isEmailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim())
}

export async function sendTransactionalEmail(input: {
  to: string | null | undefined
  subject: string
  html: string
  text: string
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  const to = String(input.to || '').trim()

  if (!apiKey || !from) {
    return { sent: false, provider: 'none', messageId: null, reason: 'RESEND_API_KEY ან EMAIL_FROM არ არის კონფიგურირებული.' }
  }
  if (!/^\S+@\S+\.\S+$/.test(to)) {
    return { sent: false, provider: 'resend', messageId: null, reason: 'კლიენტის ელფოსტა არასწორია ან არ არის მითითებული.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject: input.subject, html: input.html, text: input.text }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null
  if (!response.ok) throw new Error(payload?.message || `Email provider returned HTTP ${response.status}.`)
  return { sent: true, provider: 'resend', messageId: payload?.id || null }
}
