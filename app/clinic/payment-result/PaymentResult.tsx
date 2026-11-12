'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { formatClinicMoney, type TransactionStatus } from '@/app/lib/clinic-portal-types'

type Transaction = { id: string; amount: number; currency: string; status: TransactionStatus; provider: string; updated_at: string; offers?: { offer_number: string } | null }

const labels: Record<TransactionStatus, string> = { initiated: 'ინიციირებულია', pending: 'დადასტურებას ელოდება', succeeded: 'წარმატებით გადახდილია', failed: 'გადახდა ვერ შესრულდა', cancelled: 'გაუქმებულია', refunded: 'დაბრუნებულია' }

export function PaymentResult({ transactionId, cancelled }: { transactionId: string; cancelled: boolean }) {
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!transactionId) { setLoading(false); return }
    let disposed = false
    let attempts = 0
    const poll = async () => {
      const { data } = await supabase.from('payment_transactions').select('id, amount, currency, status, provider, updated_at, offers(offer_number)').eq('id', transactionId).single()
      if (disposed) return
      setTransaction(data as Transaction | null); setLoading(false); attempts += 1
      if (data && ['initiated', 'pending'].includes(data.status) && attempts < 8) window.setTimeout(poll, 2500)
    }
    const closeCancelledAttempt = async () => {
      if (cancelled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch('/api/clinic/payments/cancel', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ transactionId }),
          })
        }
      }
      await poll()
    }
    void closeCancelledAttempt()
    return () => { disposed = true }
  }, [transactionId, cancelled])
  if (loading) return <div className="clinic-card">სტატუსი მოწმდება...</div>
  if (!transaction) return <div className="clinic-card clinic-empty"><strong>ტრანზაქცია ვერ მოიძებნა</strong><Link className="clinic-btn" href="/clinic/payments">გადახდებზე დაბრუნება</Link></div>
  return <div className="clinic-card clinic-empty"><span className={`clinic-badge ${transaction.status === 'failed' || transaction.status === 'cancelled' || cancelled ? 'clinic-badge-danger' : ''}`}>{cancelled && transaction.status !== 'succeeded' ? 'გაუქმებულია' : labels[transaction.status]}</span><strong style={{ marginTop: 14 }}>{formatClinicMoney(transaction.amount, transaction.currency)}</strong><p className="clinic-muted">{transaction.status === 'succeeded' ? 'ბანკმა გადახდა დაადასტურა და გრაფიკი განახლდა.' : transaction.status === 'cancelled' || cancelled ? 'გადახდა არ ჩამოგეჭრათ. შეგიძლიათ თავიდან სცადოთ.' : 'გადახდის სტატუსი მოწმდება.'}</p><div className="clinic-actions"><Link className="clinic-btn" href="/clinic/payments">თავიდან გადახდა</Link><Link className="clinic-btn clinic-btn-ghost" href="/clinic/offers">შეთავაზებები</Link></div></div>
}
