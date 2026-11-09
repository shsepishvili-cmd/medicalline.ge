import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveWarrantyStatus } from '@/app/lib/warranty'

function cleanInput(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const warrantyNumber = cleanInput(body?.warrantyNumber, 80)
  const serialNumber = cleanInput(body?.serialNumber, 160)

  if (!warrantyNumber || !serialNumber) {
    return NextResponse.json({ error: 'Certificate number and serial number are required.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('lookup_warranty_public', {
    p_warranty_number: warrantyNumber,
    p_serial_number: serialNumber,
  })

  if (error) {
    console.error('[warranty/lookup] RPC error:', error.message, error.code)
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 })
  }

  const row = (data || [])[0]
  if (!row) {
    return NextResponse.json({ error: 'Warranty not found.' }, { status: 404 })
  }

  return NextResponse.json(
    {
      warranty: {
        warrantyNumber: row.warranty_number,
        category: row.product_category,
        brand: row.brand,
        productName: row.product_name,
        model: row.model,
        serialNumber: row.serial_number,
        warrantyStart: row.warranty_start,
        warrantyMonths: row.warranty_months,
        warrantyEnd: row.warranty_end,
        // Stored status only refreshes on write, so work out today's status here.
        status: deriveWarrantyStatus(row.status, row.warranty_start, row.warranty_end),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
