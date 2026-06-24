import type { ContractRecord, PublicContractSummary } from './contract-types'
import { buildPublicContractUrl, normalizePhone } from './contract'

export function getRequestIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for') || headers.get('x-real-ip') || ''
  return forwarded.split(',')[0]?.trim() || null
}

export function getRequestUserAgent(headers: Headers) {
  return headers.get('user-agent') || null
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function getAppBaseUrl(origin: string) {
  return origin.replace(/\/$/, '')
}

export function buildContractSharePayload(
  baseUrl: string,
  contract: Pick<ContractRecord, 'contract_number' | 'customer_name' | 'product_name' | 'phone' | 'email'> & { public_token: string },
  otpCode: string,
) {
  const publicUrl = buildPublicContractUrl(baseUrl, contract.public_token)
  const customerName = contract.customer_name || 'klienti'
  const whatsappPhone = normalizePhone(contract.phone || '')
  const lines = [
    `xelshekruleba: ${contract.contract_number}`,
    `produqti: ${contract.product_name}`,
    '',
    'xelshekrulebis dasadastureblad ixilet bmuli:',
    publicUrl,
    '',
    `dasadasturebeli kodi: ${otpCode}`,
    'xelshekrulebis gadmowera shesazlebelia 5 dgis ganmavlobashi',
    `madloba, ${customerName}`,
  ]
  const message = lines.join('\n')

  return {
    publicUrl,
    otpCode,
    whatsappUrl: whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : null,
    smsText: message,
    emailSubject: `ხელშეკრულების დადასტურება · ${contract.contract_number}`,
    emailBody: [
      `${contract.customer_name || 'კლიენტო'},`,
      '',
      `გიგზავნით ხელშეკრულებას: ${contract.contract_number}`,
      `პროდუქტი: ${contract.product_name}`,
      '',
      'დასადასტურებლად გახსენით ბმული:',
      publicUrl,
      '',
      `დადასტურების კოდი: ${otpCode}`,
      'დოკუმენტის ჩამოტვირთვა შესაძლებელია 5 დღის განმავლობაში.',
    ].join('\n'),
  }
}

export function mapPublicSummaryToContractRecord(summary: PublicContractSummary): ContractRecord {
  return {
    id: summary.id,
    created_at: '',
    updated_at: '',
    contract_number: summary.contract_number,
    contract_date: summary.contract_date,
    warranty_id: null,
    clinic_name: summary.clinic_name,
    customer_name: summary.customer_name,
    customer_id_number: summary.customer_id_number,
    customer_address: summary.customer_address,
    phone: summary.phone,
    email: summary.email,
    contract_template: summary.contract_template || 'general',
    contract_body: summary.contract_body,
    product_name: summary.product_name,
    brand: summary.brand,
    model: summary.model,
    serial_number: summary.serial_number,
    quantity: summary.quantity,
    unit_price: Number(summary.unit_price || 0),
    currency: summary.currency,
    vat_rate: Number(summary.vat_rate || 0),
    vat_included: summary.vat_included,
    total_amount: Number(summary.total_amount || 0),
    payment_terms: summary.payment_terms,
    delivery_date: summary.delivery_date,
    delivery_address: summary.delivery_address,
    installation_included: summary.installation_included,
    warranty_months: summary.warranty_months,
    special_terms: summary.special_terms,
    status: summary.status,
    pdf_path: summary.pdf_path,
    generated_at: null,
    public_token: summary.public_token,
    document_version: summary.document_version,
    sent_at: summary.sent_at,
    viewed_at: summary.viewed_at,
    accepted_at: summary.accepted_at,
    signed_at: summary.signed_at,
    paid_at: summary.paid_at,
    agreed_to_terms: summary.agreed_to_terms,
    otp_code: null,
    otp_expires_at: null,
    otp_verified_at: null,
    accepted_phone: null,
    accepted_email: null,
    last_sent_channel: null,
    acceptance_note: null,
    notes: null,
    created_by: null,
  }
}
