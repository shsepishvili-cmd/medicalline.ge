export type SmsSendResult = {
  sent: boolean
  provider: string
  messageId?: string | number | null
  balance?: number | null
  raw?: unknown
}

function normalizeSmsPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('995')) return digits
  if (digits.length === 9 && digits.startsWith('5')) return `995${digits}`
  if (digits.length === 8 && digits.startsWith('0')) return `995${digits.slice(1)}`
  return digits
}

function getGosmsConfig() {
  const apiKey = process.env.GOSMS_API_KEY?.trim() || process.env.gosms_api_key?.trim() || process.env.SMS_API_KEY?.trim() || process.env.sms_api_key?.trim() || ''
  const sender = process.env.GOSMS_SENDER?.trim() || process.env.gosms_sender?.trim() || process.env.SMS_SENDER?.trim() || process.env.sms_sender?.trim() || ''
  const apiUrl = process.env.GOSMS_API_URL?.trim() || process.env.gosms_api_url?.trim() || 'https://api.gosms.ge/api/sendsms'
  return { apiKey, sender, apiUrl }
}

export function isSmsProviderConfigured() {
  const provider = (process.env.SMS_PROVIDER || process.env.sms_provider || 'gosms').trim().toLowerCase()
  if (provider !== 'gosms') return false
  const { apiKey, sender } = getGosmsConfig()
  return Boolean(apiKey && sender)
}

export async function sendContractSms(to: string | null | undefined, text: string): Promise<SmsSendResult> {
  const provider = (process.env.SMS_PROVIDER || process.env.sms_provider || 'gosms').trim().toLowerCase()
  if (provider !== 'gosms') {
    throw new Error(`Unsupported SMS provider: ${provider}`)
  }

  const { apiKey, sender, apiUrl } = getGosmsConfig()
  if (!apiKey) throw new Error('GOSMS_API_KEY is not configured.')
  if (!sender) throw new Error('GOSMS_SENDER is not configured.')

  const phone = normalizeSmsPhone(String(to || ''))
  if (!/^995\d{9}$/.test(phone)) {
    throw new Error('Customer phone must be a Georgian number in 995XXXXXXXXX format.')
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      from: sender,
      to: phone,
      text,
      urgent: true,
    }),
  })

  const raw = await response.json().catch(() => null)
  const result = raw as { success?: boolean; errorCode?: number; error?: string; message?: string; messageId?: string | number; balance?: number } | null
  if (!response.ok) {
    const details = describeGosmsError(result)
    throw new Error(`GOSMS request failed: ${response.status}${details ? ` - ${details}` : ''}`)
  }

  if (!result?.success) {
    const details = describeGosmsError(result) || 'unknown error'
    throw new Error(`GOSMS did not send SMS: ${details}`)
  }

  return {
    sent: true,
    provider: 'gosms',
    messageId: result.messageId ?? null,
    balance: result.balance ?? null,
    raw,
  }
}

function describeGosmsError(result: { errorCode?: number; error?: string; message?: string } | null) {
  const errorText = result?.error || result?.message || ''
  const code = result?.errorCode
  const labels: Record<number, string> = {
    100: 'invalid or missing API key',
    101: 'invalid sender name; sender is not registered or not activated',
    102: 'insufficient SMS balance',
    103: 'invalid parameters or message text is too long',
    105: 'invalid phone number format',
    106: 'OTP generation or send failed',
    108: 'sender/API is not configured for OTP',
  }
  if (code) return `errorCode ${code}: ${labels[code] || 'unknown GOSMS error'}${errorText ? ` (${errorText})` : ''}`
  return errorText
}
