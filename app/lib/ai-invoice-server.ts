import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { invoiceDraftSchema, type InvoiceDraft, type InvoiceDraftItem } from './ai-invoice-types'
import { calculateInvoice } from './ai-invoice-money'

const AI_SYSTEM_PROMPT = `You extract invoice drafts from Georgian or English text.
Return JSON only. Never invent customer, tax, bank, product, price, VAT, or date data.
Schema: {"customer_query":"","customer_name":"","customer_tax_id":"","customer_address":"","customer_email":"","customer_phone":"","invoice_date":"YYYY-MM-DD","delivery_date":null,"due_date":null,"currency":"GEL|USD|EUR","vat_mode":"without_vat|vat_included|vat_excluded_add_vat|unknown","items":[{"product_query":"","product_name":"","description":"","product_code":null,"unit":"ცალი","quantity":1,"unit_price":0,"discount":0,"line_total":0}],"notes":"","payment_terms":"","requested_scanned_version":false,"stamp_applied":false,"signature_applied":false,"warnings":[],"questions":[]}.
If VAT is unclear use unknown and add a Georgian clarification question.`

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDate(value: string | undefined) {
  if (!value) return isoToday()
  const match = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
  if (!match) return isoToday()
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

function parseNumber(value: string) {
  return Number(value.replace(/\s/g, '').replace(',', '.'))
}

function deterministicParse(prompt: string): InvoiceDraft {
  const compact = prompt.replace(/\r/g, '').trim()
  const dateMatch = compact.match(/(?:თარიღი|date)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i)
  const customerMatch =
    compact.match(/(?:ინვოისი|invoice)\s+(?:გაუკეთე|გამიკეთე|შექმენი|for)?\s*([^\n.]+?)(?:ზე|სთვის|\.|$)/i) ||
    compact.match(/(?:კლიენტი|customer)\s*[:\-]\s*([^\n]+)/i)
  const currency = /\b(?:USD|დოლარ)/i.test(compact) ? 'USD' : /\b(?:EUR|ევრო)/i.test(compact) ? 'EUR' : 'GEL'
  const vatMode = /დღგ[\s-]*(?:ის)?\s*გარეშე|without\s+vat/i.test(compact)
    ? 'without_vat'
    : /დღგ[\s-]*(?:ის)?\s*ჩათვლით|vat\s+included/i.test(compact)
      ? 'vat_included'
      : /დღგ[\s-]*(?:ის)?\s*დამატებით|add\s+vat/i.test(compact)
        ? 'vat_excluded_add_vat'
        : 'unknown'

  const itemLines = compact.split('\n').map((line) => line.trim()).filter(Boolean)
  const items: InvoiceDraftItem[] = []
  for (const line of itemLines) {
    if (/ინვოის|თარიღ|დღგ|შენიშვნ|payment|customer/i.test(line)) continue
    const match = line.match(/^(.+?)\s*(?:—|-|:)?\s*(\d+(?:[.,]\d+)?)\s*(ცალი|ანაწყობი|კომპლექტი|პაკეტი|ერთეული|pcs?|sets?)?[\s,;]*(?:თითო\s*)?(\d+(?:[.,]\d+)?)\s*(ლარი|₾|GEL|USD|EUR|დოლარი|ევრო)?/i)
    if (!match) continue
    const name = match[1].replace(/[—\-:,;]+$/, '').trim()
    const quantity = parseNumber(match[2])
    const unitPrice = parseNumber(match[4])
    if (!name || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) continue
    items.push({
      product_query: name,
      product_name: name,
      description: '',
      product_code: null,
      unit: match[3] || 'ცალი',
      quantity,
      unit_price: unitPrice,
      discount: 0,
      line_total: 0,
    })
  }

  const customer = customerMatch?.[1]?.replace(/^(გთხოვ[,\s]*)/i, '').trim() || 'დასაზუსტებელი კლიენტი'
  const questions: string[] = []
  if (vatMode === 'unknown') questions.push('აირჩიეთ დღგ-ის რეჟიმი: დღგ-ის გარეშე, დღგ-ის ჩათვლით თუ დღგ-ის დამატებით?')
  if (!customerMatch) questions.push('რომელი კლიენტისთვის იქმნება ინვოისი?')
  if (!items.length) questions.push('მიუთითეთ მინიმუმ ერთი პროდუქტი, რაოდენობა და ფასი.')

  return invoiceDraftSchema.parse({
    customer_query: customer,
    customer_name: customer,
    invoice_date: normalizeDate(dateMatch?.[1]),
    currency,
    vat_mode: vatMode,
    items: items.length ? items : [{
      product_query: 'დასაზუსტებელი პროდუქტი',
      product_name: 'დასაზუსტებელი პროდუქტი',
      unit: 'ცალი',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
    }],
    requested_scanned_version: /დასკანერებული|scan/i.test(compact),
    stamp_applied: /დაამატე\s+ბეჭედი|ბეჭდით/i.test(compact),
    signature_applied: /ხელმოწერ/i.test(compact),
    warnings: items.length ? [] : ['პროდუქტის პოზიციები ავტომატურად ვერ ამოიცნო.'],
    questions,
  })
}

async function providerParse(prompt: string): Promise<InvoiceDraft | null> {
  const apiUrl = process.env.AI_API_URL?.trim() || process.env.OPENAI_API_URL?.trim() || 'https://api.openai.com/v1/chat/completions'
  const apiKey = process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  const model = process.env.AI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim()
  if (!apiUrl || !apiKey || !model) return null
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt.slice(0, 20_000) },
      ],
    }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`)
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI provider returned an invalid response.')
  return invoiceDraftSchema.parse(JSON.parse(content))
}

export async function parseInvoiceImage(
  dataUrl: string,
  client: SupabaseClient,
  instruction = 'ამოიცანი ამ დოკუმენტიდან ინვოისის მონახაზისთვის საჭირო ყველა ხილული მონაცემი.',
) {
  const apiUrl = process.env.AI_API_URL?.trim() || process.env.OPENAI_API_URL?.trim() || 'https://api.openai.com/v1/chat/completions'
  const apiKey = process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  const model = process.env.AI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim()
  if (!apiUrl || !apiKey || !model) {
    throw new Error('სურათის OCR-ს სჭირდება AI_API_URL, AI_API_KEY და AI_MODEL.')
  }
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: [{ type: 'text', text: instruction }, { type: 'image_url', image_url: { url: dataUrl } }] },
      ],
    }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`OCR provider returned HTTP ${response.status}.`)
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('OCR provider returned an invalid response.')
  const draft = invoiceDraftSchema.parse(JSON.parse(content))
  const enriched = await enrichInvoiceDraft(draft, client)
  const totals = enriched.vat_mode === 'unknown' ? null : calculateInvoice(enriched.items, enriched.vat_mode)
  if (totals) enriched.items = totals.items
  return { draft: enriched, totals }
}

function safeSearchTerm(value: string) {
  return value.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export async function enrichInvoiceDraft(draft: InvoiceDraft, client: SupabaseClient): Promise<InvoiceDraft> {
  const warnings = [...draft.warnings]
  const questions = [...draft.questions]
  const customerTerm = safeSearchTerm(draft.customer_query)
  if (customerTerm) {
    const { data: customers } = await client
      .from('erp_parties')
      .select('id, name, tax_id, address, email, phone')
      .in('party_type', ['customer', 'both'])
      .ilike('name', `%${customerTerm}%`)
      .limit(5)
    if (customers?.length === 1) {
      const customer = customers[0]
      draft.customer_id = customer.id
      draft.customer_name = customer.name
      draft.customer_tax_id = customer.tax_id || ''
      draft.customer_address = customer.address || ''
      draft.customer_email = customer.email || ''
      draft.customer_phone = customer.phone || ''
    } else if ((customers?.length || 0) > 1) {
      questions.push(`ნაპოვნია რამდენიმე მსგავსი კლიენტი (${customers!.map((item) => item.name).join(', ')}). აირჩიეთ სწორი.`)
    } else {
      warnings.push(`CRM-ში კლიენტი „${draft.customer_query}“ ვერ მოიძებნა.`)
    }
  }

  for (const item of draft.items) {
    const term = safeSearchTerm(item.product_query)
    if (!term) continue
    const { data: products } = await client
      .from('products')
      .select('id, slug, name, prices(price_gel)')
      .ilike('name', `%${term}%`)
      .limit(5)
    if (products?.length === 1) {
      const product = products[0]
      item.product_id = product.id
      item.product_name = product.name
      item.product_code = product.slug || item.product_code
      const standardPrice = Number((product.prices as Array<{ price_gel?: number }> | null)?.[0]?.price_gel || 0)
      item.standard_price = standardPrice || null
      if (standardPrice && Math.abs(standardPrice - item.unit_price) >= 0.01) {
        item.match_warning = `მითითებული ფასი ${item.unit_price} განსხვავდება სტანდარტული ფასისგან ${standardPrice}.`
        warnings.push(`${product.name}: ${item.match_warning}`)
      }
    } else if ((products?.length || 0) > 1) {
      item.match_warning = 'ნაპოვნია რამდენიმე მსგავსი პროდუქტი; საჭიროა არჩევა.'
      questions.push(`აირჩიეთ „${item.product_query}“-ის შესაბამისი პროდუქტი.`)
    } else {
      item.match_warning = 'პროდუქტი ბაზაში ვერ მოიძებნა; პოზიცია დარჩა თავისუფალ ტექსტად.'
      warnings.push(`პროდუქტი „${item.product_query}“ ბაზაში ვერ მოიძებნა.`)
    }
  }
  return invoiceDraftSchema.parse({ ...draft, warnings: [...new Set(warnings)], questions: [...new Set(questions)] })
}

export async function parseInvoicePrompt(prompt: string, client: SupabaseClient) {
  const cleanPrompt = prompt.trim()
  if (cleanPrompt.length < 10 || cleanPrompt.length > 20_000) throw new Error('Prompt must contain 10–20,000 characters.')
  let draft: InvoiceDraft
  try {
    draft = (await providerParse(cleanPrompt)) || deterministicParse(cleanPrompt)
  } catch (error) {
    draft = deterministicParse(cleanPrompt)
    draft.warnings.push(error instanceof Error ? `AI provider: ${error.message} გამოყენებულია უსაფრთხო parser.` : 'გამოყენებულია უსაფრთხო parser.')
  }
  const enriched = await enrichInvoiceDraft(draft, client)
  const computed = enriched.vat_mode === 'unknown' ? null : calculateInvoice(enriched.items, enriched.vat_mode)
  if (computed) enriched.items = computed.items
  return { draft: enriched, totals: computed }
}
