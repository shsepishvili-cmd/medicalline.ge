import { NextRequest, NextResponse } from 'next/server'
import { generateContractPdfBuffer, buildContractPdfStoragePath } from '@/app/lib/contract-server'
import { createSignedStorageUrl, requireWarrantySession } from '@/app/lib/supabase-server'
import type { ContractRecord } from '@/app/lib/contract-types'

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

    const { data: contract, error: contractErr } = await tokenClient
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
    }

    const pdfBuffer = await generateContractPdfBuffer(contract as ContractRecord)
    const pdfPath   = buildContractPdfStoragePath(contract as ContractRecord)

    const { error: uploadErr } = await tokenClient.storage
      .from('warranty-documents')
      .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    await tokenClient
      .from('contracts')
      .update({ pdf_path: pdfPath, generated_at: new Date().toISOString() })
      .eq('id', id)

    const url = await createSignedStorageUrl(tokenClient, 'warranty-documents', pdfPath)

    return NextResponse.json({ ok: true, path: pdfPath, url })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'PDF generation failed.'
    const status  = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
