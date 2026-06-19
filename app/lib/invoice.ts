export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type InvoiceClient = {
  id: number
  name: string
  company: string | null
  id_num: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
}

export type InvoiceProduct = {
  id: number
  code: string | null
  name: string
  category: string | null
  price: number
  currency: string
  unit: string | null
  description: string | null
  vat_included: boolean | null
}

export type InvoiceItem = {
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
  vatIncluded?: boolean
}

export type InvoicePaymentSplit = {
  label: string
  percent: number
}

export type InvoiceRecord = {
  id: number
  created_at: string
  number: string
  status: InvoiceStatus
  client_id: number | null
  date: string | null
  due: string | null
  currency: string
  terms: string | null
  vat_rate: number
  discount: number
  note: string | null
  bank: string | null
  payment_splits?: InvoicePaymentSplit[] | null
  items: InvoiceItem[]
  subtotal: number
  discount_amount: number
  vat_amount: number
  total: number
  color: string | null
}

export type InvoiceFormValues = {
  number: string
  clientId: string
  clientName: string
  clientCompany: string
  clientIdNum: string
  clientPhone: string
  clientEmail: string
  clientAddress: string
  date: string
  due: string
  status: InvoiceStatus
  currency: string
  vatRate: string
  discount: string
  terms: string
  note: string
  bank: string
  paymentSplits: InvoicePaymentSplit[]
  items: InvoiceItem[]
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'დრაფტი',
  sent: 'გაგზავნილი',
  paid: 'გადახდილი',
  overdue: 'ვადაგადაცილებული',
  cancelled: 'გაუქმებული',
}

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, { bg: string; fg: string }> = {
  draft: { bg: '#f1f5f9', fg: '#475569' },
  sent: { bg: '#dbeafe', fg: '#1d4ed8' },
  paid: { bg: '#dcfce7', fg: '#15803d' },
  overdue: { bg: '#fee2e2', fg: '#b91c1c' },
  cancelled: { bg: '#f3f4f6', fg: '#4b5563' },
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function createEmptyInvoiceForm(nextNumber: string): InvoiceFormValues {
  return {
    number: nextNumber,
    clientId: '',
    clientName: '',
    clientCompany: '',
    clientIdNum: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    date: todayIso(),
    due: addDaysIso(7),
    status: 'draft',
    currency: 'GEL',
    vatRate: '18',
    discount: '0',
    terms: 'გადახდა ინვოისის მიღებიდან 7 კალენდარული დღის განმავლობაში.',
    note: '',
    bank: 'TBC Bank / Bank of Georgia',
    paymentSplits: [
      { label: 'წინასწარ', percent: 70 },
      { label: 'მიწოდების შემდეგ', percent: 30 },
    ],
    items: [{ name: '', description: '', quantity: 1, unit: 'ცალი', unitPrice: 0, vatIncluded: true }],
  }
}

export function calcInvoiceTotals(items: InvoiceItem[], vatRate: number, discountPercent: number) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
  const discountAmount = subtotal * Math.max(0, Number(discountPercent || 0)) / 100
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const vatAmount = afterDiscount * Math.max(0, Number(vatRate || 0)) / 100
  const total = afterDiscount + vatAmount
  return { subtotal, discountAmount, vatAmount, total }
}

export function formatMoney(amount: number, currency = 'GEL') {
  return `${new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount || 0))} ${currency}`
}

export function buildNextInvoiceNumber(invoices: Pick<InvoiceRecord, 'number'>[], date = new Date()) {
  const year = date.getFullYear()
  const max = invoices.reduce((acc, invoice) => {
    const match = String(invoice.number || '').match(/^INV-(\d{4})-(\d+)$/i)
    if (match?.[1] !== String(year)) return acc
    return match ? Math.max(acc, Number(match[2])) : acc
  }, 0)
  return `INV-${year}-${String(max + 1).padStart(4, '0')}`
}

export function normalizeInvoicePhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('995')) return digits
  if (digits.length === 9 && digits.startsWith('5')) return `995${digits}`
  if (digits.length === 8 && digits.startsWith('0')) return `995${digits.slice(1)}`
  return digits
}

export function buildInvoiceShareText(
  invoice: Pick<InvoiceRecord, 'number' | 'total' | 'currency' | 'due' | 'bank'>,
  client?: Pick<InvoiceClient, 'name'> | null,
  company?: { name?: string | null; phone?: string | null; bank?: string | null },
) {
  const greeting = client?.name ? `გამარჯობა, ${client.name}.` : 'გამარჯობა.'
  const lines = [
    `${greeting} გიგზავნით ინვოისს ${invoice.number}.`,
    `ჯამი: ${formatMoney(invoice.total, invoice.currency)}.`,
    invoice.due ? `გადახდის ვადა: ${invoice.due}.` : '',
    invoice.bank || company?.bank ? `ბანკი: ${invoice.bank || company?.bank}.` : '',
    company?.name ? company.name : '',
    company?.phone ? `ტელ: ${company.phone}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}

export function buildWhatsappInvoiceUrl(phone: string | null | undefined, text: string) {
  const normalized = normalizeInvoicePhone(phone)
  const encoded = encodeURIComponent(text)
  if (!/^995\d{9}$/.test(normalized)) return `https://wa.me/?text=${encoded}`
  return `https://wa.me/${normalized}?text=${encoded}`
}
