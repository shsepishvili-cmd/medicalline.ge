import type { ServiceCaseFormValues, ServiceCaseOutcome, WarrantyFormValues, WarrantyStatus } from './warranty-types'

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  pending: 'მოლოდინში',
  active: 'აქტიური',
  expired: 'ვადაგასული',
  void: 'გაუქმებული',
  replaced: 'შეცვლილი',
}

export const SERVICE_OUTCOME_LABELS: Record<ServiceCaseOutcome, string> = {
  repaired: 'შეკეთდა',
  replaced: 'შეიცვალა',
  rejected: 'უარი',
  returned_from_factory: 'ქარხნიდან დაბრუნდა',
  closed_no_fault_found: 'ხარვეზი არ დადასტურდა',
}

export const WARRANTY_STATUS_TONES: Record<WarrantyStatus, { background: string; color: string }> = {
  pending: { background: '#FAEEDA', color: '#7A5400' },
  active: { background: '#E1F5EE', color: '#085041' },
  expired: { background: '#FCEBEB', color: '#9B1C1C' },
  void: { background: '#F3F4F6', color: '#4B5563' },
  replaced: { background: '#E6F1FB', color: '#0C447C' },
}

export function calculateWarrantyEnd(warrantyStart: string, warrantyMonths: number) {
  if (!warrantyStart) return ''
  const [year, month, day] = warrantyStart.split('-').map(Number)
  if (!year || !month || !day) return ''

  const result = new Date(Date.UTC(year, month - 1, day))
  result.setUTCMonth(result.getUTCMonth() + Math.max(0, warrantyMonths))
  return result.toISOString().slice(0, 10)
}

export function deriveWarrantyStatus(status: WarrantyStatus, warrantyStart: string, warrantyEnd: string) {
  if (status === 'void' || status === 'replaced') return status
  if (!warrantyStart || !warrantyEnd) return 'pending'

  const today = new Date()
  const start = new Date(`${warrantyStart}T00:00:00`)
  const end = new Date(`${warrantyEnd}T23:59:59`)

  if (start > today) return 'pending'
  if (end < today) return 'expired'
  return 'active'
}

export function buildWarrantyVerifyUrl(baseUrl: string, verifyToken: string) {
  return `${baseUrl.replace(/\/$/, '')}/warranty/verify/${verifyToken}`
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ka-GE')
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ka-GE')
}

export function formatBoolean(value?: boolean | null) {
  if (value === true) return 'კი'
  if (value === false) return 'არა'
  return '—'
}

export function createEmptyWarrantyForm(): WarrantyFormValues {
  const today = new Date().toISOString().slice(0, 10)
  return {
    productId: '',
    brand: '',
    productCategory: '',
    productName: '',
    model: '',
    serialNumber: '',
    clinicName: '',
    customerName: '',
    customerIdNumber: '',
    customerAddress: '',
    phone: '',
    email: '',
    purchaseDate: today,
    installationDate: '',
    warrantyStart: today,
    warrantyMonths: '12',
    invoiceNumber: '',
    soldBy: '',
    status: 'pending',
    notes: '',
  }
}

export function createEmptyServiceCaseForm(): ServiceCaseFormValues {
  return {
    issueTitle: '',
    issueDescription: '',
    reportedAt: new Date().toISOString().slice(0, 16),
    inspectionResult: '',
    isMechanicalDamage: null,
    isUnderWarranty: null,
    actionTaken: '',
    replacedUnit: '',
    sentToFactory: false,
    factorySentAt: '',
    factoryReturnedAt: '',
    closedAt: '',
    outcome: '',
    notes: '',
  }
}

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function isInternalWarrantyRole(role?: string | null) {
  return role === 'admin' || role === 'engineer' || role === 'dealer'
}
