'use client'

import { useState } from 'react'
import { adminSupabase as supabase } from '@/app/lib/supabase-admin-browser'
import { formatClinicMoney, makeSchedule } from '@/app/lib/clinic-portal-types'
import styles from '@/app/expo2026/expo.module.css'

// Expo-only offer flow, kept apart from the general B2B offer builder.
// It writes the same offers/offer_items/payment_schedules rows, so the doctor's
// SMS link, offer page and payment work exactly as before.

export type ExpoRequestRow = {
  id: string; group_id: string | null; status: string; quantity: number; created_at: string; source: string
  user_id: string; product_id: string
  doctor_name_snapshot: string; clinic_name_snapshot: string; phone_snapshot: string
  products: { name: string; slug: string; images: string[] | null; prices: Array<{ price_gel: number }> | null } | null
}
export type ExpoOfferRow = { id: string; request_id: string | null; offer_number: string; status: string; total_amount: number; currency: string; created_at: string }

const PAYMENT: Array<{ value: string; label: string; advance: number; installments: number; text: string }> = [
  { value: 'full', label: 'სრული გადახდა', advance: 0, installments: 1, text: 'სრული გადახდა.' },
  { value: '30_70', label: '30% ავანსი + 70% მიწოდებამდე', advance: 30, installments: 1, text: '30% ავანსი + 70% მიწოდებამდე.' },
  { value: '30_2', label: '30% ავანსი + 2 თვე', advance: 30, installments: 2, text: '30% ავანსი + 2 თვიური გადახდა.' },
  { value: '30_3', label: '30% ავანსი + 3 თვე', advance: 30, installments: 3, text: '30% ავანსი + 3 თვიური გადახდა.' },
]
const DELIVERY = 'მიწოდების ვადა და მონტაჟის დეტალები შეთანხმდება შეკვეთის დადასტურების შემდეგ.'
const WARRANTY = 'გარანტიის ვადა და პირობები განისაზღვრება პროდუქტის საგარანტიო დოკუმენტაციით.'
export const OFFER_STATUS: Record<string, string> = { draft: 'მონახაზი', sent: 'გაგზავნილი', viewed: 'ნანახი', accepted: 'დადასტურებული', partially_paid: 'ნაწილობრივ გადახდილი', paid: 'გადახდილი', cancelled: 'გაუქმებული', expired: 'ვადაგასული' }

const round = (value: number) => Math.round(value * 100) / 100

export type Channel = 'sms' | 'whatsapp'
type Currency = 'GEL' | 'USD' | 'EUR'
const CURRENCIES: Array<[Currency, string]> = [['GEL', '₾ ლარი'], ['USD', '$ დოლარი'], ['EUR', '€ ევრო']]

// Open the WhatsApp tab during the click itself, before any await, so phone
// browsers do not block it as a pop-up.
export function prepareWhatsAppWindow(channel: Channel) {
  return channel === 'whatsapp' ? window.open('about:blank', '_blank') : null
}

// Returns '' on success or a message describing what went wrong.
export async function sendOfferLink(offerId: string, accessToken: string, channel: Channel = 'sms', whatsAppWindow: Window | null = null) {
  const response = await fetch(`/api/admin/offers/${offerId}/secure-link`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) { whatsAppWindow?.close(); return payload?.error || 'ბმული ვერ შეიქმნა.' }
  if (channel === 'whatsapp') {
    if (!payload?.whatsappUrl) { whatsAppWindow?.close(); return 'WhatsApp ბმული ვერ მომზადდა.' }
    if (whatsAppWindow) whatsAppWindow.location.href = payload.whatsappUrl
    else window.location.href = payload.whatsappUrl
    return ''
  }
  return payload?.delivered ? '' : payload?.warning || 'შეთავაზება შეიქმნა, მაგრამ SMS ვერ გაიგზავნა.'
}

