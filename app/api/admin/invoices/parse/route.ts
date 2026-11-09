import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { parseInvoicePrompt } from '@/app/lib/ai-invoice-server'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const { profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    const body = await request.json().catch(() => null)
    const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
    const result = await parseInvoicePrompt(prompt, tokenClient)
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'ტექსტის დამუშავება ვერ მოხერხდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
