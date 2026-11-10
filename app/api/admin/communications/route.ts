import { chatwootRequest, communicationErrorResponse, CommunicationError, requireCommunicationsAdmin } from '@/app/lib/communications-chatwoot'
import { isSmsProviderConfigured } from '@/app/lib/sms-provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function positiveId(value: unknown) {
  const raw = String(value ?? '')
  return /^\d{1,12}$/.test(raw) && Number(raw) > 0 ? raw : null
}

export async function GET(request: Request) {
  try {
    const { client } = await requireCommunicationsAdmin(request)
    const url = new URL(request.url)
    const section = url.searchParams.get('section') || 'conversations'
    if (section === 'setup') {
      return Response.json({
        ok: true,
        config: {
          chatwoot: Boolean(process.env.CHATWOOT_BASE_URL && process.env.CHATWOOT_ACCOUNT_ID && process.env.CHATWOOT_API_TOKEN),
          chatwoot_webhook: Boolean(process.env.CHATWOOT_WEBHOOK_SECRET),
          sms: isSmsProviderConfigured(),
          telephony: Boolean(process.env.COMMUNICATION_TELEPHONY_WEBHOOK_SECRET),
          database_sync: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (section === 'calls') {
      const { data, error } = await client.from('communication_events')
        .select('id, event_type, phone_number, direction, duration_seconds, received_at')
        .eq('channel', 'phone').order('received_at', { ascending: false }).limit(20)
      if (error) throw new CommunicationError('ზარების ისტორია ჯერ არ არის გააქტიურებული.', 503)
      return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (section === 'inboxes') {
      const data = await chatwootRequest('inboxes')
      return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (section === 'messages') {
      const id = positiveId(url.searchParams.get('conversation_id'))
      if (!id) throw new CommunicationError('მიუთითეთ სწორი საუბრის ნომერი.', 400)
      const data = await chatwootRequest(`conversations/${id}/messages`)
      return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (section !== 'conversations') throw new CommunicationError('არასწორი განყოფილება.', 400)
    const page = Math.min(10, Math.max(1, Number(url.searchParams.get('page')) || 1))
    const data = await chatwootRequest(`conversations?status=all&page=${page}`)
    return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return communicationErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCommunicationsAdmin(request)
    const input = await request.json().catch(() => null)
    const id = positiveId(input?.conversation_id)
    const content = typeof input?.content === 'string' ? input.content.trim() : ''
    if (!id || !content || content.length > 4000) {
      throw new CommunicationError('მიუთითეთ საუბარი და შეტყობინება (მაქსიმუმ 4000 სიმბოლო).', 400)
    }

    const data = await chatwootRequest(`conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, message_type: 'outgoing', private: false }),
    })
    return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return communicationErrorResponse(error)
  }
}
