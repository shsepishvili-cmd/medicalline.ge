import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSmsProviderConfigured, sendContractSms } from './sms-provider'

export type OutboxMessage = {
  recipient: string
  body: string
  purpose: 'offer_link' | 'sms_login' | string
  relatedType?: string
  relatedId?: string
}

export type DeliveryResult = { id: string | null; delivered: boolean; error?: string }

const INLINE_ATTEMPTS = 3
const RETRY_DELAYS_MS = [0, 700, 2000]
const MAX_ATTEMPTS = 5

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Only GOSMS is wired up. WhatsApp needs a chosen provider, an approved message
// template and credentials before it can be added here as a second channel.
async function deliver(recipient: string, body: string) {
  if (!isSmsProviderConfigured()) throw new Error('SMS provider is not configured.')
  const result = await sendContractSms(recipient, body)
  return result.messageId ? String(result.messageId) : null
}

async function attempt(service: SupabaseClient, id: string, recipient: string, body: string, attempts: number) {
  try {
    const providerId = await deliver(recipient, body)
    // The text is cleared once delivered: offer messages contain a sign-in link.
    await service.from('message_outbox').update({
      status: 'sent', attempts, sent_at: new Date().toISOString(), provider_message_id: providerId,
      body: null, last_error: null, updated_at: new Date().toISOString(),
    }).eq('id', id)
    return { ok: true as const }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Delivery failed'
    await service.from('message_outbox').update({
      status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued', attempts, last_error: message.slice(0, 500),
      next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    return { ok: false as const, error: message }
  }
}

// Records the message first, then tries to deliver it straight away with a few
// quick retries. Anything still undelivered stays queued for the retry job and
// shows up in the admin outbox.
export async function sendMessage(service: SupabaseClient, message: OutboxMessage): Promise<DeliveryResult> {
  const { data, error } = await service.from('message_outbox').insert({
    channel: 'sms', recipient: message.recipient, body: message.body, purpose: message.purpose,
    related_type: message.relatedType ?? null, related_id: message.relatedId ?? null, status: 'sending',
  }).select('id').single()
  if (error || !data) return { id: null, delivered: false, error: error?.message || 'Outbox unavailable' }

  let lastError = ''
  for (let i = 0; i < INLINE_ATTEMPTS; i += 1) {
    if (RETRY_DELAYS_MS[i]) await sleep(RETRY_DELAYS_MS[i])
    const result = await attempt(service, data.id, message.recipient, message.body, i + 1)
    if (result.ok) return { id: data.id, delivered: true }
    lastError = result.error
  }
  return { id: data.id, delivered: false, error: lastError }
}

// Retry job. Offer links older than their 15 minutes are useless, so those
// are cancelled rather than sent late.
export async function processOutbox(service: SupabaseClient, limit = 20) {
  const now = new Date().toISOString()
  await service.from('message_outbox')
    .update({ status: 'cancelled', body: null, last_error: 'Link expired before delivery', updated_at: now })
    .eq('purpose', 'offer_link').in('status', ['queued', 'sending'])
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString())

  const { data: due } = await service.from('message_outbox')
    .select('id, recipient, body, attempts')
    .eq('status', 'queued').lte('next_attempt_at', now).not('body', 'is', null)
    .order('created_at', { ascending: true }).limit(limit)

  let sent = 0
  let failed = 0
  for (const row of due || []) {
    // Claim the row so two runs cannot send it twice.
    const { data: claimed } = await service.from('message_outbox')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('status', 'queued').select('id').maybeSingle()
    if (!claimed) continue
    const result = await attempt(service, row.id, row.recipient, row.body, row.attempts + 1)
    if (result.ok) sent += 1
    else failed += 1
  }
  return { sent, failed }
}
