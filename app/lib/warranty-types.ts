export const WARRANTY_STATUSES = ['pending', 'active', 'expired', 'void', 'replaced'] as const
export const SERVICE_CASE_OUTCOMES = ['repaired', 'replaced', 'rejected', 'returned_from_factory', 'closed_no_fault_found'] as const

export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number]
export type ServiceCaseOutcome = (typeof SERVICE_CASE_OUTCOMES)[number]

export type ProfileSummary = {
  id: string
  full_name: string
  clinic_name: string
  phone: string
  role: string
  status: string
}

export type ProductOption = {
  id: string
  name: string
  brand: string
  category_slug: string | null
  slug: string
}

export type WarrantyRecord = {
  id: string
  created_at: string
  updated_at: string
  warranty_number: string
  product_id: string | null
  brand: string
  product_category: string | null
  product_name: string
  model: string | null
  serial_number: string
  clinic_name: string | null
  customer_name: string | null
  phone: string | null
  email: string | null
  purchase_date: string | null
  installation_date: string | null
  warranty_start: string
  warranty_months: number
  warranty_end: string
  invoice_number: string | null
  sold_by: string | null
  status: WarrantyStatus
  notes: string | null
  created_by: string | null
  pdf_path: string | null
  qr_url: string | null
  verify_token: string
  archived_at: string | null
  products?: ProductOption | null
}

export type ServiceCaseRecord = {
  id: string
  created_at: string
  updated_at: string
  warranty_id: string
  case_number: string
  issue_title: string
  issue_description: string | null
  reported_at: string
  inspection_result: string | null
  is_mechanical_damage: boolean | null
  is_under_warranty: boolean | null
  action_taken: string | null
  replaced_unit: string | null
  sent_to_factory: boolean
  factory_sent_at: string | null
  factory_returned_at: string | null
  closed_at: string | null
  outcome: ServiceCaseOutcome | null
  notes: string | null
  created_by: string | null
}

export type WarrantyAttachmentRecord = {
  id: string
  created_at: string
  warranty_id: string | null
  service_case_id: string | null
  file_name: string
  file_path: string
  file_bucket: string
  file_type: string | null
  uploaded_by: string | null
}

export type WarrantyDetail = {
  warranty: WarrantyRecord
  attachments: WarrantyAttachmentRecord[]
  serviceCases: ServiceCaseRecord[]
}

export type WarrantyFormValues = {
  productId: string
  brand: string
  productCategory: string
  productName: string
  model: string
  serialNumber: string
  clinicName: string
  customerName: string
  phone: string
  email: string
  purchaseDate: string
  installationDate: string
  warrantyStart: string
  warrantyMonths: string
  invoiceNumber: string
  soldBy: string
  status: WarrantyStatus
  notes: string
}

export type ServiceCaseFormValues = {
  issueTitle: string
  issueDescription: string
  reportedAt: string
  inspectionResult: string
  isMechanicalDamage: boolean | null
  isUnderWarranty: boolean | null
  actionTaken: string
  replacedUnit: string
  sentToFactory: boolean
  factorySentAt: string
  factoryReturnedAt: string
  closedAt: string
  outcome: ServiceCaseOutcome | ''
  notes: string
}
