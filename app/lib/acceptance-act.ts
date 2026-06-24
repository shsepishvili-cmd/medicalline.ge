import type { ContractRecord } from './contract-types'
import type { ContractAcceptanceActRecord, PublicAcceptanceActSummary } from './acceptance-act-types'
import { normalizePhone } from './contract'

function line(value: string | null | undefined, fallback = '-') {
  return value && value.trim() ? value.trim() : fallback
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ka-GE')
}

export function buildAcceptanceActNumber(contract: Pick<ContractRecord, 'contract_number'>) {
  const suffix = String(contract.contract_number || '').replace(/^CNTR/i, 'ACT')
  return suffix.startsWith('ACT') ? suffix : `ACT-${suffix}`
}

export function buildPublicAcceptanceActUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/contact-hub/acceptance-act/${token}`
}

export function buildAcceptanceActBody(
  contract: Pick<
    ContractRecord,
    | 'contract_number'
    | 'contract_date'
    | 'clinic_name'
    | 'customer_name'
    | 'customer_id_number'
    | 'customer_address'
    | 'product_name'
    | 'brand'
    | 'model'
    | 'serial_number'
    | 'quantity'
    | 'delivery_date'
    | 'delivery_address'
    | 'warranty_months'
  >,
  act: Pick<
    ContractAcceptanceActRecord,
    | 'act_number'
    | 'act_date'
    | 'delivery_address'
    | 'equipment_condition'
    | 'installation_completed'
    | 'training_completed'
    | 'missing_items'
    | 'remarks'
  >,
) {
  const buyer = line(contract.clinic_name || contract.customer_name)
  const model = [contract.brand, contract.model].filter(Boolean).join(' / ')
  const installed = act.installation_completed ? 'შესრულებულია' : 'არ არის მოთხოვნილი / არ არის შესრულებული'
  const trained = act.training_completed ? 'ჩატარებულია' : 'არ არის მოთხოვნილი / არ არის ჩატარებული'

  return [
    `მიღება-ჩაბარების აქტი № ${act.act_number}`,
    `ნასყიდობის ხელშეკრულება № ${contract.contract_number}`,
    `ქ. თბილისი, ${fmtDate(act.act_date)}`,
    '',
    'შპს „მედიქალ ლაინ ჯორჯია“ და ქვემოთ მითითებული შემძენი ადასტურებენ, რომ ხელშეკრულებით გათვალისწინებული აპარატი/საქონელი გადაცემულია და მიღებულია ამ აქტის პირობებით.',
    '',
    '1. შემძენი',
    `შემძენი: ${buyer}`,
    `საიდენტიფიკაციო კოდი / პირადი ნომერი: ${line(contract.customer_id_number)}`,
    `მისამართი: ${line(contract.customer_address)}`,
    '',
    '2. გადაცემული აპარატი',
    `დასახელება: ${line(contract.product_name)}`,
    `ბრენდი / მოდელი: ${line(model)}`,
    `სერიული ნომერი: ${line(contract.serial_number)}`,
    `რაოდენობა: ${contract.quantity || 1}`,
    '',
    '3. მიწოდება და მდგომარეობა',
    `მიწოდების თარიღი: ${fmtDate(contract.delivery_date || act.act_date)}`,
    `მიწოდების მისამართი: ${line(act.delivery_address || contract.delivery_address)}`,
    `მდგომარეობა: ${line(act.equipment_condition, 'აპარატი მიღებულია ვიზუალურად გამართული მდგომარეობით')}`,
    `ინსტალაცია: ${installed}`,
    `პერსონალის პირველადი ინსტრუქტაჟი: ${trained}`,
    `დაკლებული კომპონენტები: ${line(act.missing_items, 'არ ფიქსირდება')}`,
    '',
    '4. გარანტია',
    `გარანტიის ვადა განისაზღვრება ხელშეკრულებით: ${contract.warranty_months || 0} თვე, თუ მხარეები წერილობით სხვაგვარად არ შეთანხმებულან.`,
    '',
    '5. დადასტურება',
    'შემძენი ადასტურებს, რომ მიიღო ზემოაღნიშნული აპარატი/საქონელი, შეამოწმა გარეგნული მდგომარეობა, მიიღო აუცილებელი დოკუმენტაცია/ინფორმაცია და ამ ეტაპზე პრეტენზია არ აქვს, გარდა ამ აქტში პირდაპირ მითითებული შენიშვნებისა.',
    act.remarks ? `შენიშვნა: ${act.remarks}` : 'შენიშვნა: არ ფიქსირდება.',
    '',
    'ეს აქტი წარმოადგენს ნასყიდობის ხელშეკრულების განუყოფელ დანართს და მისი ელექტრონული SMS/OTP დადასტურება ინახება დადასტურების თარიღით, ტელეფონის ნომრით, IP მისამართით და მომხმარებლის მოწყობილობის მონაცემებით.',
  ].join('\n')
}

export function buildAcceptanceActSharePayload(
  baseUrl: string,
  act: Pick<ContractAcceptanceActRecord, 'act_number' | 'public_token'>,
  contract: Pick<ContractRecord, 'contract_number' | 'customer_name' | 'product_name' | 'phone' | 'email'>,
  otpCode: string,
) {
  const publicUrl = buildPublicAcceptanceActUrl(baseUrl, String(act.public_token || ''))
  const whatsappPhone = normalizePhone(contract.phone || '')
  const message = [
    `migeba-chabarebis aqti: ${act.act_number}`,
    `xelshekruleba: ${contract.contract_number}`,
    `produqti: ${contract.product_name}`,
    '',
    'dasadastureblad ixilet bmuli:',
    publicUrl,
    '',
    `dasadasturebeli kodi: ${otpCode}`,
    'akti xelmisawvdomia 5 dgis ganmavlobashi',
  ].join('\n')

  return {
    publicUrl,
    otpCode,
    whatsappUrl: whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : null,
    smsText: message,
    emailSubject: `მიღება-ჩაბარების აქტის დადასტურება · ${act.act_number}`,
    emailBody: [
      `${contract.customer_name || 'კლიენტო'},`,
      '',
      `გიგზავნით მიღება-ჩაბარების აქტს: ${act.act_number}`,
      `ხელშეკრულება: ${contract.contract_number}`,
      `პროდუქტი: ${contract.product_name}`,
      '',
      'დასადასტურებლად გახსენით ბმული:',
      publicUrl,
      '',
      `დადასტურების კოდი: ${otpCode}`,
    ].join('\n'),
  }
}

export function mapPublicAcceptanceActToRecord(summary: PublicAcceptanceActSummary): ContractAcceptanceActRecord {
  return {
    id: summary.id,
    created_at: '',
    updated_at: '',
    contract_id: summary.contract_id,
    act_number: summary.act_number,
    act_date: summary.act_date,
    status: summary.status,
    public_token: summary.public_token,
    otp_code: null,
    otp_expires_at: null,
    otp_verified_at: null,
    sent_at: summary.sent_at,
    viewed_at: summary.viewed_at,
    accepted_at: summary.accepted_at,
    accepted_phone: null,
    accepted_email: null,
    accepted_by: summary.accepted_by,
    accepted_identity_suffix: summary.accepted_identity_suffix,
    acceptance_note: null,
    last_sent_channel: null,
    delivery_address: summary.delivery_address,
    equipment_condition: summary.equipment_condition,
    installation_completed: summary.installation_completed,
    training_completed: summary.training_completed,
    missing_items: summary.missing_items,
    remarks: summary.remarks,
    act_body: summary.act_body,
    document_version: summary.document_version,
    created_by: null,
  }
}
