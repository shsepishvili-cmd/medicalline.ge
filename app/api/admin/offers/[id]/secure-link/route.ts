import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { requireAdmin } from '@/app/lib/admin-guard'
import { hashLinkToken, newLinkToken, OFFER_LINK_TTL_MINUTES } from '@/app/lib/phone-auth'
import { normalizeGeorgianPhone } from '@/app/lib/phone-verification'
import { sendMessage } from '@/app/lib/messaging-server'
import { writeAudit, maskPhone } from '@/app/lib/audit-server'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError } from '@/app/lib/request-guard'
import { merchant } from '@/app/lib/merchant'

export const runtime = 'nodejs'

function linkBase(request: Request) {
  return process.env.VERCEL_ENV === 'production' ? merchant.website : new URL(request.url).origin
}

// The manager's approval step: marks the offer sent and texts the doctor a
// one-time, 15-minute link. Any earlier unused link for the offer is revoked.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const guard = await requireAdmin(request)
  if ('error' in guard) return guard.error
  const { profile } = guard.session
  const { id } = await context.params
  const ip = clientIp(request)

  try {
    const service = createSupabaseServiceClient()
    const { data: offer } = await service.from('offers').select('id, offer_number, status, user_id, request_id').eq('id', id).maybeSingle()
    if (!offer) return NextResponse.json({ error: 'შეთავაზება ვერ მოიძებნა.' }, { status: 404 })
    if (!['draft', 'sent', 'viewed'].includes(offer.status)) {
      return NextResponse.json({ error: 'ამ სტატუსის შეთავაზებაზე ბმული არ იგზავნება.' }, { status: 409 })
    }
    const { count } = await service.from('offer_items').select('id', { count: 'exact', head: true }).eq('offer_id', offer.id)
    if (!count) return NextResponse.json({ error: 'შეთავაზებას პროდუქტები და ფასები არ აქვს.' }, { status: 409 })

    const { data: recipient } = await service.from('profiles').select('id, phone, status').eq('id', offer.user_id).maybeSingle()
    const phone = normalizeGeorgianPhone(String(recipient?.phone || ''))
    if (!recipient || recipient.status === 'blocked' || !phone) {
      return NextResponse.json({ error: 'ექიმის ტელეფონი არ არის მითითებული ან ანგარიში დაბლოკილია.' }, { status: 409 })
    }

    const now = new Date().toISOString()
    await service.from('offer_access_links').update({ revoked_at: now }).eq('offer_id', offer.id).is('consumed_at', null).is('revoked_at', null)

    const token = newLinkToken()
    const { data: link, error: linkError } = await service.from('offer_access_links').insert({
      offer_id: offer.id, token_hash: hashLinkToken(token), recipient_user_id: recipient.id, recipient_phone: phone,
      expires_at: new Date(Date.now() + OFFER_LINK_TTL_MINUTES * 60_000).toISOString(), created_by: profile.id,
    }).select('id, expires_at').single()
    if (linkError || !link) throw new Error(linkError?.message || 'Link not stored')

    if (offer.status === 'draft') await service.from('offers').update({ status: 'sent' }).eq('id', offer.id)
    if (offer.request_id) {
      const { data: base } = await service.from('special_price_requests').select('group_id').eq('id', offer.request_id).maybeSingle()
      const update = service.from('special_price_requests').update({ status: 'offer_ready' }).in('status', ['received', 'reviewing'])
      await (base?.group_id ? update.eq('group_id', base.group_id) : update.eq('id', offer.request_id))
    }

    const url = `${linkBase(request)}/o/${token}`
    const delivery = await sendMessage(service, {
      recipient: phone,
      body: `Medical Line Georgia: tqveni personaluri shetavazeba ${offer.offer_number}: ${url} bmuli ertjeradia da moqmedebs ${OFFER_LINK_TTL_MINUTES} wuti. nu gauziarebt sxvas.`,
      purpose: 'offer_link', relatedType: 'offer', relatedId: offer.id,
    })

    await writeAudit(service, {
      actorId: profile.id, actor: profile.full_name, action: 'offer_link.sent', targetType: 'offer', targetId: offer.id, ip,
      details: { linkId: link.id, to: maskPhone(phone), delivered: delivery.delivered },
    })

    return NextResponse.json({
      ok: true, delivered: delivery.delivered, expiresAt: link.expires_at,
      warning: delivery.delivered ? undefined : 'შეთავაზება დამტკიცებულია, მაგრამ SMS ვერ გაიგზავნა. სცადეთ ხელახლა გაგზავნა.',
    })
  } catch (cause) {
    return serverError('offer-secure-link', cause)
  }
}
