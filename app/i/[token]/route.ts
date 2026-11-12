import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSignedStorageUrl } from '@/app/lib/supabase-server'
import { verifyInvoiceShareToken } from '@/app/lib/invoice-share-token'
import { generateCleanInvoicePdf } from '@/app/lib/ai-invoice-pdf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || ''

function serviceClient() {
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service env is not configured.')
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const payload = verifyInvoiceShareToken(token)
    if (!payload) {
      return new NextResponse('Invoice link is invalid or expired.', { status: 404 })
    }

    const admin = serviceClient()
    const [{ data: invoice, error }, { data: settings }] = await Promise.all([
      admin.from('invoices').select('*, items:invoice_items(*)').eq('id', payload.invoiceId).single(),
      admin.from('invoice_company_settings').select('*').eq('id', 1).single(),
    ])

    if (error || !invoice) return new NextResponse('Invoice not found.', { status: 404 })
    if (!settings) return new NextResponse('Invoice settings not found.', { status: 500 })

    let pdfPath = invoice.clean_pdf_path as string | null
    if (!pdfPath) {
      const buffer = generateCleanInvoicePdf({ ...invoice, stamp_applied: true }, settings)
      pdfPath = `${String(invoice.invoice_date).slice(0, 4)}/${invoice.id}/${invoice.invoice_number}-clean.pdf`
      const { error: uploadError } = await admin.storage.from('invoice-documents').upload(pdfPath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
      if (uploadError) throw uploadError
      await admin.from('invoices').update({ clean_pdf_path: pdfPath, stamp_applied: true, updated_at: new Date().toISOString() }).eq('id', invoice.id)
    }

    if (invoice.status === 'issued') {
      await admin.from('invoices').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', invoice.id)
    }

    const url = await createSignedStorageUrl(admin, 'invoice-documents', pdfPath, 60 * 60)
    return NextResponse.redirect(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invoice could not be opened.'
    return new NextResponse(message, { status: 500 })
  }
}
