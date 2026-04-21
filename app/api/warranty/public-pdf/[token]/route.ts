import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateWarrantyPdfBuffer, getAppBaseUrl } from '@/app/lib/warranty-server'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params

  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('get_warranty_public_summary', {
    p_verify_token: token,
  })

  if (error) {
    console.error('[public-pdf] RPC error:', error.message)
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 })
  }

  const row = (data || [])[0]
  if (!row) {
    return NextResponse.json({ error: 'Warranty not found.' }, { status: 404 })
  }

  // Construct a minimal WarrantyRecord compatible with generateWarrantyPdfBuffer.
  // Fields not returned by the public summary get safe defaults.
  const record: WarrantyRecord = {
    id:                token,          // not used in PDF rendering
    created_at:        '',
    updated_at:        '',
    warranty_number:   row.warranty_number,
    product_id:        null,
    brand:             row.brand,
    product_category:  null,
    product_name:      row.product_name,
    model:             row.model ?? null,
    serial_number:     row.serial_number,
    clinic_name:       row.clinic_name ?? null,
    customer_name:     row.customer_name ?? null,
    phone:             null,
    email:             null,
    purchase_date:     row.purchase_date ?? null,
    installation_date: row.installation_date ?? null,
    warranty_start:    row.warranty_start,
    warranty_months:   0,
    warranty_end:      row.warranty_end,
    invoice_number:    null,
    sold_by:           null,
    status:            row.status,
    notes:             null,
    created_by:        null,
    pdf_path:          null,
    qr_url:            null,
    verify_token:      token,
    archived_at:       null,
  }

  const origin = getAppBaseUrl(
    request.headers.get('origin') || new URL(request.url).origin,
  )

  try {
    const pdfBuffer = await generateWarrantyPdfBuffer(record, origin)
    const fileName = `warranty-${record.warranty_number}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed.'
    console.error('[public-pdf] generation error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
