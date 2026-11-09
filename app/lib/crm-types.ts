export const CRM_LEAD_SOURCES = [
  'facebook', 'instagram', 'whatsapp', 'website',
  'email', 'phone', 'referral', 'exhibition', 'manual',
] as const

export const CRM_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'converted'] as const

export type CrmLeadSource = (typeof CRM_LEAD_SOURCES)[number]
export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number]

export interface CrmLead {
  id: string
  source: CrmLeadSource
  status: CrmLeadStatus
  owner_id: string | null
  contact_name: string | null
  clinic_name: string | null
  phone: string | null
  email: string | null
  instagram_handle: string | null
  facebook_profile: string | null
  whatsapp_phone: string | null
  city: string | null
  initial_interest: string | null
  notes: string | null
  disqualify_reason: string | null
  party_id: string | null
  contact_id: string | null
  profile_id: string | null
  converted_deal_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CrmLeadFormValues = {
  source: CrmLeadSource
  status: CrmLeadStatus
  contactName: string
  clinicName: string
  phone: string
  email: string
  instagramHandle: string
  facebookProfile: string
  whatsappPhone: string
  city: string
  initialInterest: string
  notes: string
}

export function createEmptyLeadForm(): CrmLeadFormValues {
  return {
    source: 'manual',
    status: 'new',
    contactName: '',
    clinicName: '',
    phone: '',
    email: '',
    instagramHandle: '',
    facebookProfile: '',
    whatsappPhone: '',
    city: '',
    initialInterest: '',
    notes: '',
  }
}

export const CRM_DEAL_STATUSES = ['open', 'won_pending_setup', 'won', 'lost'] as const
export const CRM_DEAL_CURRENCIES = ['GEL', 'USD', 'EUR'] as const

export type CrmDealStatus = (typeof CRM_DEAL_STATUSES)[number]
export type CrmDealCurrency = (typeof CRM_DEAL_CURRENCIES)[number]

export interface CrmDeal {
  id: string
  pipeline_id: string
  stage_id: string
  lead_id: string | null
  party_id: string | null
  contact_id: string | null
  owner_id: string | null
  created_by: string | null
  title: string
  expected_value: number
  currency: CrmDealCurrency
  probability_percent: number
  expected_close_date: string | null
  offer_id: string | null
  erp_sale_id: string | null
  status: CrmDealStatus
  lost_reason: string | null
  source: string | null
  notes: string | null
  won_at: string | null
  lost_at: string | null
  created_at: string
  updated_at: string
}

export interface CrmDealProduct {
  id: string
  deal_id: string
  product_id: string | null
  quantity: number
  serial_number: string | null
  notes: string | null
  product?: { id: string; name: string; slug: string; brand: string } | null
}

export interface CrmPipeline {
  id: string
  name: string
  is_default: boolean
  is_active: boolean
}

export interface CrmPipelineStage {
  id: string
  pipeline_id: string
  key: string
  label: string
  sort_order: number
  is_won: boolean
  is_lost: boolean
  is_active: boolean
}

export const CRM_TASK_TYPES = [
  'follow_up', 'call', 'meeting', 'demo', 'quotation',
  'payment', 'installation', 'training', 'service', 'other',
] as const
export const CRM_TASK_STATUSES = ['pending', 'in_progress', 'done', 'cancelled'] as const
export const CRM_TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export type CrmTaskType = (typeof CRM_TASK_TYPES)[number]
export type CrmTaskStatus = (typeof CRM_TASK_STATUSES)[number]
export type CrmTaskPriority = (typeof CRM_TASK_PRIORITIES)[number]

export interface CrmTask {
  id: string
  type: CrmTaskType
  title: string
  description: string | null
  priority: CrmTaskPriority
  due_at: string | null
  status: CrmTaskStatus
  assigned_to: string | null
  lead_id: string | null
  deal_id: string | null
  party_id: string | null
  contact_id: string | null
  warranty_id: string | null
  service_case_id: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const CRM_ACTIVITY_TYPES = [
  'inbound_message', 'outbound_message', 'call', 'note',
  'task_created', 'task_completed', 'follow_up', 'meeting', 'demo',
  'stage_change', 'quotation_created', 'quotation_sent',
  'erp_sale_created', 'warranty_created', 'installation', 'training',
  'service_event', 'ai_summary', 'system',
  'deal_created', 'product_added',
] as const

export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number]

export interface CrmActivity {
  id: string
  type: CrmActivityType
  body: string | null
  metadata: Record<string, unknown>
  party_id: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  task_id: string | null
  warranty_id: string | null
  service_case_id: string | null
  offer_id: string | null
  erp_sale_id: string | null
  actor_id: string | null
  created_at: string
}

export interface CrmContact {
  id: string
  party_id: string
  profile_id: string | null
  full_name: string
  title: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
  notes: string | null
  archived_at: string | null
}

// The canonical Customer 360 "Account" — public.erp_parties extended with the
// Milestone 2 CRM bridge columns (28_crm_erp_bridge.sql). This is the existing
// ERP party record, not a new/duplicate customer model.
export interface CrmAccount {
  id: string
  company_id: string
  party_type: 'customer' | 'supplier' | 'both' | 'bank' | 'employee' | 'other'
  code: string | null
  name: string
  tax_id: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  updated_at: string
  // Milestone 2 bridge columns
  profile_id: string | null
  crm_owner_id: string | null
  lead_source: string | null
  city: string | null
  is_individual: boolean
}

export interface CrmCustomer360 {
  account: CrmAccount
  ownerProfile: { id: string; full_name: string } | null
  contacts: CrmContact[]
  deals: CrmDeal[]
  tasks: CrmTask[]
  activities: CrmActivity[]
  productInterests: CrmDealProduct[]
}

export interface CrmDashboardMetrics {
  newLeads: number
  openDeals: number
  pipelineValue: number
  tasksDueToday: number
  overdueFollowUps: number
  wonDealsThisPeriod: number
  wonValueThisPeriod: number
  recentActivities: CrmActivity[]
}

export const CRM_LEAD_SOURCE_LABELS: Record<CrmLeadSource, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  website: 'ვებსაიტი',
  email: 'ელფოსტა',
  phone: 'ტელეფონი',
  referral: 'რეკომენდაცია',
  exhibition: 'გამოფენა',
  manual: 'ხელით შეყვანილი',
}

