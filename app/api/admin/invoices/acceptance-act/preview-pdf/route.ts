import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { generateInvoiceAcceptanceActPdf } from '@/app/lib/invoice-acceptance-act-pdf'
import { buildInvoiceAcceptanceActNumber } from '@/app/lib/invoice-acceptance-act'

export const runtime = 'nodejs'

const defaultCompany = {
  company_name: 'შპს „მედიქალ ლაინ ჯორჯია“',
  tax_id: '417893569',
  address: 'თბილისი, ჯაბიძის ქუჩა 8',
  director: 'შოთა სეფიშვილი',
  bank_account: 'GE50BG0000000103262327GEL',
}

function bearer(request: NextRequest) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
}

export async function POST(request: NextRequest) {
  try {
    const token = bearer(request)
    if (!token) throw new Error('Unauthorized')
    const { profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') throw new Error('Forbidden')

    const body = await request.json().catch(() => ({}))
    const invoiceNumber = String(body.invoice_number || 'INV-2026-0001').trim()
    const actNumber = String(body.act_number || buildInvoiceAcceptanceActNumber(invoiceNumber)).trim()
    const actDate = String(body.act_date || new Date().toISOString().slice(0, 10)).trim()
    const invoiceDate = String(body.invoice_date || actDate).trim()
    const customerName = String(body.customer_name || 'მყიდველი').trim()
    const customerTaxId = body.customer_tax_id ? String(body.customer_tax_id).trim() : null
    const customerAddress = body.customer_address ? String(body.customer_address).trim() : null
    const deliveryDate = body.delivery_date ? String(body.delivery_date).trim() : actDate
    const notes = body.notes ? String(body.notes).trim() : null
    const rawItems = Array.isArray(body.items) ? body.items : []
    const items = rawItems.map((item: { product_name?: string; product_code?: string | null; unit?: string; quantity?: number }) => ({
      product_name: String(item.product_name || 'პროდუქტი').trim(),
      product_code: item.product_code ? String(item.product_code).trim() : null,
      unit: String(item.unit || 'ცალი').trim(),
      quantity: Number(item.quantity) || 1,
    }))

    const { data: dbSettings } = await tokenClient
      .from('invoice_company_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    const company = dbSettings || defaultCompany

    const pdf = generateInvoiceAcceptanceActPdf({
      act_number: actNumber,
      act_date: actDate,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      delivery_date: deliveryDate,
      customer_name: customerName,
      customer_tax_id: customerTaxId,
      customer_address: customerAddress,
      notes,
      items: items.length ? items : [{ product_name: 'სამედიცინო აპარატურა / მასალები', unit: 'ცალი', quantity: 1 }],
    }, company)

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="acceptance-act-${actNumber}.pdf"`,
      },
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'PDF-ის გენერაცია ვერ შესრულდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
