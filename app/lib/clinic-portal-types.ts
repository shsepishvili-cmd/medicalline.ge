export type SpecialRequestStatus = 'received' | 'reviewing' | 'offer_ready' | 'offer_received' | 'cancelled' | 'expired'
export type OfferStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'partially_paid' | 'paid' | 'expired' | 'cancelled'
export type ScheduleStatus = 'pending' | 'available' | 'paid' | 'overdue' | 'cancelled'
export type TransactionStatus = 'initiated' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'

export type ClinicProduct = {
  id: string
  slug: string
  name: string
  brand: string | null
  category_slug: string | null
  short_desc: string | null
  images: string[] | null
  prices?: Array<{ price_gel: number; installment_monthly?: number | null; installment_months?: number | null; note?: string | null }>
}

export type SpecialPriceRequest = {
  id: string
  user_id: string
  product_id: string
  quantity: number
  purchase_timeline: string
  preferred_payment_method: string
  note: string | null
  status: SpecialRequestStatus
  admin_note: string | null
  doctor_name_snapshot: string
  clinic_name_snapshot: string
  city_snapshot: string
  phone_snapshot: string
  email_snapshot: string
  created_at: string
  updated_at: string
  products?: ClinicProduct | null
  // Multi-product requests share a group (54_expo2026_integration.sql).
  group_id?: string | null
  source?: 'PORTAL' | 'CATALOG' | 'EXPO2026' | string
}

export type OfferItem = {
  id: string
  offer_id: string
  product_id: string | null
  product_name_snapshot: string
  sku_snapshot: string | null
  product_image_snapshot: string | null
  quantity: number
  unit_price: number
  discount_percent: number
  total_price: number
  products?: { short_desc: string | null; specs: Record<string, unknown> | null; brand: string | null } | null
}

export type PaymentSchedule = {
  id: string
  offer_id: string
  installment_number: number
  title: string
  due_date: string
  amount: number
  status: ScheduleStatus
  paid_at: string | null
  payment_reference: string | null
}

export type ClinicOffer = {
  id: string
  request_id: string | null
  user_id: string
  clinic_name_snapshot: string
  offer_number: string
  status: OfferStatus
  currency: string
  subtotal_amount: number
  discount_amount: number
  total_amount: number
  advance_amount: number
  vat_included: boolean
  valid_until: string | null
  payment_terms: string | null
  delivery_terms: string | null
  warranty_terms: string | null
  notes: string | null
  internal_note?: string | null
  accepted_at: string | null
  offer_terms_accepted_at?: string | null
  delivery_policy_accepted_at?: string | null
  privacy_terms_accepted_at?: string | null
  created_at: string
  updated_at: string
  offer_items?: OfferItem[]
  payment_schedules?: PaymentSchedule[]
  payment_transactions?: Array<{ id: string; status: TransactionStatus; provider: string; provider_order_id: string | null; provider_transaction_id: string | null }>
}

export const requestStatusLabels: Record<SpecialRequestStatus, string> = {
  received: 'მიღებულია',
  reviewing: 'განხილვაშია',
  offer_ready: 'შეთავაზება მზადაა',
  offer_received: 'შეთავაზება მიღებულია',
  cancelled: 'გაუქმებულია',
  expired: 'ვადა გაუვიდა',
}

export const offerStatusLabels: Record<OfferStatus, string> = {
  draft: 'მონახაზი', sent: 'გამოგზავნილია', viewed: 'ნანახია', accepted: 'დადასტურებულია',
  partially_paid: 'ნაწილობრივ გადახდილია', paid: 'გადახდილია', expired: 'ვადა გასულია', cancelled: 'გაუქმებულია',
}

export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  pending: 'დაგეგმილი', available: 'გადასახდელი', paid: 'გადახდილია', overdue: 'ვადა გასულია', cancelled: 'გაუქმებულია',
}

export function formatClinicMoney(value: number, currency = 'GEL') {
  return new Intl.NumberFormat('ka-GE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0))
}

export function isOfferExpired(offer: Pick<ClinicOffer, 'valid_until' | 'status'>) {
  if (offer.status === 'expired') return true
  if (!offer.valid_until) return false
  return new Date(`${offer.valid_until}T23:59:59`).getTime() < Date.now()
}

export function makeSchedule(total: number, advance: number, installments: number, firstDue: string) {
  const roundedTotal = Math.round(total * 100)
  const roundedAdvance = Math.min(roundedTotal, Math.max(0, Math.round(advance * 100)))
  const rows: Array<{ installment_number: number; title: string; due_date: string; amount: number; status: ScheduleStatus }> = []
  const firstDate = new Date(`${firstDue}T12:00:00`)
  const count = Math.max(1, installments)
  const remainder = roundedTotal - roundedAdvance
  if (roundedAdvance > 0) rows.push({ installment_number: 1, title: 'ავანსი', due_date: firstDue, amount: roundedAdvance / 100, status: 'pending' })
  const remainderCount = roundedAdvance > 0 ? count : Math.max(1, count)
  const base = Math.floor(remainder / remainderCount)
  let allocated = 0
  for (let index = 0; index < remainderCount; index += 1) {
    const cents = index === remainderCount - 1 ? remainder - allocated : base
    allocated += cents
    const due = new Date(firstDate)
    due.setMonth(due.getMonth() + (roundedAdvance > 0 ? index + 1 : index))
    rows.push({
      installment_number: rows.length + 1,
      title: rows.length === 0 ? 'სრული გადახდა' : `${rows.length + 1} ეტაპი`,
      due_date: due.toISOString().slice(0, 10), amount: cents / 100, status: 'pending',
    })
  }
  return rows.filter((row) => row.amount > 0)
}