export const CRM_LEAD_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new: 'ახალი',
  contacted: 'კონტაქტი დამყარებულია',
  qualified: 'კვალიფიცირებული',
  disqualified: 'დისკვალიფიცირებული',
  converted: 'კონვერტირებული',
}

export const CRM_LEAD_STATUS_TONES: Record<CrmLeadStatus, { background: string; color: string }> = {
  new: { background: '#E6F1FB', color: '#0C447C' },
  contacted: { background: '#FAEEDA', color: '#7A5400' },
  qualified: { background: '#E1F5EE', color: '#085041' },
  disqualified: { background: '#F3F4F6', color: '#4B5563' },
  converted: { background: '#EEF2FF', color: '#3730A3' },
}

export const CRM_DEAL_STATUS_LABELS: Record<CrmDealStatus, string> = {
  open: 'აქტიური',
  won_pending_setup: 'მოგებული (მოლოდინში)',
  won: 'მოგებული',
  lost: 'წაგებული',
}

export const CRM_TASK_TYPE_LABELS: Record<CrmTaskType, string> = {
  follow_up: 'შემდგომი კონტაქტი',
  call: 'ზარი',
  meeting: 'შეხვედრა',
  demo: 'დემო',
  quotation: 'შეთავაზება',
  payment: 'გადახდა',
  installation: 'ინსტალაცია',
  training: 'ტრენინგი',
  service: 'სერვისი',
  other: 'სხვა',
}

export const CRM_TASK_STATUS_LABELS: Record<CrmTaskStatus, string> = {
  pending: 'მოლოდინში',
  in_progress: 'მიმდინარე',
  done: 'დასრულებული',
  cancelled: 'გაუქმებული',
}

export const CRM_TASK_PRIORITY_LABELS: Record<CrmTaskPriority, string> = {
  low: 'დაბალი',
  normal: 'ჩვეულებრივი',
  high: 'მაღალი',
  urgent: 'გადაუდებელი',
}

export const CRM_TASK_PRIORITY_TONES: Record<CrmTaskPriority, { background: string; color: string }> = {
  low: { background: '#F3F4F6', color: '#4B5563' },
  normal: { background: '#E6F1FB', color: '#0C447C' },
  high: { background: '#FAEEDA', color: '#7A5400' },
  urgent: { background: '#FCEBEB', color: '#9B1C1C' },
}

export const CRM_ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  inbound_message: 'შემომავალი შეტყობინება',
  outbound_message: 'გამავალი შეტყობინება',
  call: 'ზარი',
  note: 'შენიშვნა',
  task_created: 'დავალება შეიქმნა',
  task_completed: 'დავალება დასრულდა',
  follow_up: 'შემდგომი კონტაქტი',
  meeting: 'შეხვედრა',
  demo: 'დემო',
  stage_change: 'ეტაპის ცვლილება',
  quotation_created: 'შეთავაზება შეიქმნა',
  quotation_sent: 'შეთავაზება გაიგზავნა',
  erp_sale_created: 'ERP გაყიდვა შეიქმნა',
  warranty_created: 'გარანტია შეიქმნა',
  installation: 'ინსტალაცია',
  training: 'ტრენინგი',
  service_event: 'სერვისის მოვლენა',
  ai_summary: 'AI შეჯამება',
  system: 'სისტემური',
  deal_created: 'გარიგება შეიქმნა',
  product_added: 'პროდუქტი დაემატა',
}