export function ExpoOfferForm({ rows, accessToken, onClose, onDone }: { rows: ExpoRequestRow[]; accessToken: string; onClose: () => void; onDone: (message: string) => void }) {
  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries(rows.map((row) => [row.id, Number(row.products?.prices?.[0]?.price_gel || 0)])))
  const [currency, setCurrency] = useState<Currency>('GEL')
  const [payment, setPayment] = useState('30_70')
  const [days, setDays] = useState(14)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const plan = PAYMENT.find((item) => item.value === payment) || PAYMENT[0]
  const total = round(rows.reduce((sum, row) => sum + (prices[row.id] || 0) * row.quantity, 0))
  const advance = round(total * plan.advance / 100)
  const first = rows[0]

  async function submit(channel: Channel) {
    if (rows.some((row) => !(prices[row.id] > 0))) { setError('ყველა პროდუქტს მიუთითეთ ფასი.'); return }
    const whatsAppWindow = prepareWhatsAppWindow(channel)
    setBusy(true); setError('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const offerNumber = `EXPO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
      const createdBy = (await supabase.auth.getSession()).data.session?.user?.id || null
      const { data: offer, error: offerError } = await supabase.from('offers').insert({
        request_id: first.id, user_id: first.user_id, clinic_name_snapshot: first.clinic_name_snapshot,
        offer_number: offerNumber, status: 'draft', currency, subtotal_amount: total, discount_amount: 0,
        total_amount: total, advance_amount: advance, vat_included: true,
        valid_until: new Date(Date.now() + Math.max(1, days) * 86400000).toISOString().slice(0, 10),
        payment_terms: plan.text, delivery_terms: DELIVERY, warranty_terms: WARRANTY,
        notes: note.trim() || null, internal_note: 'Expo 2026', created_by: createdBy,
      }).select('id').single()
      if (offerError || !offer) { whatsAppWindow?.close(); setError(offerError?.message || 'შეთავაზება ვერ შეიქმნა.'); return }

      const items = rows.map((row) => ({
        offer_id: offer.id, product_id: row.product_id, product_name_snapshot: row.products?.name || 'პროდუქტი',
        sku_snapshot: row.products?.slug || null, product_image_snapshot: row.products?.images?.[0] || null,
        quantity: row.quantity, unit_price: prices[row.id], discount_percent: 0, total_price: round(prices[row.id] * row.quantity),
      }))
      const schedules = makeSchedule(total, advance, plan.installments, today).map((row) => ({ ...row, offer_id: offer.id }))
      const [itemResult, scheduleResult] = await Promise.all([
        supabase.from('offer_items').insert(items),
        supabase.from('payment_schedules').insert(schedules),
      ])
      if (itemResult.error || scheduleResult.error) {
        await supabase.from('offers').delete().eq('id', offer.id)
        whatsAppWindow?.close()
        setError(itemResult.error?.message || scheduleResult.error?.message || 'შეთავაზება ვერ შეინახა.'); return
      }

      // Marks the offer sent and texts the doctor the link (or opens WhatsApp).
      const problem = await sendOfferLink(offer.id, accessToken, channel, whatsAppWindow)
      onDone(problem ? `${offerNumber} შეიქმნა. ${problem}` : channel === 'whatsapp' ? `${offerNumber}: WhatsApp გაიხსნა — დააჭირეთ გაგზავნას.` : `${offerNumber} გაიგზავნა ექიმთან SMS-ით.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Expo შეთავაზება">
      <div className={styles.modalBox}>
        <h2>შეთავაზება</h2>
        <p className={styles.muted}>{first.doctor_name_snapshot || '—'} · {first.clinic_name_snapshot || 'კლინიკა არ არის მითითებული'} · {first.phone_snapshot}</p>

        <label className={styles.field}>ვალუტა
          <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
            {CURRENCIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {rows.map((row) => (
          <label key={row.id} className={styles.field}>{row.products?.name || 'პროდუქტი'} × {row.quantity} — ერთეულის ფასი ({currency})
            <input type="number" min={0} step="0.01" inputMode="decimal" value={prices[row.id] || ''} onChange={(event) => setPrices({ ...prices, [row.id]: Number(event.target.value) })} />
          </label>
        ))}

        <label className={styles.field}>გადახდა
          <select value={payment} onChange={(event) => setPayment(event.target.value)}>
            {PAYMENT.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className={styles.field}>მოქმედებს (დღე)
          <input type="number" min={1} max={90} value={days} onChange={(event) => setDays(Number(event.target.value))} />
        </label>
        <label className={styles.field}>შენიშვნა ექიმისთვის (არასავალდებულო)
          <textarea rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>

        <p className={styles.notice}>ჯამი: <b>{formatClinicMoney(total, currency)}</b>{advance > 0 ? <> · ავანსი {formatClinicMoney(advance, currency)}</> : null} · დღგ-ს ჩათვლით · ბმული მოქმედებს 14 დღე</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.row}>
          <button type="button" className={styles.btn} disabled={busy || total <= 0} onClick={() => void submit('sms')}>{busy ? 'იგზავნება...' : 'SMS-ით გაგზავნა'}</button>
          <button type="button" className={styles.btn} style={{ background: '#1f9d55' }} disabled={busy || total <= 0} onClick={() => void submit('whatsapp')}>WhatsApp-ით გაგზავნა</button>
        </div>
        <div className={styles.row}>
          <button type="button" className={`${styles.btn} ${styles.btnLight}`} disabled={busy} onClick={onClose}>გაუქმება</button>
        </div>
      </div>
    </div>
  )
}
