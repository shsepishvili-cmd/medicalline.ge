export const CONTRACT_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'signed', 'paid', 'cancelled'] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const CONTRACT_TEMPLATES = [
  'general',
  'finscan',
  'intraoral_scanner',
  'endo_equipment',
  'intraoral_sensor',
  'xray',
] as const
export type ContractTemplateType = (typeof CONTRACT_TEMPLATES)[number]

export const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplateType, string> = {
  general: 'ზოგადი სტომატოლოგიური აპარატი',
  finscan: 'FINSCAN / პირის ღრუს სკანერი',
  intraoral_scanner: 'პირის ღრუს სკანერი',
  endo_equipment: 'ენდოდონტიური აპარატი',
  intraoral_sensor: 'ინტრაორალური სენსორი',
  xray: 'რენტგენი / რადიოლოგიური აპარატი',
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'დრაფტი',
  sent: 'გაგზავნილი',
  viewed: 'ნანახი',
  accepted: 'დადასტურებული',
  signed: 'ხელმოწერილი',
  paid: 'გადახდილი',
  cancelled: 'გაუქმებული',
}

export const CONTRACT_STATUS_TONES: Record<ContractStatus, { background: string; color: string }> = {
  draft: { background: '#FAEEDA', color: '#7A5400' },
  sent: { background: '#DBEAFE', color: '#1D4ED8' },
  viewed: { background: '#E0F2FE', color: '#0369A1' },
  accepted: { background: '#DCFCE7', color: '#15803D' },
  signed: { background: '#E1F5EE', color: '#085041' },
  paid: { background: '#ECFCCB', color: '#3F6212' },
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

  contract_template: ContractTemplateType | null
  contract_body: string | null
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
  public_token: string | null
  document_version: number
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  signed_at: string | null
  paid_at: string | null
  agreed_to_terms: boolean
  otp_code: string | null
  otp_expires_at: string | null
  otp_verified_at: string | null
  accepted_phone: string | null
  accepted_email: string | null
  last_sent_channel: string | null
  acceptance_note: string | null

  notes: string | null
  created_by: string | null
}

export type ContractAuditLogRecord = {
  id: string
  created_at: string
  contract_id: string
  event_type: string
  event_status: string | null
  channel: string | null
  ip_address: string | null
  user_agent: string | null
  phone: string | null
  email: string | null
  document_version: number | null
  actor_user_id: string | null
  metadata: Record<string, unknown>
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
  templateType: ContractTemplateType
  contractBody: string
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

export type PublicContractSummary = Pick<
  ContractRecord,
  | 'id'
  | 'contract_number'
  | 'contract_date'
  | 'clinic_name'
  | 'customer_name'
  | 'customer_id_number'
  | 'customer_address'
  | 'phone'
  | 'email'
  | 'contract_template'
  | 'contract_body'
  | 'product_name'
  | 'brand'
  | 'model'
  | 'serial_number'
  | 'quantity'
  | 'unit_price'
  | 'currency'
  | 'vat_rate'
  | 'vat_included'
  | 'total_amount'
  | 'payment_terms'
  | 'delivery_date'
  | 'delivery_address'
  | 'installation_included'
  | 'warranty_months'
  | 'special_terms'
  | 'status'
  | 'pdf_path'
  | 'public_token'
  | 'document_version'
  | 'agreed_to_terms'
  | 'sent_at'
  | 'viewed_at'
  | 'accepted_at'
  | 'signed_at'
  | 'paid_at'
>
