import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { installmentPublicUrl } from '@/app/lib/installments-server'
import { installmentSmsText, remainingAmount, type InstallmentScheduleRow } from '@/app/lib/installments'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'

export const runtime = 'nodejs'

// Admin presses a button: sends the client's next payment and their page link.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { profile, tokenClient } = await requireWarrantySession(token)
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const { data: contract, error } = await tokenClient
      .from('installment_contracts')
      .select('id, contract_number, phone, public_token, status, installment_schedule(id, installment_number, due_date, amount, paid_amount, status)')
      .eq('id', id)
      .single()
    if (error || !contract) return NextResponse.json({ error: 'ხელშეკრულება ვერ მოიძებნა.' }, { status: 404 })
    if (contract.status !== 'active') return NextResponse.json({ error: 'ხელშეკრულება აქტიური არ არის.' }, { status: 409 })

    const next = ((contract.installment_schedule || []) as InstallmentScheduleRow[])
      .filter((row) => row.status === 'pending')
      .sort((a, b) => a.installment_number - b.installment_number)[0]
    if (!next) return NextResponse.json({ error: 'გადასახდელი შენატანი აღარ დარჩა.' }, { status: 409 })

    const link = installmentPublicUrl(contract.public_token, request.headers.get('origin') || new URL(request.url).origin)
    const smsText = installmentSmsText(contract.contract_number, remainingAmount(next), next.due_date, 'manual', link)

    if (!isSmsProviderConfigured()) {
      return NextResponse.json({ ok: true, smsSent: false, smsText })
    }

    const service = createSupabaseServiceClient()
    try {
      const delivery = await sendContractSms(contract.phone, smsText)
      await service.from('installment_sms_log').insert({ contract_id: contract.id, schedule_id: next.id, kind: 'manual', status: 'sent', message: smsText })
      return NextResponse.json({ ok: true, smsSent: true, smsText, smsMessageId: delivery.messageId ?? null })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'SMS ვერ გაიგზავნა.'
      await service.from('installment_sms_log').insert({ contract_id: contract.id, schedule_id: next.id, kind: 'manual', status: 'failed', message: smsText, error: message })
      return NextResponse.json({ ok: false, error: message, smsText }, { status: 502 })
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'SMS ვერ გაიგზავნა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
