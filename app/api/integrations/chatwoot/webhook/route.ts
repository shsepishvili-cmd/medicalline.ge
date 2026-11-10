import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type JsonRecord = Record<string, any>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function verifyChatwootWebhook(request: Request, raw: string) {
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET?.trim()
  const timestamp = request.headers.get('x-chatwoot-timestamp') || ''
  const supplied = request.headers.get('x-chatwoot-signature') || ''
  if (!secret || !/^\d+$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/i.test(supplied)) return false

  // Reject delayed requests and replays outside the 5-minute window.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest()
  const received = Buffer.from(supplied.slice(7), 'hex')
  return received.length === expected.length && timingSafeEqual(expected, received)
}

function numericId(value: unknown): number | null {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits.startsWith('995') ? digits : digits.length === 9 && digits.startsWith('5') ? '995' + digits : digits}`
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => '')
  if (raw.length > 1024 * 1024) return Response.json({ error: 'Payload too large' }, { status: 413 })
  if (!verifyChatwootWebhook(request, raw)) {
    return Response.json({ error: 'Invalid webhook signature or timestamp' }, { status: 401 })
  }

  const input: unknown = (() => { try { return JSON.parse(raw) } catch { return null } })()
  if (!isRecord(input) || typeof input.event !== 'string') {
    return Response.json({ error: 'Invalid event' }, { status: 400 })
  }

  const expectedAccountId = numericId(process.env.CHATWOOT_ACCOUNT_ID)
  const eventAccountId = numericId(input.account?.id)
  if (expectedAccountId && eventAccountId && expectedAccountId !== eventAccountId) {
    return Response.json({ error: 'Account mismatch' }, { status: 403 })
  }

  const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!dbUrl || !serviceKey) {
    return Response.json({ error: 'Database integration is not configured' }, { status: 503 })
  }

  // A Chatwoot conversation's sender is the customer. Message.sender may be an agent.
  const conversation = isRecord(input.conversation) ? input.conversation : input
  const sender = isRecord(input.contact) ? input.contact
    : isRecord(conversation.meta?.sender) ? conversation.meta.sender
      : input.sender?.type === 'contact' && isRecord(input.sender) ? input.sender : null

  const db = createClient(dbUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    let contactId: string | null = null
    const chatwootContactId = numericId(sender?.id)
    if (chatwootContactId) {
      const { data, error } = await db.from('communication_contacts').upsert({
        chatwoot_contact_id: chatwootContactId,
        full_name: String(sender?.name || '').slice(0, 200),
        phone: normalizePhone(sender?.phone_number),
        email: typeof sender?.email === 'string' ? sender.email.slice(0, 254) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chatwoot_contact_id' }).select('id').single()

      if (error) throw error
      contactId = data?.id || null
    }

    const delivery = request.headers.get('x-chatwoot-delivery')?.trim()
    const eventKey = delivery && delivery.length <= 128
      ? `delivery:${delivery}`
      : `sha256:${createHash('sha256').update(raw).digest('hex')}`
    const eventMessageId = numericId(input.message?.id ?? (input.event.startsWith('message_') ? input.id : null))
    const isPrivate = input.private === true || input.message?.private === true
    const rawContent = input.message?.content ?? (input.event.startsWith('message_') ? input.content : null)

    const { error } = await db.from('communication_events').upsert({
      event_key: eventKey,
      event_type: input.event.slice(0, 100),
      chatwoot_conversation_id: numericId(conversation.id),
      chatwoot_message_id: eventMessageId,
      contact_id: contactId,
      content: !isPrivate && typeof rawContent === 'string' ? rawContent.slice(0, 4000) : null,
      channel: typeof conversation.meta?.channel === 'string' ? conversation.meta.channel.slice(0, 100) : null,
    }, { onConflict: 'event_key', ignoreDuplicates: true })

    if (error) throw error
    return Response.json({ ok: true })
  } catch {
    // Non-2xx lets Chatwoot retry; avoid exposing personal data or database errors.
    return Response.json({ error: 'Could not record webhook' }, { status: 502 })
  }
}
