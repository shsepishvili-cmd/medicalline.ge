import { NextRequest, NextResponse } from 'next/server'
import { buildWarrantyPdfStoragePath, generateWarrantyPdfBuffer, getAppBaseUrl } from '@/app/lib/warranty-server'
import { createSignedStorageUrl, requireWarrantySession } from '@/app/lib/supabase-server'
import { buildWarrantyVerifyUrl } from '@/app/lib/warranty'
import type { WarrantyRecord } from '@/app/lib/warranty-types'

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const { tokenClient } = await requireWarrantySession(accessToken)

    const { data: warranty, error: warrantyError } = await tokenClient
      .from('warranties')
      .select('*')
      .eq('id', id)
      .single()

    if (warrantyError || !warranty) {
      return NextResponse.json({ error: 'Warranty record not found.' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin
    const pdfBuffer = await generateWarrantyPdfBuffer(warranty as WarrantyRecord, origin)
    const pdfPath = buildWarrantyPdfStoragePath(warranty as WarrantyRecord)
    const qrUrl = buildWarrantyVerifyUrl(getAppBaseUrl(origin), warranty.verify_token)

    const { error: uploadError } = await tokenClient.storage
      .from('warranty-documents')
      .upload(pdfPath, pdfBuffer, {
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { error: updateError } = await tokenClient
      .from('warranties')
      .update({
        pdf_path: pdfPath,
        qr_url: qrUrl,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const signedUrl = await createSignedStorageUrl(tokenClient, 'warranty-documents', pdfPath)

    return NextResponse.json({
      ok: true,
      path: pdfPath,
      qrUrl,
      url: signedUrl,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Certificate generation failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
