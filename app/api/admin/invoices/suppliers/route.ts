import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWarrantySession } from '@/app/lib/supabase-server'

const itemSchema = z.object({
  erp_product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().trim().min(1).max(300),
  sku: z.string().trim().max(100).nullable().optional(),
  unit: z.string().trim().min(1).max(40).default('pcs'),
  quantity: z.coerce.number().positive().max(1_000_000),
  unit_price: z.coerce.number().min(0).max(1_000_000_000),
})

const supplierInvoiceSchema = z.object({
  manufacturer_id: z.string().uuid().nullable().optional(),
  manufacturer_name: z.string().trim().min(1).max(200),
  invoice_number: z.string().trim().max(100).nullable().optional(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.enum(['USD', 'EUR', 'GEL', 'CNY']),
  total: z.coerce.number().min(0).max(1_000_000_000),
  storage_path: z.string().trim().max(1000).nullable().optional(),
  original_filename: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  items: z.array(itemSchema).min(1).max(500),
})

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Unauthorized')
  const session = await requireWarrantySession(token)
  if (session.profile.role !== 'admin') throw new Error('Forbidden')
  return session
}

export async function GET(request: NextRequest) {
  try {
    const { tokenClient } = await requireAdmin(request)
    const [manufacturers, invoices, history] = await Promise.all([
      tokenClient.from('supplier_manufacturers').select('*').order('name'),
      tokenClient.from('supplier_invoices').select('*, supplier_invoice_items(*)').order('invoice_date', { ascending: false }).limit(500),
      tokenClient.from('invoice_unified_history').select('*').order('created_at', { ascending: false }).limit(500),
    ])
    if (manufacturers.error) throw manufacturers.error
    if (invoices.error) throw invoices.error
    if (history.error) throw history.error
    return NextResponse.json({
      ok: true,
      manufacturers: manufacturers.data || [],
      supplier_invoices: invoices.data || [],
      unified_history: history.data || [],
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'მომწოდებლის ინვოისები ვერ ჩაიტვირთა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, tokenClient } = await requireAdmin(request)
    const input = supplierInvoiceSchema.parse(await request.json())

    let manufacturerId = input.manufacturer_id || null
    if (!manufacturerId) {
      const { data: manufacturer, error } = await tokenClient
        .from('supplier_manufacturers')
        .upsert({ name: input.manufacturer_name, created_by: user.id }, { onConflict: 'name' })
        .select('id')
        .single()
      if (error) throw error
      manufacturerId = manufacturer.id
    }

    const { data: invoice, error: invoiceError } = await tokenClient
      .from('supplier_invoices')
      .insert({
        manufacturer_id: manufacturerId,
        manufacturer_name: input.manufacturer_name,
        invoice_number: input.invoice_number || null,
        invoice_date: input.invoice_date,
        currency: input.currency,
        total: input.total,
        storage_path: input.storage_path || null,
        original_filename: input.original_filename || null,
        notes: input.notes || null,
        parsed_payload: input,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (invoiceError || !invoice) throw new Error(invoiceError?.message || 'მომწოდებლის ინვოისი ვერ შეიქმნა.')

    const { data: company } = await tokenClient.from('erp_companies').select('id').limit(1).maybeSingle()
    const itemRows = []
    try {
      for (const item of input.items) {
        let productId = item.erp_product_id || null
        if (!productId) {
          const term = (item.sku || item.product_name).replace(/[%_,()]/g, ' ').trim()
          let lookup = tokenClient.from('erp_products').select('id').eq('is_active', true)
          lookup = item.sku ? lookup.eq('code', item.sku) : lookup.ilike('name', item.product_name)
          const { data: existing } = await lookup.limit(1).maybeSingle()
          productId = existing?.id || null
          if (!productId && company?.id) {
            const { data: created, error: createError } = await tokenClient
              .from('erp_products')
              .insert({
                company_id: company.id,
                code: item.sku || `SUP-${Date.now()}`,
                name: item.product_name,
                category: input.manufacturer_name,
                unit: item.unit,
                default_cost: item.unit_price,
                default_price: 0,
                vat_rate: 18,
                requires_serial: false,
                is_active: true,
                source: 'supplier_invoice',
              })
              .select('id')
              .single()
            if (createError) throw createError
            productId = created.id
          }
          void term
        }
        if (productId) {
          const { error: updateError } = await tokenClient
            .from('erp_products')
            .update({ default_cost: item.unit_price, unit: item.unit, updated_at: new Date().toISOString() })
            .eq('id', productId)
          if (updateError) throw updateError
        }
        itemRows.push({
          supplier_invoice_id: invoice.id,
          erp_product_id: productId,
          product_name: item.product_name,
          sku: item.sku || null,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: input.currency,
        })
      }
      const { error: itemsError } = await tokenClient.from('supplier_invoice_items').insert(itemRows)
      if (itemsError) throw itemsError
    } catch (cause) {
      await tokenClient.from('supplier_invoices').delete().eq('id', invoice.id)
      throw cause
    }

    return NextResponse.json({ ok: true, invoice: { ...invoice, supplier_invoice_items: itemRows } }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'მომწოდებლის ინვოისი ვერ შეიქმნა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400 })
  }
}
