import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { processOutbox } from '@/app/lib/messaging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Daily: retries queued messages and removes sign-in data nobody needs any more.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const service = createSupabaseServiceClient()
    const outbox = await processOutbox(service, 50)
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
    // Codes live 5 minutes; keep a day for abuse review, then delete.
    await service.from('otp_challenges').delete().lt('created_at', dayAgo)
    // Undelivered message text (may contain a code or link) is not kept.
    await service.from('message_outbox').update({ body: null }).in('status', ['failed', 'cancelled']).lt('updated_at', dayAgo)
    return NextResponse.json({ ok: true, outbox })
  } catch (cause) {
    console.error('[expo-maintenance]', cause instanceof Error ? cause.message : cause)
    return NextResponse.json({ error: 'Maintenance failed' }, { status: 500 })
  }
}
