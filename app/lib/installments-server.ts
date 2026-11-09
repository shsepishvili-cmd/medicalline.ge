import 'server-only'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyPaymentWebhook } from './clinic-payment-provider'
import { createSupabaseServiceClient } from './supabase-service'
import { merchant } from './merchant'
import { isSmsProviderConfigured, sendContractSms } from './sms-provider'
import { installmentSmsText, reminderKindFor, remainingAmount, todayInTbilisi, type ReminderKind } from './installments'

export function installmentPublicUrl(token: string, requestOrigin: string) {
  const base = process.env.VERCEL_ENV === 'production' ? merchant.website : requestOrigin
  return `${base.replace(/\/$/, '')}/installment/${token}`
}

// Automatic SMS stays off until this is deliberately switched on in Vercel.
export function areInstallmentRemindersEnabled() {
  return process.env.INSTALLMENT_REMINDERS_ENABLED?.trim().toLowerCase() === 'true'
}

type CallbackPayload = {
  transaction_id?: string
  merchant_order_id?: string
  order_id?: string
  provider_transaction_id?: string
  payment_id?: string
  status?: string
  body?: {
    order_id?: string
    external_order_id?: string
    order_status?: { key?: string }
    payment_detail?: { transaction_id?: string }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// BOG sends every callback to one URL, shared with clinic payments. Returns null
// for anything that is not an installment payment, including on any failure here,
// so the clinic handler always gets those requests exactly as before.
export async function handleInstallmentCallback(rawBody: string, signature: string) {
  if (!verifyPaymentWebhook(rawBody, signature)) return null

  let payload: CallbackPayload
  try {
    payload = JSON.parse(rawBody) as CallbackPayload
  } catch {
    return null
  }

  const localId = payload.body?.external_order_id || payload.transaction_id || payload.merchant_order_id
  const providerOrderId = payload.body?.order_id || payload.order_id
  if (!localId && !providerOrderId) return null

  let service: SupabaseClient
  try {
    service = createSupabaseServiceClient()
  } catch {
    return null
  }

  const query = service.from('installment_payments').select('id, status')
  const { data: payment, error } = await (localId && UUID.test(localId)
    ? query.eq('id', localId)
    : query.eq('provider_order_id', providerOrderId || '')
  ).maybeSingle()
  if (error || !payment) return null

  const status = String(payload.body?.order_status?.key || payload.status || '').toLowerCase()
  const providerTransactionId = payload.body?.payment_detail?.transaction_id || payload.provider_transaction_id || payload.payment_id || providerOrderId || payment.id

  if (status === 'completed' || ['succeeded', 'success', 'paid'].includes(status)) {
    const { error: rpcError } = await service.rpc('complete_installment_online_payment', {
      p_payment_id: payment.id,
      p_provider_transaction_id: providerTransactionId,
      p_raw_response: payload,
    })
    // A non-2xx makes BOG retry, so a temporary failure does not lose the payment.
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 409 })
  } else if (['rejected', 'failed', 'cancelled', 'canceled'].includes(status) && payment.status === 'pending') {
    await service
      .from('installment_payments')
      .update({ status: status.startsWith('cancel') ? 'cancelled' : 'failed', raw_response: payload, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('status', 'pending')
  }

  return NextResponse.json({ received: true })
}

export type PlannedReminder = {
  contractId: string
  contractNumber: string
  customerName: string
  phone: string
  scheduleId: string
  kind: ReminderKind
  dueDate: string
  amount: number
  message: string
}

type DueRow = {
  id: string
  contract_id: string
  due_date: string
  amount: number
  paid_amount: number
  installment_contracts: {
    id: string
    contract_number: string
    customer_name: string
    phone: string
    public_token: string
    status: string
    reminders_enabled: boolean
  } | null
}

const MAX_ATTEMPTS = 3

// Lists what is due today and, only when `send` is true, sends it. Each contract
// gets at most one SMS per run, about its oldest unpaid installment.
export async function runInstallmentReminders({ send, origin, now }: { send: boolean; origin: string; now?: Date }) {
  const service = createSupabaseServiceClient()
  const today = todayInTbilisi(now)
  const horizon = new Date(`${today}T00:00:00Z`)
  horizon.setUTCDate(horizon.getUTCDate() + 3)

  const { data, error } = await service
    .from('installment_schedule')
    .select('id, contract_id, due_date, amount, paid_amount, installment_contracts!inner(id, contract_number, customer_name, phone, public_token, status, reminders_enabled)')
    .eq('status', 'pending')
    .lte('due_date', horizon.toISOString().slice(0, 10))
    .eq('installment_contracts.status', 'active')
    .eq('installment_contracts.reminders_enabled', true)
    .order('due_date', { ascending: true })
  if (error) throw new Error(error.message)

  const rows = (data || []) as unknown as DueRow[]
  const oldestPerContract = new Map<string, DueRow>()
  for (const row of rows) {
    if (!oldestPerContract.has(row.contract_id)) oldestPerContract.set(row.contract_id, row)
  }

  const candidates = [...oldestPerContract.values()].flatMap((row) => {
    const kind = reminderKindFor(row.due_date, today)
    return kind && row.installment_contracts ? [{ row, contract: row.installment_contracts, kind }] : []
  })

  const { data: logs, error: logError } = candidates.length
    ? await service.from('installment_sms_log').select('id, schedule_id, kind, status, attempts').in('schedule_id', candidates.map((item) => item.row.id))
    : { data: [], error: null }
  if (logError) throw new Error(logError.message)

  const logFor = (scheduleId: string, kind: ReminderKind) => (logs || []).find((log) => log.schedule_id === scheduleId && log.kind === kind)

  const planned: PlannedReminder[] = candidates.flatMap(({ row, contract, kind }) => {
    const log = logFor(row.id, kind)
    if (log && (log.status !== 'failed' || log.attempts >= MAX_ATTEMPTS)) return []
    const amount = remainingAmount(row)
    return [{
      contractId: contract.id,
      contractNumber: contract.contract_number,
      customerName: contract.customer_name,
      phone: contract.phone,
      scheduleId: row.id,
      kind,
      dueDate: row.due_date,
      amount,
      message: installmentSmsText(contract.contract_number, amount, row.due_date, kind, installmentPublicUrl(contract.public_token, origin)),
    }]
  })

  if (!send) return { today, planned, sent: 0, failed: 0 }

  let sent = 0
  let failed = 0
  for (const item of planned) {
    // Claim first: the unique index stops two overlapping runs sending the same SMS.
    const existing = logFor(item.scheduleId, item.kind)
    const claim = existing
      ? await service.from('installment_sms_log').update({ status: 'sending', attempts: existing.attempts + 1, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('status', 'failed').select('id').maybeSingle()
      : await service.from('installment_sms_log').insert({ contract_id: item.contractId, schedule_id: item.scheduleId, kind: item.kind, status: 'sending', message: item.message }).select('id').maybeSingle()
    if (claim.error || !claim.data) continue

    try {
      await sendContractSms(item.phone, item.message)
      await service.from('installment_sms_log').update({ status: 'sent', error: null, updated_at: new Date().toISOString() }).eq('id', claim.data.id)
      sent += 1
    } catch (cause) {
      await service.from('installment_sms_log').update({ status: 'failed', error: cause instanceof Error ? cause.message : 'SMS failed', updated_at: new Date().toISOString() }).eq('id', claim.data.id)
      failed += 1
    }
  }

  return { today, planned, sent, failed }
}

export function installmentSmsAvailability() {
  return { smsConfigured: isSmsProviderConfigured(), remindersEnabled: areInstallmentRemindersEnabled() }
}
