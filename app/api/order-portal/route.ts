import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validateOrderPayload } from '@/app/lib/order-portal'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

function serviceClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || null
}

function orderNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const suffix = String(Date.now()).slice(-6)
  return `ORD-${y}${m}${d}-${suffix}`
}

function orderNotifyPhones() {
  const raw = process.env.ORDER_NOTIFY_PHONE?.trim()
    || process.env.ORDER_ADMIN_PHONE?.trim()
    || process.env.ADMIN_NOTIFY_PHONE?.trim()
    || ''
  return raw.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean)
}

function notifyText(orderNo: string, input: ReturnType<typeof validateOrderPayload>) {
  const product = input.requestedProduct.replace(/\s+/g, ' ').slice(0, 120)
  return [
    `Axali shekveta: ${orderNo}`,
    `Klienti: ${input.fullName}`,
    `Tel: ${input.phone}`,
    input.clinicName ? `Klinika: ${input.clinicName}` : '',
    `Produqti: ${product}`,
    'Admin: medicalline.ge/admin/orders',
  ].filter(Boolean).join('\n')
}

function partyName(input: ReturnType<typeof validateOrderPayload>) {
  return input.clinicName || input.fullName
}

function partyType(current?: string | null) {
  if (current === 'supplier' || current === 'both') return 'both'
  return 'customer'
}

async function defaultCompanyId(admin: ReturnType<typeof serviceClient>) {
  const byCode = await admin
    .from('erp_companies')
    .select('id')
    .eq('code', 'MEDIQALJORJIA')
    .maybeSingle()

  if (byCode.data?.id) return byCode.data.id as string

  const first = await admin
    .from('erp_companies')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return first.data?.id as string | undefined
}

async function ensureErpCustomer(admin: ReturnType<typeof serviceClient>, input: ReturnType<typeof validateOrderPayload>) {
  try {
    const companyId = await defaultCompanyId(admin)
    if (!companyId) {
      console.error('[order-portal] ERP company not found')
      return null
    }

    let party: {
      id: string
      party_type: string | null
      tax_id: string | null
      email: string | null
      address: string | null
      city: string | null
    } | null = null

    if (input.taxId) {
      const byTaxId = await admin
        .from('erp_parties')
        .select('id, party_type, tax_id, email, address, city')
        .eq('company_id', companyId)
        .eq('tax_id', input.taxId)
        .limit(1)
        .maybeSingle()
      if (byTaxId.error) throw byTaxId.error
      party = byTaxId.data
    }

    if (!party) {
      const byPhone = await admin
        .from('erp_parties')
        .select('id, party_type, tax_id, email, address, city')
        .eq('company_id', companyId)
        .eq('phone_normalized', input.phone)
        .limit(1)
        .maybeSingle()
      if (byPhone.error) throw byPhone.error
      party = byPhone.data
    }

    const payload = {
      party_type: partyType(party?.party_type),
      name: partyName(input),
      tax_id: input.taxId || party?.tax_id || null,
      phone: input.phoneDisplay || input.phone,
      phone_normalized: input.phone,
      email: input.email || party?.email || null,
      address: input.deliveryAddress || party?.address || null,
      city: input.city || input.deliveryCity || party?.city || null,
      lead_source: 'order_portal',
      is_individual: !input.clinicName,
      source: 'order_portal',
    }

    if (party?.id) {
      const { data, error } = await admin
        .from('erp_parties')
        .update(payload)
        .eq('id', party.id)
        .select('id')
        .single()
      if (error) throw error
      return data?.id as string | null
    }

    const { data, error } = await admin
      .from('erp_parties')
      .insert({ ...payload, company_id: companyId })
      .select('id')
      .single()

    if (error) throw error
    return data?.id as string | null
  } catch (cause) {
    console.error('[order-portal] ERP customer sync failed', cause)
    return null
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'შეკვეთის შენახვა დროებით მიუწვდომელია.' }, { status: 503 })
    }

    const raw = await request.json().catch(() => ({}))
    const input = validateOrderPayload(raw)
    const admin = serviceClient()
    const erpPartyId = await ensureErpCustomer(admin, input)
    const orderCustomerPayload = {
      ...(erpPartyId ? { erp_party_id: erpPartyId } : {}),
      phone_normalized: input.phone,
      phone_display: input.phoneDisplay || input.phone,
      full_name: input.fullName,
      clinic_name: input.clinicName || null,
      city: input.city || null,
      email: input.email || null,
      tax_id: input.taxId || null,
      source: 'order_portal',
    }

    const { data: customer, error: customerError } = await admin
      .from('order_customers')
      .upsert(orderCustomerPayload, { onConflict: 'phone_normalized' })
      .select('id')
      .single()

    if (customerError || !customer?.id) {
      console.error('[order-portal] customer upsert failed', customerError)
      return NextResponse.json({ error: 'კლიენტის მონაცემების შენახვა ვერ მოხერხდა.' }, { status: 500 })
    }

    const { data: savedOrder, error: orderError } = await admin
      .from('order_portal_orders')
      .insert({
        order_number: orderNumber(),
        customer_id: customer.id,
        status: 'new',
        requested_product: input.requestedProduct,
        product_category: input.productCategory || null,
        quantity: input.quantity,
        urgency: input.urgency || null,
        preferred_contact: input.preferredContact || null,
        delivery_city: input.deliveryCity || null,
        delivery_address: input.deliveryAddress || null,
        comment: input.comment || null,
        source: 'public_order_portal',
        ip_address: getClientIp(request),
        user_agent: request.headers.get('user-agent') || null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !savedOrder?.id) {
      console.error('[order-portal] order insert failed', orderError)
      return NextResponse.json({ error: 'შეკვეთის შენახვა ვერ მოხერხდა.' }, { status: 500 })
    }

    if (isSmsProviderConfigured()) {
      const phones = orderNotifyPhones()
      await Promise.all(phones.map((phone) => (
        sendContractSms(phone, notifyText(savedOrder.order_number, input))
          .catch((cause) => console.error('[order-portal] admin SMS notification failed', cause))
      )))
    }

    return NextResponse.json({ ok: true, orderId: savedOrder.id, orderNumber: savedOrder.order_number }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'შეკვეთის გაგზავნა ვერ მოხერხდა.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
