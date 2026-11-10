import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const allowedDirections = new Set(['incoming', 'outgoing'])
const allowedStatuses = new Set(['missed', 'completed', 'answered', 'ringing', 'failed', 'canceled'])

function authenticated(request: Request, raw: string) {
  const secret = process.env.COMMUNICATION_TELEPHONY_WEBHOOK_SECRET
  const timestamp = request.headers.get('x-ml-timestamp') || ''
  const signature = request.headers.get('x-ml-signature') || ''
  if (!secret || !/^\d+$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest()
  const supplied = Buffer.from(signature.slice(7), 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => '')
  if (raw.length > 65536) return Response.json({ error: 'Payload too large' }, { status: 413 })
  if (!authenticated(request, raw)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let input: any
  try { input = JSON.parse(raw) } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const callId = typeof input?.call_id === 'string' ? input.call_id.trim() : ''
  const direction = String(input?.direction || '').toLowerCase()
  const status = String(input?.status || '').toLowerCase()
  const phone = String(input?.phone_number || '').replace(/[^+\d]/g, '')
  const duration = Number(input?.duration_seconds ?? 0)

  if (!callId || callId.length > 200 || !allowedDirections.has(direction) || !allowedStatuses.has(status)
    || !/^\+?\d{8,15}$/.test(phone) || !Number.isSafeInteger(duration) || duration < 0 || duration > 86400) {
    return Response.json({ error: 'Invalid call event' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return Response.json({ error: 'Database not configured' }, { status: 503 })

  const eventKey = 'call:' + createHash('sha256').update(`${callId}:${direction}:${status}`).digest('hex')
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await db.from('communication_events').upsert({
    event_key: eventKey,
    event_type: `call.${status}`,
    channel: 'phone',
    direction,
    phone_number: phone,
    duration_seconds: duration,
    content: null,
  }, { onConflict: 'event_key', ignoreDuplicates: true })
  if (error) return Response.json({ error: 'Failed to store call event' }, { status: 502 })
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
