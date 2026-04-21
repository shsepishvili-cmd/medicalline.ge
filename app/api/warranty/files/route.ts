import { NextRequest, NextResponse } from 'next/server'
import { createSignedStorageUrl, requireWarrantySession } from '@/app/lib/supabase-server'

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tokenClient } = await requireWarrantySession(accessToken)

    if (body.kind === 'pdf') {
      const warrantyId = String(body.warrantyId || '')
      if (!warrantyId) {
        return NextResponse.json({ error: 'Warranty ID is required.' }, { status: 400 })
      }

      const { data: warranty, error } = await tokenClient
        .from('warranties')
        .select('pdf_path, warranty_number')
        .eq('id', warrantyId)
        .single()

      if (error || !warranty?.pdf_path) {
        return NextResponse.json({ error: 'PDF certificate does not exist yet.' }, { status: 404 })
      }

      const url = await createSignedStorageUrl(tokenClient, 'warranty-documents', warranty.pdf_path)
      return NextResponse.json({ url, fileName: `${warranty.warranty_number}.pdf` })
    }

    if (body.kind === 'attachment') {
      const attachmentId = String(body.attachmentId || '')
      if (!attachmentId) {
        return NextResponse.json({ error: 'Attachment ID is required.' }, { status: 400 })
      }

      const { data: attachment, error } = await tokenClient
        .from('warranty_attachments')
        .select('file_name, file_path, file_bucket')
        .eq('id', attachmentId)
        .single()

      if (error || !attachment?.file_path || !attachment.file_bucket) {
        return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
      }

      const url = await createSignedStorageUrl(tokenClient, attachment.file_bucket, attachment.file_path)
      return NextResponse.json({ url, fileName: attachment.file_name })
    }

    return NextResponse.json({ error: 'Unsupported file request.' }, { status: 400 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not open file.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
