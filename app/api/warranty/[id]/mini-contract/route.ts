import { NextRequest, NextResponse } from 'next/server'
import { generateMiniWarrantyContractBuffer } from '@/app/lib/warranty-server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const { tokenClient } = await requireWarrantySession(accessToken)

    const { data: warranty, error } = await tokenClient
      .from('warranties')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !warranty) {
      return NextResponse.json({ error: 'Warranty not found.' }, { status: 404 })
    }

    const pdfBuffer = await generateMiniWarrantyContractBuffer(warranty as WarrantyRecord)
    const fileName  = `mini-contract-${(warranty as WarrantyRecord).warranty_number}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Generation failed.'
    const status  = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
