export type InvoiceAcceptanceActStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'cancelled'

export type InvoiceAcceptanceActItem = {
  id?: string
  product_name: string
  product_code?: string | null
  unit: string
  quantity: number
}

export type PublicInvoiceAcceptanceAct = {
  id: string
  act_number: string
  act_date: string
  status: InvoiceAcceptanceActStatus
  public_token: string
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_by: string | null
  invoice_number: string
  invoice_date: string
  delivery_date: string | null
  customer_name: string
  customer_tax_id: string | null
  customer_address: string | null
  customer_email: string | null
  customer_phone: string | null
  notes: string | null
  items: InvoiceAcceptanceActItem[]
}
