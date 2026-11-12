import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { createSupabaseTokenClient } from '@/app/lib/supabase-server'
import { bearerToken } from '@/app/lib/admin-guard'
import { hashLinkToken, isWellFormedLinkToken } from '@/app/lib/phone-auth'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError, tooManyRequests, withinRateLimits } from '@/app/lib/request-guard'

export const runtime = 'nodejs'

const MESSAGES: Record<string, [string, number]> = {
  not_found: ['ბმული ვერ მოიძებნა ან სხვა ანგარიშს ეკუთვნის. შედით იმ ნომრით, რომელზეც SMS მიიღეთ.', 404],
  used: ['ეს ბმული უკვე გამოყენებულია. შეთავაზება ხელმისაწვდომია თქვენს კაბინეტში.', 410],
  expired: ['ბმულის ვადა გავიდა. ახალი ბმულისთვის დაგვიკავშირდით.', 410],
  revoked: ['ბმული გაუქმებულია, რადგან ახალი გამოიგზავნა. გამოიყენეთ ბოლოს მიღებული ბმული.', 410],
  unauthorized: ['ბმულის გასახსნელად შედით SMS კოდით.', 401],
}

// Spends a one-time offer link for the signed-in doctor it was made for.
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const token = bearerToken(request)
  if (!token) return NextResponse.json({ error: MESSAGES.unauthorized[0] }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!isWellFormedLinkToken(body?.token)) return NextResponse.json({ error: MESSAGES.not_found[0] }, { status: 404 })

  try {
    const service = createSupabaseServiceClient()
    if (!await withinRateLimits(service, [{ key: `offer-open:ip:${clientIp(request)}`, windowSeconds: 600, max: 30 }])) return tooManyRequests()

    const { data, error } = await createSupabaseTokenClient(token).rpc('consume_offer_access_link', { p_token_hash: hashLinkToken(body.token) })
    if (error) throw new Error(error.message)
    const result = data as { ok: boolean; reason?: string; offer_id?: string }
    if (result.ok && result.offer_id) return NextResponse.json({ ok: true, offerId: result.offer_id })
    // A link already opened once keeps working for the same doctor until it
    // expires or a newer link replaces it.
    if (result.reason === 'used') {
      const [{ data: auth }, { data: link }] = await Promise.all([
        createSupabaseTokenClient(token).auth.getUser(token),
        service.from('offer_access_links').select('offer_id, recipient_user_id, expires_at, revoked_at').eq('token_hash', hashLinkToken(body.token)).maybeSingle(),
      ])
      if (link && auth?.user?.id === link.recipient_user_id && !link.revoked_at && new Date(link.expires_at).getTime() > Date.now()) {
        return NextResponse.json({ ok: true, offerId: link.offer_id })
      }
    }
    const [message, status] = MESSAGES[result.reason || 'not_found'] || MESSAGES.not_found
    return NextResponse.json({ error: message, reason: result.reason }, { status })
  } catch (cause) {
    return serverError('offer-link-open', cause)
  }
}
