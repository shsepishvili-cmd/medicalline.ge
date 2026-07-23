import type { InvoiceDraftItem, VatMode } from './ai-invoice-types'

const ones = ['', 'ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა']
const teens: Record<number, string> = {
  10: 'ათი', 11: 'თერთმეტი', 12: 'თორმეტი', 13: 'ცამეტი', 14: 'თოთხმეტი',
  15: 'თხუთმეტი', 16: 'თექვსმეტი', 17: 'ჩვიდმეტი', 18: 'თვრამეტი', 19: 'ცხრამეტი',
}
const twenties = ['', '', 'ოცი', 'ოცდაათი', 'ორმოცი', 'ორმოცდაათი', 'სამოცი', 'სამოცდაათი', 'ოთხმოცი', 'ოთხმოცდაათი']
const hundreds = ['', 'ასი', 'ორასი', 'სამასი', 'ოთხასი', 'ხუთასი', 'ექვსასი', 'შვიდასი', 'რვაასი', 'ცხრაასი']

function underHundred(value: number): string {
  if (value < 10) return ones[value]
  if (value < 20) return teens[value]
  const ten = Math.floor(value / 10)
  const rest = value % 10
  return rest ? `${twenties[ten].replace(/ი$/, '')}და${ones[rest]}` : twenties[ten]
}

function underThousand(value: number): string {
  if (value < 100) return underHundred(value)
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  const head = hundreds[hundred]
  return rest ? `${head.replace(/ი$/, '')} ${underHundred(rest)}` : head
}

export function integerToGeorgian(value: number): string {
  const n = Math.max(0, Math.floor(value))
  if (n === 0) return 'ნული'
  if (n < 1000) return underThousand(n)
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000)
    const rest = n % 1000
    const head = thousands === 1 ? 'ერთი ათასი' : `${underThousand(thousands)} ათასი`
    return rest ? `${head.replace(/ი$/, '')} ${underThousand(rest)}` : head
  }
  const millions = Math.floor(n / 1_000_000)
  const rest = n % 1_000_000
  const head = `${integerToGeorgian(millions)} მილიონი`
  return rest ? `${head} ${integerToGeorgian(rest)}` : head
}

export function amountInWords(amountCents: number, currency: 'GEL' | 'USD' | 'EUR') {
  const whole = Math.floor(amountCents / 100)
  const fraction = amountCents % 100
  const names = {
    GEL: ['ლარი', 'თეთრი'],
    USD: ['აშშ დოლარი', 'ცენტი'],
    EUR: ['ევრო', 'ცენტი'],
  } as const
  return `${integerToGeorgian(whole)} ${names[currency][0]} და ${String(fraction).padStart(2, '0')} ${names[currency][1]}`
}

export function moneyToCents(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100)
}

export function calculateInvoice(items: InvoiceDraftItem[], vatMode: Exclude<VatMode, 'unknown'>) {
  const normalizedItems = items.map((item) => {
    const gross = Math.round(moneyToCents(item.unit_price) * Number(item.quantity))
    const discount = moneyToCents(item.discount || 0)
    const lineTotal = Math.max(0, gross - discount)
    return { ...item, line_total: lineTotal / 100 }
  })
  const subtotalCents = normalizedItems.reduce((sum, item) => sum + moneyToCents(item.line_total), 0)
  const discountCents = normalizedItems.reduce((sum, item) => sum + moneyToCents(item.discount), 0)
  const vatCents = vatMode === 'vat_excluded_add_vat'
    ? Math.round(subtotalCents * 18 / 100)
    : vatMode === 'vat_included'
      ? Math.round(subtotalCents * 18 / 118)
      : 0
  const grandTotalCents = vatMode === 'vat_excluded_add_vat' ? subtotalCents + vatCents : subtotalCents
  return {
    items: normalizedItems,
    subtotal: subtotalCents / 100,
    discount_total: discountCents / 100,
    vat_total: vatCents / 100,
    grand_total: grandTotalCents / 100,
    grandTotalCents,
  }
}
