import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'

async function admin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Unauthorized')
  const session = await requireWarrantySession(token)
  if (session.profile.role !== 'admin') throw new Error('Forbidden')
  return session
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, tokenClient } = await admin(request)
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const allowed = ['cancelled', 'archived', 'sent', 'paid']
    if (!allowed.includes(body?.status)) return NextResponse.json({ ok: false, error: 'Invalid status.' }, { status: 400 })
    const { data, error } = await tokenClient.from('invoices').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) throw error
    await tokenClient.from('invoice_audit_logs').insert({ invoice_id: id, user_id: user.id, action: `status_${body.status}`, metadata: {} })
    return NextResponse.json({ ok: true, invoice: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'სტატუსი ვერ შეიცვალა.'
    return NextResponse.json({ ok: false, error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 })
  }
}
