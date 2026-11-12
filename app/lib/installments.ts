export type InstallmentContractStatus = 'active' | 'completed' | 'cancelled'
export type InstallmentRowStatus = 'pending' | 'paid' | 'cancelled'
export type ManualPaymentMethod = 'cash' | 'bank_transfer' | 'card_terminal' | 'other'
export type ReminderKind = 'before_3' | 'due_day' | 'overdue_3' | 'overdue_7'

export type InstallmentScheduleRow = {
  id: string
  contract_id?: string
  installment_number: number
  due_date: string
  amount: number
  paid_amount: number
  status: InstallmentRowStatus
  paid_at?: string | null
}

export type InstallmentPayment = {
  id: string
  created_at: string
  schedule_id: string
  amount: number
  method: ManualPaymentMethod | 'bog_online'
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'reversed'
  paid_on: string | null
  note: string | null
  reversal_reason: string | null
}

export type InstallmentContract = {
  id: string
  created_at: string
  contract_number: string
  customer_name: string
  customer_tax_id: string | null
  phone: string
  product_name: string
  serial_number: string | null
  total_price: number
  down_payment: number
  months: number
  first_due_date: string
  status: InstallmentContractStatus
  cancel_reason: string | null
  reminders_enabled: boolean
  public_token: string
  notes: string | null
  installment_schedule: InstallmentScheduleRow[]
  installment_payments: InstallmentPayment[]
}

export const PAYMENT_METHOD_LABELS: Record<InstallmentPayment['method'], string> = {
  cash: 'ნაღდი',
  bank_transfer: 'საბანკო გადარიცხვა',
  card_terminal: 'ბარათი (POS)',
  other: 'სხვა',
  bog_online: 'BOG ონლაინ',
}

export const REMINDER_LABELS: Record<ReminderKind | 'manual', string> = {
  before_3: '3 დღით ადრე',
  due_day: 'გადახდის დღეს',
  overdue_3: '3 დღით გადაცილებისას',
  overdue_7: '7 დღით გადაცილებისას',
  manual: 'ხელით გაგზავნილი',
}

// Money is handled in whole tetri so a schedule always adds up exactly.
export function toTetri(value: number | string) {
  return Math.round(Number(value) * 100)
}

export function fromTetri(value: number) {
  return value / 100
}

export function formatMoney(value: number | string) {
  const tetri = toTetri(value)
  const sign = tetri < 0 ? '-' : ''
  const absolute = Math.abs(tetri)
  const whole = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${whole},${String(absolute % 100).padStart(2, '0')} ₾`
}

// Explicit so the output does not depend on the browser's locale data.
export function formatInstallmentDate(value?: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}.${month}.${year}`
}

export function todayInTbilisi(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tbilisi' }).format(now)
}

export function daysBetween(fromIso: string, toIso: string) {
  const from = Date.UTC(...isoParts(fromIso))
  const to = Date.UTC(...isoParts(toIso))
  return Math.round((to - from) / 86_400_000)
}

function isoParts(iso: string): [number, number, number] {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return [year, month - 1, day]
}

// Keeps the payment day; a month that is too short uses its last day (31 Jan -> 28 Feb -> 31 Mar).
export function addMonthsClamped(startIso: string, monthsToAdd: number) {
  const [year, month, day] = isoParts(startIso)
  const firstOfTarget = new Date(Date.UTC(year, month + monthsToAdd, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  firstOfTarget.setUTCDate(Math.min(day, lastDay))
  return firstOfTarget.toISOString().slice(0, 10)
}

export function buildInstallmentSchedule(totalPrice: number, downPayment: number, months: number, firstDueDate: string) {
  const financed = toTetri(totalPrice) - toTetri(downPayment)
  if (financed <= 0) throw new Error('Financed amount must be positive.')
  if (!Number.isInteger(months) || months < 1 || months > 60) throw new Error('Months must be between 1 and 60.')
  if (financed < months) throw new Error('Financed amount is too small for this many months.')

  const regular = Math.floor(financed / months)
  return Array.from({ length: months }, (_, index) => ({
    installment_number: index + 1,
    due_date: addMonthsClamped(firstDueDate, index),
    // Rounding remainder goes on the last payment.
    amount: fromTetri(index === months - 1 ? financed - regular * (months - 1) : regular),
  }))
}

export function remainingAmount(row: Pick<InstallmentScheduleRow, 'amount' | 'paid_amount'>) {
  return fromTetri(Math.max(0, toTetri(row.amount) - toTetri(row.paid_amount)))
}

export function overpaidAmount(row: Pick<InstallmentScheduleRow, 'amount' | 'paid_amount'>) {
  return fromTetri(Math.max(0, toTetri(row.paid_amount) - toTetri(row.amount)))
}

export function isRowOverdue(row: Pick<InstallmentScheduleRow, 'status' | 'due_date'>, today: string) {
  return row.status === 'pending' && row.due_date < today
}

export function summarizeContract(contract: Pick<InstallmentContract, 'total_price' | 'down_payment' | 'status' | 'installment_schedule'>, today: string) {
  const financed = toTetri(contract.total_price) - toTetri(contract.down_payment)
  const rows = contract.installment_schedule
  const open = rows.filter((row) => row.status === 'pending')
  const remaining = open.reduce((sum, row) => sum + toTetri(remainingAmount(row)), 0)
  const overdue = open.filter((row) => row.due_date < today).reduce((sum, row) => sum + toTetri(remainingAmount(row)), 0)
  return {
    financed: fromTetri(financed),
    remaining: fromTetri(remaining),
    overdue: fromTetri(overdue),
    paidCount: rows.filter((row) => row.status === 'paid').length,
    nextDue: [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null,
  }
}

// Which reminder applies to an installment today. The windows let a failed or
// missed daily run catch up without ever sending the same stage twice.
export function reminderKindFor(dueDate: string, today: string): ReminderKind | null {
  const daysUntilDue = daysBetween(today, dueDate)
  if (daysUntilDue >= 1 && daysUntilDue <= 3) return 'before_3'
  if (daysUntilDue === 0) return 'due_day'
  if (daysUntilDue <= -3 && daysUntilDue >= -6) return 'overdue_3'
  if (daysUntilDue <= -7 && daysUntilDue >= -14) return 'overdue_7'
  return null
}

export function normalizeInstallmentPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (/^995\d{9}$/.test(digits)) return digits
  if (/^5\d{8}$/.test(digits)) return `995${digits}`
  return ''
}

// Latin letters like the other SMS on this site: Georgian text splits into
// 70-character segments, so the same message would cost several times more.
export function installmentSmsText(contractNumber: string, amount: number | string, dueDate: string, kind: ReminderKind | 'manual', link: string) {
  const sum = (toTetri(amount) / 100).toFixed(2)
  const date = formatInstallmentDate(dueDate)
  const lead = kind === 'overdue_3' || kind === 'overdue_7'
    ? `Medical Line: xelshekruleba ${contractNumber}. shenatani ${sum} GEL vadagadacilebulia (vada ${date}).`
    : `Medical Line: xelshekruleba ${contractNumber}. shemdegi shenatani ${sum} GEL, vada ${date}.`
  return `${lead} Gadaxda: ${link} Info: 514011116`
}
