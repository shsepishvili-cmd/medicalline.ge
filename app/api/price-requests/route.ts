import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { createSupabaseTokenClient } from '@/app/lib/supabase-server'
import { bearerToken } from '@/app/lib/admin-guard'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError, tooManyRequests, withinRateLimits } from '@/app/lib/request-guard'

export const runtime = 'nodejs'

const TIMELINES = ['now', 'within_1_month', 'within_1_3_months', 'later']
const PAYMENTS = ['full', 'bank_installment', 'medical_line_installment', 'advance_and_balance']
const SOURCES = ['PORTAL', 'CATALOG', 'EXPO2026']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Multi-product price request. The database function checks the account,
// products and the per-account limit; this layer adds the IP limit and CSRF check.
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const token = bearerToken(request)
  if (!token) return NextResponse.json({ error: 'გაიარეთ ავტორიზაცია.' }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const items = Array.isArray(body?.items) ? body.items as Array<Record<string, unknown>> : []
  const clean = items.map((item) => ({ product_id: String(item?.productId || ''), quantity: Number(item?.quantity) }))
  if (!clean.length || clean.length > 30 || clean.some((item) => !UUID.test(item.product_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
    return NextResponse.json({ error: 'შეამოწმეთ არჩეული პროდუქტები და რაოდენობები.' }, { status: 400 })
  }
  const source = SOURCES.includes(String(body?.source)) ? String(body?.source) : 'CATALOG'
  const timeline = TIMELINES.includes(String(body?.purchaseTimeline)) ? String(body?.purchaseTimeline) : 'within_1_month'
  const payment = PAYMENTS.includes(String(body?.paymentMethod)) ? String(body?.paymentMethod) : 'full'
  const note = typeof body?.note === 'string' ? body.note.slice(0, 1500) : ''

  try {
    const service = createSupabaseServiceClient()
    if (!await withinRateLimits(service, [{ key: `price-request:ip:${clientIp(request)}`, windowSeconds: 3600, max: 30 }])) return tooManyRequests()

    const client = createSupabaseTokenClient(token)
    const { data, error } = await client.rpc('submit_price_request_batch', {
      p_items: clean, p_note: note, p_source: source, p_purchase_timeline: timeline, p_preferred_payment_method: payment,
    })
    if (error) {
      const known: Record<string, [string, number]> = {
        Unauthorized: ['გაიარეთ ავტორიზაცია.', 401],
        'Verified profile required': ['ფასის მოთხოვნისთვის ტელეფონის დადასტურებაა საჭირო.', 403],
        'Rate limited': ['მოთხოვნების საათობრივი ლიმიტი ამოიწურა. სცადეთ მოგვიანებით.', 429],
        'Product not found': ['ერთ-ერთი პროდუქტი აღარ არის ხელმისაწვდომი.', 409],
        'Duplicate product': ['პროდუქტი განმეორებულია.', 400],
      }
      const match = Object.entries(known).find(([key]) => error.message.includes(key))
      if (match) return NextResponse.json({ error: match[1][0] }, { status: match[1][1] })
      throw new Error(error.message)
    }
    return NextResponse.json({ ok: true, requestGroupId: data }, { status: 201 })
  } catch (cause) {
    return serverError('price-requests', cause)
  }
}
