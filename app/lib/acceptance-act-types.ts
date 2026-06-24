import type { ContractRecord } from './contract-types'

export const ACCEPTANCE_ACT_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'cancelled'] as const
export type AcceptanceActStatus = (typeof ACCEPTANCE_ACT_STATUSES)[number]

export const ACCEPTANCE_ACT_STATUS_LABELS: Record<AcceptanceActStatus, string> = {
  draft: 'დრაფტი',
  sent: 'გაგზავნილი',
  viewed: 'ნანახი',
  accepted: 'დადასტურებული',
  cancelled: 'გაუქმებული',
}

export type ContractAcceptanceActRecord = {
  id: string
  created_at: string
  updated_at: string
  contract_id: string
  act_number: string
  act_date: string
  status: AcceptanceActStatus
  public_token: string | null
  otp_code: string | null
  otp_expires_at: string | null
  otp_verified_at: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_phone: string | null
  accepted_email: string | null
  accepted_by: string | null
  accepted_identity_suffix: string | null
  acceptance_note: string | null
  last_sent_channel: string | null
  delivery_address: string | null
  equipment_condition: string | null
  installation_completed: boolean
  training_completed: boolean
  missing_items: string | null
  remarks: string | null
  act_body: string | null
  document_version: number
  created_by: string | null
}

export type PublicAcceptanceActSummary = Pick<
  ContractAcceptanceActRecord,
  | 'id'
  | 'contract_id'
  | 'act_number'
  | 'act_date'
  | 'status'
  | 'public_token'
  | 'sent_at'
  | 'viewed_at'
  | 'accepted_at'
  | 'accepted_by'
  | 'accepted_identity_suffix'
  | 'delivery_address'
  | 'equipment_condition'
  | 'installation_completed'
  | 'training_completed'
  | 'missing_items'
  | 'remarks'
  | 'act_body'
  | 'document_version'
> & Pick<
  ContractRecord,
  | 'contract_number'
  | 'contract_date'
  | 'clinic_name'
  | 'customer_name'
  | 'customer_id_number'
  | 'customer_address'
  | 'phone'
  | 'email'
  | 'product_name'
  | 'brand'
  | 'model'
  | 'serial_number'
  | 'quantity'
  | 'delivery_date'
  | 'warranty_months'
>
