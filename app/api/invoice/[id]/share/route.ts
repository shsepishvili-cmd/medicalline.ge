import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildInvoiceShareText, type InvoiceClient, type InvoiceRecord } from '@/app/lib/invoice'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  ''

function invoiceClient() {
  const key = supabaseServiceKey || supabaseAnonKey
  if (!supabaseUrl || !key) return null
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function requireInvoiceSession(request: NextRequest) {
  const secret = process.env.INVOICE_SECRET
  if (!secret) return true
  return request.cookies.get('invoice_auth')?.value === secret
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!requireInvoiceSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const channel = String(body?.channel || 'sms')
  if (channel !== 'sms') {
    return NextResponse.json({ error: 'Unsupported invoice share channel.' }, { status: 400 })
  }

  const db = invoiceClient()
  if (!db) {
    return NextResponse.json({ error: 'Supabase env is not configured.' }, { status: 500 })
  }

  const { id } = await context.params
  const { data: invoiceRow, error: invoiceError } = await db
    .from('inv_invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (invoiceError || !invoiceRow) {
    return NextResponse.json({ error: invoiceError?.message || 'Invoice not found.' }, { status: 404 })
  }

  const invoice = invoiceRow as InvoiceRecord
  let client: InvoiceClient | null = null
  if (invoice.client_id) {
    const { data } = await db
      .from('inv_clients')
      .select('*')
      .eq('id', invoice.client_id)
      .maybeSingle()
    client = (data as InvoiceClient | null) || null
  }

  const { data: settingsRow } = await db
    .from('inv_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle()
  const settings = (settingsRow?.data || {}) as Record<string, string>
  const company = {
    name: settings.company || 'Medical Line Georgia',
    phone: settings.phone || '+995 514 01 11 16',
    bank: invoice.bank || settings.bank || '',
  }
  const smsText = buildInvoiceShareText(invoice, client, company)

  if (!client?.phone) {
    return NextResponse.json({ ok: false, code: 'missing_phone', error: 'კლიენტის ტელეფონი არ არის მითითებული.', smsText }, { status: 400 })
  }

  if (!isSmsProviderConfigured()) {
    return NextResponse.json({
      ok: true,
      smsSent: false,
      smsText,
      error: 'GOSMS provider is not configured.',
    })
  }

  const delivery = await sendContractSms(client.phone, smsText)
  if (invoice.status === 'draft') {
    await db.from('inv_invoices').update({ status: 'sent' }).eq('id', invoice.id)
  }

  return NextResponse.json({
    ok: true,
    smsSent: true,
    smsText,
    smsProvider: delivery.provider,
    smsMessageId: delivery.messageId ?? null,
    balance: delivery.balance ?? null,
  })
}
