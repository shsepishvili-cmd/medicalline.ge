import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { invoiceDraftSchema } from '@/app/lib/ai-invoice-types'
import { amountInWords, calculateInvoice } from '@/app/lib/ai-invoice-money'

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
    const url = new URL(request.url)
    let query = tokenClient
      .from('invoices')
      .select('*, invoice_items(*)')
      .order('created_at', { ascending: false })
      .limit(250)
    const status = url.searchParams.get('status')
    const currency = url.searchParams.get('currency')
    const vatMode = url.searchParams.get('vat_mode')
    const search = url.searchParams.get('search')?.replace(/[%_,()]/g, ' ').trim()
    if (status) query = query.eq('status', status)
    if (currency) query = query.eq('currency', currency)
    if (vatMode) query = query.eq('vat_mode', vatMode)
    if (search) query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, invoices: data || [] })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ინვოისები ვერ ჩაიტვირთა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, tokenClient } = await requireAdmin(request)
    const body = await request.json().catch(() => null)
    const draft = invoiceDraftSchema.parse(body?.draft)
    if (draft.vat_mode === 'unknown') {
      return NextResponse.json({ ok: false, error: 'საბოლოო შექმნამდე აირჩიეთ დღგ-ის რეჟიმი.' }, { status: 400 })
    }
    if (draft.questions.length) {
      return NextResponse.json({ ok: false, error: 'უპასუხეთ ყველა დამაზუსტებელ კითხვას საბოლოო შექმნამდე.' }, { status: 400 })
    }
    const totals = calculateInvoice(draft.items, draft.vat_mode)
    const { data: number, error: numberError } = await tokenClient.rpc('next_invoice_number', {
      p_year: Number(draft.invoice_date.slice(0, 4)),
    })
    if (numberError || !number) throw new Error(numberError?.message || 'ინვოისის ნომერი ვერ შეიქმნა.')

    const { data: invoice, error: invoiceError } = await tokenClient
      .from('invoices')
      .insert({
        invoice_number: number,
        status: 'issued',
        customer_id: draft.customer_id || null,
        customer_name: draft.customer_name,
        customer_tax_id: draft.customer_tax_id || null,
        customer_address: draft.customer_address || null,
        customer_email: draft.customer_email || null,
        customer_phone: draft.customer_phone || null,
        invoice_date: draft.invoice_date,
        delivery_date: draft.delivery_date,
        due_date: draft.due_date,
        currency: draft.currency,
        vat_mode: draft.vat_mode,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        vat_total: totals.vat_total,
        grand_total: totals.grand_total,
        amount_in_words: amountInWords(totals.grandTotalCents, draft.currency),
        payment_terms: draft.payment_terms || null,
        notes: draft.notes || null,
        stamp_applied: draft.stamp_applied,
        signature_applied: draft.signature_applied,
        source_type: body?.source_type === 'file' ? 'file' : 'prompt',
        source_file_path: typeof body?.source_file_path === 'string' ? body.source_file_path : null,
        ai_prompt: typeof body?.prompt === 'string' ? body.prompt.slice(0, 20_000) : null,
        parsed_payload: draft,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (invoiceError || !invoice) throw new Error(invoiceError?.message || 'ინვოისი ვერ შეიქმნა.')

    const rows = totals.items.map((item, index) => ({
      invoice_id: invoice.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_code: item.product_code,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      line_total: item.line_total,
      sort_order: index,
    }))
    const { error: itemsError } = await tokenClient.from('invoice_items').insert(rows)
    if (itemsError) {
      await tokenClient.from('invoices').delete().eq('id', invoice.id)
      throw new Error(itemsError.message)
    }
    await tokenClient.from('invoice_audit_logs').insert({
      invoice_id: invoice.id,
      user_id: user.id,
      action: 'invoice_created',
      metadata: { source_type: body?.source_type || 'prompt', invoice_number: number },
    })
    return NextResponse.json({ ok: true, invoice: { ...invoice, invoice_items: rows } }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ინვოისი ვერ შეიქმნა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400 })
  }
}
