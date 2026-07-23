import { z } from 'zod'

export const vatModeSchema = z.enum(['without_vat', 'vat_included', 'vat_excluded_add_vat', 'unknown'])
export const currencySchema = z.enum(['GEL', 'USD', 'EUR'])

export const invoiceDraftItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  product_query: z.string().trim().min(1).max(300),
  product_name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).default(''),
  product_code: z.string().trim().max(100).nullable().default(null),
  unit: z.string().trim().min(1).max(40),
  quantity: z.coerce.number().positive().max(1_000_000),
  unit_price: z.coerce.number().min(0).max(1_000_000_000),
  discount: z.coerce.number().min(0).max(1_000_000_000).default(0),
  line_total: z.coerce.number().min(0).default(0),
  standard_price: z.coerce.number().min(0).nullable().optional(),
  match_warning: z.string().max(500).nullable().optional(),
})

export const invoiceDraftSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_query: z.string().trim().min(1).max(300),
  customer_name: z.string().trim().min(1).max(300),
  customer_tax_id: z.string().trim().max(30).default(''),
  customer_address: z.string().trim().max(500).default(''),
  customer_email: z.string().trim().max(254).default(''),
  customer_phone: z.string().trim().max(50).default(''),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  currency: currencySchema,
  vat_mode: vatModeSchema,
  items: z.array(invoiceDraftItemSchema).min(1).max(100),
  notes: z.string().trim().max(4000).default(''),
  payment_terms: z.string().trim().max(1000).default(''),
  requested_scanned_version: z.boolean().default(false),
  stamp_applied: z.boolean().default(false),
  signature_applied: z.boolean().default(false),
  warnings: z.array(z.string().max(500)).default([]),
  questions: z.array(z.string().max(500)).default([]),
})

export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>
export type InvoiceDraftItem = z.infer<typeof invoiceDraftItemSchema>
export type VatMode = z.infer<typeof vatModeSchema>
