export type Currency = 'GEL' | 'USD' | 'EUR' | 'CNY'
export type CostBasis = 'auto' | 'weight' | 'value' | 'equal' | 'manual' | 'declared'
export type ExpenseKind =
  | 'international_freight' | 'local_freight' | 'customs_service' | 'terminal'
  | 'expertise' | 'broker' | 'import_duty' | 'import_vat' | 'other'
export type ImportStatus = 'draft' | 'review' | 'approved'
export type WeightConfidence = 'document' | 'history' | 'estimated' | 'unknown'

export interface ImportLine {
  id: string
  name: string
  supplierSku?: string
  orisAccount: string
  hsCode?: string
  quantity: number
  unit: string
  unitPrice: number
  grossWeightKg?: number | null
  netWeightKg?: number | null
  weightConfidence?: WeightConfidence
  declaredCustomsGel?: number | null
  manualShares?: Record<string, number>
}

export interface ImportExpense {
  id: string
  kind: ExpenseKind
  title: string
  enabled: boolean
  amount: number
  currency: Currency
  // The amount includes VAT if vatIncluded=true.
  vatIncluded: boolean
  vatRate: number
  // Where a document states VAT explicitly, its exact amount takes precedence.
  vatAmount?: number | null
  vatDeductible: boolean
  basis: CostBasis
  counterpartyAccount?: string
  documentNumber?: string
  note?: string
  // A prepayment/freight already included in invoice unit prices MUST NOT be repeated.
  includedInInvoice?: boolean
}

export interface ImportDraft {
  id?: string
  reference: string
  supplierName: string
  supplierOrisAccount: string
  invoiceNumber: string
  invoiceDate: string
  declarationNumber: string
  declarationDate: string
  currency: Currency
  // Explicit accounting conversion rate to GEL per one unit of invoice currency.
  rateToGel: number
  // Rates for non-invoice-currency expenses to GEL.
  expenseRates: Partial<Record<Currency, number>>
  items: ImportLine[]
  expenses: ImportExpense[]
  notes?: string
  status: ImportStatus
}

export interface AllocatedLine {
  id: string
  name: string
  orisAccount: string
  quantity: number
  invoiceGel: number
  byExpense: Record<string, number>
  landedGel: number
  unitLandedGel: number
  vatGel: number
  warning?: string
}

export interface ExpenseResult {
  id: string
  title: string
  kind: ExpenseKind
  netGel: number
  vatGel: number
  appliedGel: number
  basisUsed: Exclude<CostBasis, 'auto'> | 'excluded'
  counterpartyAccount?: string
  warning?: string
}

export interface ImportCalculation {
  lines: AllocatedLine[]
  expenses: ExpenseResult[]
  goodsGel: number
  totalCapitalizedExpensesGel: number
  totalVatGel: number
  landedTotalGel: number
  warnings: string[]
  blockingIssues: string[]
  canApprove: boolean
}

export const COST_LABELS: Record<ExpenseKind, string> = {
  international_freight: 'საერთაშორისო ტრანსპორტირება',
  local_freight: 'შიდა ტრანსპორტირება',
  customs_service: 'საბაჟო მომსახურება',
  terminal: 'ტერმინალი',
  expertise: 'ექსპერტიზა',
  broker: 'ბროკერის მომსახურება',
  import_duty: 'იმპორტის გადასახადი',
  import_vat: 'იმპორტის დღგ',
  other: 'სხვა ხარჯი',
}

export const DEFAULT_EXPENSES: ImportExpense[] = (
  Object.entries(COST_LABELS) as Array<[ExpenseKind,string]>
).map(([kind,title], index) => ({
  id: `cost-${index}-${kind}`, kind, title, enabled: false, amount: 0,
  currency: 'GEL', vatIncluded: false, vatRate: 18, vatDeductible: true,
  basis: kind === 'international_freight' || kind === 'local_freight' || kind === 'terminal' ? 'auto' : 'value',
}))
