import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { installmentSmsAvailability, runInstallmentReminders } from '@/app/lib/installments-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Read-only preview for the admin page: never sends anything.
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { profile } = await requireWarrantySession(token)
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await runInstallmentReminders({ send: false, origin: new URL(request.url).origin })
    return NextResponse.json({ ...installmentSmsAvailability(), today: result.today, planned: result.planned })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not load reminders.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
