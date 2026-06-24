import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const { tokenClient, user } = await requireWarrantySession(accessToken)
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required.' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF is allowed.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const path = `contracts/${id}/uploaded-${Date.now()}.pdf`

    const { error: uploadErr } = await tokenClient.storage
      .from('warranty-documents')
      .upload(path, bytes, { upsert: true, contentType: 'application/pdf' })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const nowIso = new Date().toISOString()
    const { error: updateErr } = await tokenClient
      .from('contracts')
      .update({ pdf_path: path, generated_at: nowIso })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    await tokenClient.from('contract_audit_logs').insert({
      contract_id: id,
      event_type: 'pdf_uploaded',
      event_status: null,
      channel: 'admin',
      document_version: null,
      actor_user_id: user.id,
      metadata: { path, name: file.name, size: file.size },
    })

    return NextResponse.json({ ok: true, path, uploadedAt: nowIso })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Upload failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
