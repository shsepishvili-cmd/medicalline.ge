import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { normalizeGeorgianPhone, verifyPhoneChallenge } from '@/app/lib/phone-verification'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

type CartItemInput = {
  slug?: string
  name?: string
  category?: string
  brand?: string
  image?: string
  quantity?: number
}

function serviceClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || null
}

function cleanText(value: unknown, max = 220) {
  return String(value || '').trim().slice(0, max)
}

function normalizeItems(items: unknown): CartItemInput[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => ({
      slug: cleanText(item?.slug, 120),
      name: cleanText(item?.name, 220),
      category: cleanText(item?.category, 120),
      brand: cleanText(item?.brand, 120),
      image: cleanText(item?.image, 500),
      quantity: Math.max(1, Math.min(99, Number(item?.quantity) || 1)),
    }))
    .filter((item) => item.slug && item.name)
    .slice(0, 50)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const fullName = cleanText(body?.fullName, 160)
  const clinicName = cleanText(body?.clinicName, 180)
  const city = cleanText(body?.city, 120)
  const email = cleanText(body?.email, 180).toLowerCase()
  const taxId = cleanText(body?.taxId, 80)
  const comment = cleanText(body?.comment, 1200)
  const phone = normalizeGeorgianPhone(String(body?.phone || ''))
  const otpCode = cleanText(body?.otpCode, 12)
  const challenge = cleanText(body?.challenge, 2000)
  const items = normalizeItems(body?.items)

  if (!fullName || !clinicName || !city || !email || !phone) {
    return NextResponse.json({ error: 'შეავსეთ სახელი, კლინიკა, ქალაქი, ელფოსტა და ტელეფონი.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'მიუთითეთ სწორი ელფოსტა.' }, { status: 400 })
  }
  if (!items.length) {
    return NextResponse.json({ error: 'კალათა ცარიელია.' }, { status: 400 })
  }
  if (!challenge || !otpCode || !verifyPhoneChallenge(challenge, phone, otpCode)) {
    return NextResponse.json({ error: 'SMS კოდი არასწორია ან ვადა გაუვიდა.' }, { status: 400 })
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'მოთხოვნის შენახვა დროებით მიუწვდომელია.' }, { status: 503 })
  }

  const admin = serviceClient()
  const now = new Date().toISOString()
  const { data: savedRequest, error: requestError } = await admin
    .from('cart_invoice_requests')
    .insert({
      full_name: fullName,
      clinic_name: clinicName,
      city,
      phone,
      email,
      tax_id: taxId || null,
      comment: comment || null,
      status: 'new',
      otp_verified_at: now,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent') || null,
      source: 'catalog_cart',
    })
    .select('id')
    .single()

  if (requestError || !savedRequest?.id) {
    console.error('[cart-invoice-request] insert failed', requestError)
    return NextResponse.json({ error: 'მოთხოვნის შენახვა ვერ მოხერხდა.' }, { status: 500 })
  }

  const itemRows = items.map((item, index) => ({
    request_id: savedRequest.id,
    product_slug: item.slug,
    product_name: item.name,
    product_category: item.category || null,
    product_brand: item.brand || null,
    product_image: item.image || null,
    quantity: item.quantity || 1,
    sort_order: index + 1,
  }))

  const { error: itemError } = await admin.from('cart_invoice_request_items').insert(itemRows)
  if (itemError) {
    console.error('[cart-invoice-request] item insert failed', itemError)
    await admin.from('cart_invoice_requests').delete().eq('id', savedRequest.id)
    return NextResponse.json({ error: 'პროდუქტების შენახვა ვერ მოხერხდა.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, requestId: savedRequest.id }, { status: 201 })
}
