import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function isUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ code: 'missing_public_env', error: 'Supabase public env is not configured.' }, { status: 500 })
  }

  if (!supabaseServiceKey) {
    return NextResponse.json({
      code: 'missing_service_role',
      error: 'SUPABASE_SERVICE_ROLE_KEY is missing in Vercel environment variables.',
    }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) {
    return NextResponse.json({ code: 'missing_access_token', error: 'Unauthorized' }, { status: 401 })
  }

  const userClient = tokenClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken)

  if (userError || !user) {
    return NextResponse.json({ code: 'invalid_access_token', error: userError?.message || 'Unauthorized' }, { status: 401 })
  }

  const admin = serviceClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ code: 'admin_role_required', error: profileError?.message || 'Forbidden: admin role is required.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    product?: Record<string, unknown>
    price?: number
    installmentMonths?: number
    note?: string
  } | null

  const product = body?.product || {}
  const price = Number(body?.price)
  const installmentMonths = Math.max(1, Number(body?.installmentMonths || 12))
  const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim() : 'განვადება Credo-ს გავლით'

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ code: 'invalid_price', error: 'Price must be a valid positive number.' }, { status: 400 })
  }

  const slug = typeof product.slug === 'string' ? product.slug.trim() : ''
  const name = typeof product.name === 'string' ? product.name.trim() : ''
  let productId = ''

  if (slug && name) {
    const { data: savedProduct, error: productError } = await admin
      .from('products')
      .upsert({
        slug,
        name,
        category_slug: typeof product.category_slug === 'string' ? product.category_slug : 'other',
        brand: typeof product.brand === 'string' ? product.brand : 'Medical Line',
        short_desc: typeof product.short_desc === 'string' ? product.short_desc : null,
        specs: product.specs && typeof product.specs === 'object' ? product.specs : {},
        images: Array.isArray(product.images) ? product.images : [],
        is_active: true,
        sort_order: Number(product.sort_order || 9999),
      }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (productError || !savedProduct?.id) {
      return NextResponse.json({ code: 'product_save_failed', error: productError?.message || 'Could not save product.' }, { status: 500 })
    }

    productId = savedProduct.id
  } else if (isUuid(product.dbId) || isUuid(product.id)) {
    productId = isUuid(product.dbId) ? String(product.dbId) : String(product.id)
  } else {
    return NextResponse.json({ code: 'missing_product_identity', error: 'Product slug and name are required.' }, { status: 400 })
  }

  if (productId) {
    const activationPatch: Record<string, unknown> = {
      is_active: true,
    }
    if (slug) activationPatch.slug = slug
    if (name) activationPatch.name = name
    if (typeof product.category_slug === 'string' && product.category_slug) activationPatch.category_slug = product.category_slug
    if (typeof product.brand === 'string' && product.brand) activationPatch.brand = product.brand
    if (typeof product.short_desc === 'string') activationPatch.short_desc = product.short_desc || null
    if (product.specs && typeof product.specs === 'object') activationPatch.specs = product.specs
    if (Array.isArray(product.images)) activationPatch.images = product.images
    if (product.sort_order !== undefined) activationPatch.sort_order = Number(product.sort_order || 9999)

    const { error: productActivationError } = await admin
      .from('products')
      .update(activationPatch)
      .eq('id', productId)

    if (productActivationError) {
      return NextResponse.json({ code: 'product_activate_failed', error: productActivationError.message }, { status: 500 })
    }
  }

  const { data: savedPrice, error: priceError } = await admin
    .from('prices')
    .upsert({
      product_id: productId,
      price_gel: price,
      installment_monthly: Math.round(price / installmentMonths),
      installment_months: installmentMonths,
      note,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product_id' })
    .select('*')
    .single()

  if (priceError || !savedPrice) {
    console.error('[admin-prices] price upsert failed', { productId, slug, error: priceError?.message || 'No saved row returned' })
    return NextResponse.json({ code: 'price_save_failed', error: priceError?.message || 'Could not save price.' }, { status: 500 })
  }

  const { data: verifiedPrice, error: verifyError } = await admin
    .from('prices')
    .select('id, product_id, price_gel, installment_monthly, installment_months, note, updated_at')
    .eq('product_id', productId)
    .single()

  if (verifyError || !verifiedPrice || Number(verifiedPrice.price_gel) !== price) {
    console.error('[admin-prices] saved price verification failed', {
      productId,
      slug,
      expectedPrice: price,
      actualPrice: verifiedPrice?.price_gel ?? null,
      error: verifyError?.message || null,
    })
    return NextResponse.json({
      code: 'price_verification_failed',
      error: verifyError?.message || 'ფასი ჩაიწერა, მაგრამ ბაზიდან გადამოწმება ვერ მოხერხდა.',
    }, { status: 500 })
  }

  // Backfill orphaned price requests that were created without product_id.
  // This keeps old clinic requests linked so price becomes visible in request history.
  if (slug || name) {
    const orphansQuery = admin
      .from('requests')
      .select('id, message')
      .eq('type', 'price')
      .is('product_id', null)

    const { data: orphanRequests } = await orphansQuery
    const matches = (orphanRequests || []).filter((request) => {
      const msg = (request.message || '').toLowerCase()
      return Boolean(
        (name && msg.includes(name.toLowerCase())) ||
        (slug && msg.includes(slug.toLowerCase()))
      )
    })
    if (matches.length) {
      const matchedIds = matches.map((request) => request.id)
      await admin
        .from('requests')
        .update({ product_id: productId })
        .in('id', matchedIds)
    }
  }

  // Manual workflow: do not auto-complete clinic price requests.
  // Admin changes only save product price; request status is controlled from admin panel.

  console.info('[admin-prices] price saved and verified', { productId, slug, price })
  return NextResponse.json({ ok: true, productId, price: verifiedPrice })
}
