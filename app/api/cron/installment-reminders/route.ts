import { NextResponse } from 'next/server'
import { areInstallmentRemindersEnabled, runInstallmentReminders } from '@/app/lib/installments-server'
import { isSmsProviderConfigured } from '@/app/lib/sms-provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Vercel Cron calls this daily and sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const send = areInstallmentRemindersEnabled() && isSmsProviderConfigured()

  try {
    const result = await runInstallmentReminders({ send, origin: new URL(request.url).origin })
    return NextResponse.json({ ok: true, sendingEnabled: send, today: result.today, due: result.planned.length, sent: result.sent, failed: result.failed })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Reminder run failed.'
    console.error('[installment-reminders]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
