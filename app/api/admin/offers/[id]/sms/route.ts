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

function buildSmsText(offer: { client_name?: string | null; product_name: string; token: string }, origin: string) {
  const greeting = offer.client_name ? `გამარჯობა, ${offer.client_name}.` : 'გამარჯობა.'
  return `${greeting} გიგზავნით Medical Line-ის შეთავაზებას ${offer.product_name}-ზე: ${origin}/offer/${offer.token}`
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const { data: offer, error } = await auth.admin
    .from('product_offers')
    .select('id, token, product_name, client_name, client_phone, status')
    .eq('id', id)
    .single()

  if (error || !offer) {
    return NextResponse.json({ code: 'offer_not_found', error: error?.message || 'Offer not found.' }, { status: 404 })
  }

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

  await auth.admin
    .from('product_offers')
    .update({
      status: offer.status === 'draft' ? 'sent' : offer.status,
      sms_sent_at: new Date().toISOString(),
      sms_provider: delivery.provider,
      sms_message_id: delivery.messageId ? String(delivery.messageId) : null,
    })
    .eq('id', offer.id)

  return NextResponse.json({
    ok: true,
    smsSent: true,
    smsText,
    smsProvider: delivery.provider,
    smsMessageId: delivery.messageId ?? null,
    balance: delivery.balance ?? null,
  })
}
