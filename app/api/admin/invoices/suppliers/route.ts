import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWarrantySession } from '@/app/lib/supabase-server'

const itemSchema = z.object({
  product_name: z.string().trim().min(1).max(300),
  sku: z.string().trim().max(100).nullable().optional(),
  unit: z.string().trim().min(1).max(40).default('pcs'),
  quantity: z.coerce.number().positive().max(1_000_000),
  unit_price: z.coerce.number().min(0).max(1_000_000_000),
})

const supplierInvoiceSchema = z.object({
  document_type: z.enum(['supplier_invoice', 'business_trip']).default('supplier_invoice'),
  manufacturer_id: z.string().uuid().nullable().optional(),
  manufacturer_name: z.string().trim().min(1).max(200),
  invoice_number: z.string().trim().max(100).nullable().optional(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.enum(['USD', 'EUR', 'GEL', 'CNY']),
  total: z.coerce.number().min(0).max(1_000_000_000),
  storage_path: z.string().trim().max(1000).nullable().optional(),
  original_filename: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  items: z.array(itemSchema).max(500).default([]),
}).superRefine((input, context) => {
  if (input.document_type === 'supplier_invoice' && input.items.length < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['items'],
      message: 'მომწოდებლის ინვოისს მინიმუმ ერთი პროდუქტის ხაზი სჭირდება.',
    })
  }
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
        document_type: input.document_type,
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

    const itemRows = input.items.map((item) => ({
      supplier_invoice_id: invoice.id,
      product_name: item.product_name,
      sku: item.sku || null,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: input.currency,
    }))

    if (itemRows.length) {
      try {
        const { error: itemsError } = await tokenClient.from('supplier_invoice_items').insert(itemRows)
        if (itemsError) throw itemsError
      } catch (cause) {
        await tokenClient.from('supplier_invoices').delete().eq('id', invoice.id)
        throw cause
      }
    }

    return NextResponse.json({ ok: true, invoice: { ...invoice, supplier_invoice_items: itemRows } }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'მომწოდებლის ინვოისი ვერ შეიქმნა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400 })
  }
}
