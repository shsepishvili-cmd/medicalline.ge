export const ORDER_STATUSES = ['new', 'processing', 'quoted', 'confirmed', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'ახალი',
  processing: 'მუშავდება',
  quoted: 'შეთავაზება გაგზავნილია',
  confirmed: 'დადასტურებული',
  delivered: 'გაგზავნილი',
  cancelled: 'გაუქმებული',
}

export type OrderCustomerRecord = {
  id: string
  created_at: string
  updated_at: string
  phone_normalized: string
  phone_display: string | null
  erp_party_id: string | null
  full_name: string
  clinic_name: string | null
  city: string | null
  email: string | null
  tax_id: string | null
  source: string | null
}

export type OrderPortalRecord = {
  id: string
  created_at: string
  updated_at: string
  order_number: string
  customer_id: string
  status: OrderStatus
  requested_product: string
  product_category: string | null
  quantity: number
  urgency: string | null
  preferred_contact: string | null
  delivery_city: string | null
  delivery_address: string | null
  comment: string | null
  source: string
  ip_address: string | null
  user_agent: string | null
  admin_note: string | null
  reminder_at: string | null
  status_sms_sent_at: string | null
  status_sms_error: string | null
  warranty_id: string | null
  warranty_sms_sent_at: string | null
  warranty_sms_error: string | null
  customer?: OrderCustomerRecord | null
}

export type OrderPortalFormValues = {
  fullName: string
  clinicName: string
  phone: string
  city: string
  email: string
  taxId: string
  requestedProduct: string
  productCategory: string
  quantity: string
  urgency: string
  preferredContact: string
  deliveryCity: string
  deliveryAddress: string
  comment: string
}
