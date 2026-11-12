import { z } from 'zod'

const currency = z.enum(['GEL','USD','EUR','CNY'])
const smallText = z.string().trim().max(300)
const line = z.object({
  id:z.string().min(1).max(100),name:smallText.min(1),supplierSku:smallText.optional(),
  orisAccount:z.string().trim().max(40),hsCode:smallText.optional(),
  quantity:z.number().positive().finite(),unit:smallText.default('ცალი'),
  unitPrice:z.number().nonnegative().finite(),grossWeightKg:z.number().nonnegative().finite().nullable().optional(),
  netWeightKg:z.number().nonnegative().finite().nullable().optional(),
  weightConfidence:z.enum(['document','history','estimated','unknown']).optional(),
  declaredCustomsGel:z.number().nonnegative().finite().nullable().optional(),
  manualShares:z.record(z.string(),z.number().nonnegative().finite()).optional(),
})
const expense = z.object({
  id:z.string().min(1).max(100),
  kind:z.enum(['international_freight','local_freight','customs_service','terminal','expertise','broker','import_duty','import_vat','other']),
  title:smallText.min(1),enabled:z.boolean(),amount:z.number().nonnegative().finite(),currency,
  vatIncluded:z.boolean(),vatRate:z.number().min(0).max(100).finite(),
  vatAmount:z.number().nonnegative().finite().nullable().optional(),vatDeductible:z.boolean(),
  basis:z.enum(['auto','weight','value','equal','manual','declared']),
  counterpartyAccount:z.string().max(40).optional(),documentNumber:smallText.optional(),note:z.string().max(3000).optional(),
  includedInInvoice:z.boolean().optional(),
})

export const importDraftSchema = z.object({
  id:z.string().uuid().optional(),reference:smallText.min(1),supplierName:smallText.min(1),
  supplierOrisAccount:z.string().max(40),invoiceNumber:smallText,
  invoiceDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),declarationNumber:smallText,
  declarationDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),currency,
  rateToGel:z.number().positive().finite(),expenseRates:z.object({GEL:z.number().positive().finite(),USD:z.number().positive().finite(),EUR:z.number().positive().finite(),CNY:z.number().positive().finite()}).partial(),
  items:z.array(line).max(1000),expenses:z.array(expense).max(70),notes:z.string().max(10000).optional(),
  status:z.enum(['draft','review','approved']),
}).strict()
