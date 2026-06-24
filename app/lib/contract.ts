import type { ContractFormValues, ContractStatus } from './contract-types'

export function formatCurrency(amount: number, currency = 'GEL') {
  return new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency
}

export function calcVatAmount(unitPrice: number, quantity: number, vatRate: number, vatIncluded: boolean) {
  const total = unitPrice * quantity
  if (vatRate <= 0) return { net: total, vat: 0, gross: total }
  if (vatIncluded) {
    const net = total / (1 + vatRate / 100)
    return { net, vat: total - net, gross: total }
  }
  const vat = total * (vatRate / 100)
  return { net: total, vat, gross: total + vat }
}

export function createEmptyContractForm(): ContractFormValues {
  return {
    contractDate: new Date().toISOString().slice(0, 10),
    warrantyId: '',
    clinicName: '',
    customerName: '',
    customerIdNumber: '',
    customerAddress: '',
    phone: '',
    email: '',
    templateType: 'general',
    contractBody: '',
    productName: '',
    brand: '',
    model: '',
    serialNumber: '',
    quantity: '1',
    unitPrice: '',
    currency: 'GEL',
    vatRate: '18',
    vatIncluded: true,
    paymentTerms: '100% გადახდა ხელშეკრულების ხელმოწერისთანავე',
    deliveryDate: '',
    deliveryAddress: '',
    installationIncluded: false,
    warrantyMonths: '12',
    specialTerms: '',
    status: 'draft',
    notes: '',
  }
}

export function deriveContractStatus(status: ContractStatus): ContractStatus {
  return status
}

export function buildPublicContractUrl(baseUrl: string, publicToken: string) {
  return `${baseUrl.replace(/\/$/, '')}/contact-hub/accept/${publicToken}`
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}
