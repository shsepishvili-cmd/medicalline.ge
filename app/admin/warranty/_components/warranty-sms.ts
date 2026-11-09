export type WarrantySmsResult = {
  ok: boolean
  smsSent: boolean
  smsText?: string
  smsMessageId?: string | number | null
  documentUrl?: string
  error?: string
}

export async function sendWarrantySmsRequest(accessToken: string, warrantyId: string): Promise<WarrantySmsResult> {
  const response = await fetch(`/api/warranty/${warrantyId}/sms`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const raw = await response.text()
  let payload: WarrantySmsResult
  try {
    payload = JSON.parse(raw) as WarrantySmsResult
  } catch {
    throw new Error(response.ok ? 'SMS სერვერის პასუხი ვერ დამუშავდა.' : `სერვერის შეცდომა (${response.status}).`)
  }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'გარანტიის SMS ვერ გაიგზავნა.')
  }
  return payload
}
