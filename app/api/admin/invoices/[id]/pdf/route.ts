import { NextRequest, NextResponse } from 'next/server'
import { createSignedStorageUrl, requireWarrantySession } from '@/app/lib/supabase-server'
import { generateCleanInvoicePdf, generateScannedInvoicePdf } from '@/app/lib/ai-invoice-pdf'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) throw new Error('Unauthorized')
    const { profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') throw new Error('Forbidden')
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const kind = body?.kind === 'scanned' ? 'scanned' : 'clean'
    const [{ data: invoice, error }, { data: settings }] = await Promise.all([
      tokenClient.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single(),
      tokenClient.from('invoice_company_settings').select('*').eq('id', 1).single(),
    ])
    if (error || !invoice) return NextResponse.json({ ok: false, error: 'Invoice not found.' }, { status: 404 })
    if (!settings) throw new Error('კომპანიის პარამეტრები ვერ მოიძებნა.')
    const buffer = kind === 'scanned'
      ? await generateScannedInvoicePdf(invoice, settings)
      : generateCleanInvoicePdf(invoice, settings)
    const path = `${invoice.invoice_date.slice(0, 4)}/${invoice.id}/${invoice.invoice_number}-${kind}.pdf`
    const { error: uploadError } = await tokenClient.storage.from('invoice-documents').upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) throw uploadError
    const column = kind === 'scanned' ? 'scanned_pdf_path' : 'clean_pdf_path'
    await tokenClient.from('invoices').update({ [column]: path, updated_at: new Date().toISOString() }).eq('id', id)
    const url = await createSignedStorageUrl(tokenClient, 'invoice-documents', path, 60 * 10)
    return NextResponse.json({ ok: true, kind, path, url })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'PDF ვერ შეიქმნა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}
