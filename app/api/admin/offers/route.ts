import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { findCatalogProductByAny, inferBrand, mapCategoryToSlug, specsArrayToRecord } from '@/app/lib/catalogSync'

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

  return { admin, user }
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function validNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null
}

function normalizeOfferBrand(product: Record<string, unknown>) {
  const key = [
    cleanText(product.slug),
    cleanText(product.name),
    cleanText(product.product_name),
  ].join(' ').toLowerCase()

  if (key.includes('finscan') || key.includes('f350')) return 'FinScan'
  return cleanText(product.brand, 'Medical Line')
}

function normalizeProductForOffer(product: Record<string, unknown>) {
  const catalogProduct = findCatalogProductByAny({
    slug: cleanText(product.slug),
    name: cleanText(product.name),
    img: Array.isArray(product.images) ? cleanText(product.images[0]) : cleanText(product.img),
  })

  if (!catalogProduct) return product

  return {
    ...product,
    slug: catalogProduct.slug,
    name: catalogProduct.name,
    category_slug: mapCategoryToSlug(catalogProduct.cat),
    cat: catalogProduct.cat,
    brand: normalizeOfferBrand({
      slug: catalogProduct.slug,
      name: catalogProduct.name,
      brand: inferBrand(catalogProduct),
    }),
    short_desc: catalogProduct.description,
    description: catalogProduct.description,
    images: [catalogProduct.img],
    specs: specsArrayToRecord(catalogProduct.specs),
    sort_order: catalogProduct.id,
  }
}

function createOfferToken() {
  return randomBytes(9).toString('base64url')
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await auth.admin
    .from('product_offers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, offers: data || [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const rawProduct = body?.product as Record<string, unknown> | undefined
  const clientName = cleanText(body?.clientName)
  const clientPhone = cleanText(body?.clientPhone)
  const priceGel = validNumber(body?.priceGel)
  const installmentMonths = Math.max(1, Number(body?.installmentMonths || 12))
  const installmentMonthly = priceGel !== null ? Math.round(priceGel / installmentMonths) : null
  const expiresInDays = Number(body?.expiresInDays || 14)
  const expiresAt = Number.isFinite(expiresInDays) && expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  if (!rawProduct || !cleanText(rawProduct.name)) {
    return NextResponse.json({ code: 'missing_product', error: 'Product is required.' }, { status: 400 })
  }

  const product = normalizeProductForOffer(rawProduct)

  const productPayload = {
    product_id: cleanText(product.dbId) || null,
    product_slug: cleanText(product.slug) || null,
    product_name: cleanText(product.name),
    product_category: cleanText(product.category_slug) || cleanText(product.cat) || null,
    product_brand: normalizeOfferBrand(product),
    product_description: cleanText(product.short_desc) || cleanText(product.description) || null,
    product_image: Array.isArray(product.images) ? cleanText(product.images[0]) : cleanText(product.img) || null,
    product_specs: Array.isArray(product.specs)
      ? product.specs
      : product.specs && typeof product.specs === 'object'
        ? Object.values(product.specs)
        : [],
  }

  const token = createOfferToken()
  const { data, error } = await auth.admin
    .from('product_offers')
    .insert({
      ...productPayload,
      token,
      client_name: clientName || null,
      client_phone: clientPhone || null,
      price_gel: priceGel,
      installment_monthly: installmentMonthly,
      installment_months: installmentMonths,
      warranty_note: cleanText(body?.warrantyNote, 'გარანტია: 12 თვე ოფიციალური სერვისით') || null,
      delivery_note: cleanText(body?.deliveryNote, 'მიწოდება/მონტაჟი შეთანხმებით') || null,
      custom_note: cleanText(body?.customNote) || null,
      status: 'sent',
      expires_at: expiresAt,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ code: 'offer_create_failed', error: error?.message || 'Could not create offer.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, offer: data })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null
  const allowed = new Set(['sent', 'accepted', 'expired', 'archived'])
  if (!body?.id || !body.status || !allowed.has(body.status)) {
    return NextResponse.json({ code: 'invalid_status', error: 'Valid offer id and status are required.' }, { status: 400 })
  }

  const { data, error } = await auth.admin
    .from('product_offers')
    .update({ status: body.status })
    .eq('id', body.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ code: 'offer_update_failed', error: error?.message || 'Could not update offer.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, offer: data })
}
