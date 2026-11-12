import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const admin = createSupabaseServiceClient()
    const { data: act, error } = await admin
      .from('invoice_acceptance_acts')
      .select('*, invoice:invoices(*, items:invoice_items(*))')
      .eq('public_token', token)
      .neq('status', 'cancelled')
      .single()
    if (error || !act?.invoice) return NextResponse.json({ error: 'აქტი ვერ მოიძებნა.' }, { status: 404 })

    if (!act.viewed_at) {
      const nextStatus = act.status === 'sent' ? 'viewed' : act.status
      await admin.from('invoice_acceptance_acts').update({ viewed_at: new Date().toISOString(), status: nextStatus }).eq('id', act.id)
      act.viewed_at = new Date().toISOString()
      act.status = nextStatus
    }

    const invoice = act.invoice
    return NextResponse.json({
      act: {
        id: act.id,
        act_number: act.act_number,
        act_date: act.act_date,
        status: act.status,
        public_token: act.public_token,
        sent_at: act.sent_at,
        viewed_at: act.viewed_at,
        accepted_at: act.accepted_at,
        accepted_by: act.accepted_by,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        delivery_date: invoice.delivery_date,
        customer_name: invoice.customer_name,
        customer_tax_id: invoice.customer_tax_id,
        customer_address: invoice.customer_address,
        customer_email: invoice.customer_email,
        customer_phone: invoice.customer_phone,
        notes: invoice.notes,
        items: invoice.items || [],
      },
      pdfUrl: `${new URL(request.url).origin}/api/public-invoice-acceptance-acts/${token}/pdf`,
    })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'აქტი ვერ ჩაიტვირთა.' }, { status: 500 })
  }
}
