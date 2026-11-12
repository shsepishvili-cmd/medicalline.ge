import { NextResponse } from 'next/server'
import { createClinicServiceClient, requireClinicUser } from '@/app/lib/clinic-portal-server'

export async function POST(request: Request) {
  try {
    const { user } = await requireClinicUser(request)
    const { transactionId } = await request.json().catch(() => ({})) as { transactionId?: string }
    if (!transactionId) return NextResponse.json({ error: 'ტრანზაქცია არ არის მითითებული.' }, { status: 400 })

    const service = createClinicServiceClient()
    const { data: transaction, error } = await service
      .from('payment_transactions')
      .select('id, user_id, status')
      .eq('id', transactionId)
      .single()
    if (error || !transaction) return NextResponse.json({ error: 'ტრანზაქცია ვერ მოიძებნა.' }, { status: 404 })
    if (transaction.user_id !== user.id) return NextResponse.json({ error: 'წვდომა აკრძალულია.' }, { status: 403 })
    if (transaction.status === 'succeeded') return NextResponse.json({ ok: true, status: 'succeeded' })

    if (transaction.status === 'initiated' || transaction.status === 'pending') {
      const { error: updateError } = await service
        .from('payment_transactions')
        .update({ status: 'cancelled', raw_response: { reason: 'customer_returned_from_cancel_url' } })
        .eq('id', transaction.id)
        .in('status', ['initiated', 'pending'])
      if (updateError) throw updateError
    }

    return NextResponse.json({ ok: true, status: 'cancelled' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'გადახდის მცდელობა ვერ გაუქმდა.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
