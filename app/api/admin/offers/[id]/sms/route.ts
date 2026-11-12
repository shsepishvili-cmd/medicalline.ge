import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

function tokenClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function serviceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ code: 'missing_public_env', error: 'Supabase public env is not configured.' }, { status: 500 }) }
  }
  if (!supabaseServiceKey) {
    return { error: NextResponse.json({ code: 'missing_service_role', error: 'SUPABASE_SERVICE_ROLE_KEY is missing.' }, { status: 503 }) }
  }

  const accessToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) {
    return { error: NextResponse.json({ code: 'missing_access_token', error: 'Unauthorized' }, { status: 401 }) }
  }

  const userClient = tokenClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken)

  if (userError || !user) {
    return { error: NextResponse.json({ code: 'invalid_access_token', error: userError?.message || 'Unauthorized' }, { status: 401 }) }
  }

  const admin = serviceClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ code: 'admin_role_required', error: profileError?.message || 'Forbidden' }, { status: 403 }) }
  }

  return { admin }
}

function siteOrigin(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  return new URL(request.url).origin
}

function formatMoney(value?: number | null) {
  const amount = Number(value || 0)
  return amount > 0 ? `${amount.toLocaleString('ka-GE')} ₾` : ''
}

function buildSmsText(offer: {
  client_name?: string | null
  product_name: string
  token: string
  price_gel?: number | null
  installment_monthly?: number | null
  installment_months?: number | null
}, origin: string) {
  const greeting = offer.client_name ? `გამარჯობა, ${offer.client_name}.` : 'გამარჯობა.'
  const total = formatMoney(offer.price_gel)
  const monthly = formatMoney(offer.installment_monthly)
  const months = Number(offer.installment_months || 0)
  const terms = monthly && months ? ` ${monthly}/თვე, ${months} თვე.` : total ? ` თანხა: ${total}.` : ''
  return `${greeting} Medical Line-ის განვადების დოკუმენტი — ${offer.product_name}.${terms} ნახვა: ${origin}/offer/${offer.token}`
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const { data: offer, error } = await auth.admin
    .from('product_offers')
    .select('id, token, product_name, client_name, client_phone, price_gel, installment_monthly, installment_months, status, expires_at')
    .eq('id', id)
    .single()

  if (error || !offer) {
    return NextResponse.json({ code: 'offer_not_found', error: error?.message || 'Offer not found.' }, { status: 404 })
  }

  if (offer.status === 'expired' || offer.status === 'archived') return NextResponse.json({ ok: false, error: 'შეთავაზება გაუქმებულია.' }, { status: 409 })
  if (offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) return NextResponse.json({ ok: false, error: 'შეთავაზების ვადა ამოიწურა.' }, { status: 409 })

  const smsText = buildSmsText(offer, siteOrigin(request))
  if (!offer.client_phone) {
    return NextResponse.json({ ok: false, code: 'missing_phone', error: 'კლიენტის ტელეფონი არ არის მითითებული.', smsText }, { status: 400 })
  }

  if (!isSmsProviderConfigured()) {
    return NextResponse.json({
      ok: true,
      smsSent: false,
      smsText,
      error: 'GOSMS provider is not configured.',
    })
  }

  const delivery = await sendContractSms(offer.client_phone, smsText)
  const sentAt = new Date()

  await auth.admin
    .from('product_offers')
    .update({
      status: offer.status === 'draft' ? 'sent' : offer.status,
      expires_at: offer.status === 'draft' ? new Date(sentAt.getTime() + 72 * 60 * 60 * 1000).toISOString() : offer.expires_at,
      sms_sent_at: sentAt.toISOString(),
      sms_provider: delivery.provider,
      sms_message_id: delivery.messageId ? String(delivery.messageId) : null,
    })
    .eq('id', offer.id)

  return NextResponse.json({
    ok: true,
    smsSent: true,
    smsText,
    documentUrl: `${siteOrigin(request)}/offer/${offer.token}`,
    smsProvider: delivery.provider,
    smsMessageId: delivery.messageId ?? null,
    balance: delivery.balance ?? null,
  })
}
