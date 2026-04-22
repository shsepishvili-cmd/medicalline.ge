export const CONTRACT_STATUSES = ['draft', 'signed', 'cancelled'] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'დრაფტი',
  signed: 'ხელმოწერილი',
  cancelled: 'გაუქმებული',
}

export const CONTRACT_STATUS_TONES: Record<ContractStatus, { background: string; color: string }> = {
  draft:     { background: '#FAEEDA', color: '#7A5400' },
  signed:    { background: '#E1F5EE', color: '#085041' },
  cancelled: { background: '#FCEBEB', color: '#9B1C1C' },
}

export type ContractRecord = {
  id: string
  created_at: string
  updated_at: string
  contract_number: string
  contract_date: string
  warranty_id: string | null

  clinic_name: string | null
  customer_name: string | null
  customer_id_number: string | null
  customer_address: string | null
  phone: string | null
  email: string | null

  product_name: string
  brand: string
  model: string | null
  serial_number: string | null
  quantity: number

  unit_price: number
  currency: string
  vat_rate: number
  vat_included: boolean
  total_amount: number

  payment_terms: string | null
  delivery_date: string | null
  delivery_address: string | null
  installation_included: boolean
  warranty_months: number
  special_terms: string | null

  status: ContractStatus
  pdf_path: string | null
  generated_at: string | null

  notes: string | null
  created_by: string | null
}

export type ContractFormValues = {
  contractDate: string
  warrantyId: string
  clinicName: string
  customerName: string
  customerIdNumber: string
  customerAddress: string
  phone: string
  email: string
  productName: string
  brand: string
  model: string
  serialNumber: string
  quantity: string
  unitPrice: string
  currency: string
  vatRate: string
  vatIncluded: boolean
  paymentTerms: string
  deliveryDate: string
  deliveryAddress: string
  installationIncluded: boolean
  warrantyMonths: string
  specialTerms: string
  status: ContractStatus
  notes: string
}
