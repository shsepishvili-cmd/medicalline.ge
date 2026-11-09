import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { requireAdmin } from '@/app/lib/admin-guard'
import { processOutbox } from '@/app/lib/messaging-server'
import { writeAudit } from '@/app/lib/audit-server'
import { clientIp, forbiddenOrigin, isAllowedOrigin, serverError } from '@/app/lib/request-guard'

export const runtime = 'nodejs'

// Puts a failed message back at the front of the queue and runs the queue once.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin()
  const guard = await requireAdmin(request)
  if ('error' in guard) return guard.error
  const { id } = await context.params
  try {
    const service = createSupabaseServiceClient()
    const { data: row } = await service.from('message_outbox').select('id, status, purpose, created_at').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'შეტყობინება ვერ მოიძებნა.' }, { status: 404 })
    if (row.purpose === 'offer_link' || row.purpose === 'sms_login') {
      return NextResponse.json({ error: 'ბმულები და კოდები ხელახლა არ იგზავნება — გაგზავნეთ ახალი შეთავაზების ბმული.' }, { status: 409 })
    }
    if (!['failed', 'queued'].includes(row.status)) return NextResponse.json({ error: 'ამ შეტყობინების განმეორება არ საჭიროებს.' }, { status: 409 })
    await service.from('message_outbox').update({ status: 'queued', next_attempt_at: new Date().toISOString(), attempts: 0 }).eq('id', id)
    const result = await processOutbox(service, 5)
    await writeAudit(service, { actorId: guard.session.profile.id, action: 'outbox.retried', targetType: 'message', targetId: id, ip: clientIp(request) })
    return NextResponse.json({ ok: true, ...result })
  } catch (cause) {
    return serverError('outbox-retry', cause)
  }
}
