import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

const credoMerchantId = process.env.CREDO_MERCHANT_ID?.trim() || ''
const credoPassword = process.env.CREDO_PASSWORD?.trim() || process.env.CREDO_SECRET?.trim() || ''
const credoOrderUrl = process.env.CREDO_ORDER_URL?.trim() || 'https://ganvadeba.credo.ge/widget_api/index.php'

let cachedClient: SupabaseClient | null = null

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cachedClient
}

function md5(value: string) {
  return createHash('md5').update(value).digest('hex')
}

function normalizeCredoMobile(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('995') && digits.length === 12) return digits.slice(3)
  if (digits.length === 9 && digits.startsWith('5')) return digits
  return digits
}

function safeProductId(value: string | null | undefined) {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)
  return normalized || 'medical-line-offer'
}

function statusName(statusId: number | null) {
  const names: Record<number, string> = {
    2: 'Processing',
    3: 'Approved',
    4: 'Needs to be signed',
    5: 'Finished',
    6: 'Rejected',
    7: 'Cancelled',
    9: 'Sent to branch',
    10: 'Need identification',
    11: 'Draft',
    12: 'Products need to be sent',
    13: 'Sent to video monitoring',
    14: 'Sent to bank for review',
  }
  return statusId ? names[statusId] || `Status ${statusId}` : null
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const client = getAdminClient()
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Supabase service client is not configured.' }, { status: 503 })
  }

  if (!credoMerchantId || !credoPassword) {
    return NextResponse.json({
      ok: false,
      error: 'Credo credentials are not configured. Set CREDO_MERCHANT_ID and CREDO_PASSWORD.',
    }, { status: 503 })
  }

  const { token } = await params
  const { data: offer, error } = await client
    .from('product_offers')
    .select('id, token, product_slug, product_name, client_name, client_phone, price_gel, installment_months, status, expires_at')
    .eq('token', token)
    .single()

  if (error || !offer) {
    return NextResponse.json({ ok: false, error: error?.message || 'Offer not found.' }, { status: 404 })
  }

  const expired = offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()
  if (expired || offer.status === 'expired' || offer.status === 'archived' || offer.status === 'draft') {
    return NextResponse.json({ ok: false, error: 'Offer is not active.' }, { status: 410 })
  }

  const priceTetri = Math.round(Number(offer.price_gel || 0) * 100)
  if (!Number.isFinite(priceTetri) || priceTetri <= 0) {
    return NextResponse.json({ ok: false, error: 'Credo installment requires an offer price.' }, { status: 400 })
  }

  const mobile = normalizeCredoMobile(offer.client_phone)
  if (!/^5\d{8}$/.test(mobile)) {
    return NextResponse.json({ ok: false, error: 'Credo installment requires a Georgian mobile number, e.g. 5XXXXXXXX.' }, { status: 400 })
  }

  const product = {
    id: safeProductId(offer.product_slug || offer.id),
    title: String(offer.product_name || 'Medical Line offer').slice(0, 120),
    amount: '1',
    price: String(priceTetri),
    type: '0',
  }
  const orderCode = `ML${Date.now()}${String(offer.id).replace(/\D/g, '').slice(0, 6)}`
  const check = md5(`${product.id}${product.title}${product.amount}${product.price}${product.type}${credoPassword}`)

  const fullNameParts = String(offer.client_name || '').trim().split(/\s+/).filter(Boolean)
  const payload = {
    merchantId: credoMerchantId,
    orderCode,
    check,
    products: [product],
    installmentLength: Number(offer.installment_months || 12),
    clientFullName: fullNameParts.length >= 2 ? fullNameParts.join(' ') : (offer.client_name || 'Medical Line Client'),
    mobile,
    email: 'ltdmedicalline@gmail.com',
    factAddress: 'Georgia',
  }

  const response = await fetch(credoOrderUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'manual',
  })

  const location = response.headers.get('location')
  const rawText = await response.text().catch(() => '')
  const redirectUrl =
    location ||
    rawText.match(/https:\/\/ganvadeba\.credo\.ge\/installment\/\?OrderHash=[^\s"'<>]+/i)?.[0] ||
    null

  if (!response.ok && !redirectUrl) {
    return NextResponse.json({
      ok: false,
      error: `Credo request failed with HTTP ${response.status}.`,
      details: rawText.slice(0, 500),
    }, { status: 502 })
  }

  if (!redirectUrl) {
    return NextResponse.json({
      ok: false,
      error: 'Credo did not return redirect URL.',
      details: rawText.slice(0, 500),
    }, { status: 502 })
  }

  await client
    .from('product_offers')
    .update({
      credo_order_code: orderCode,
      credo_redirect_url: redirectUrl,
      credo_requested_at: new Date().toISOString(),
      credo_status_id: 2,
      credo_status_name: statusName(2),
    })
    .eq('id', offer.id)

  return NextResponse.json({ ok: true, redirectUrl, orderCode })
}
