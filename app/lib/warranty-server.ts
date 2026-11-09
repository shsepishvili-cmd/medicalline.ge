import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { buildWarrantyVerifyUrl, deriveWarrantyStatus, formatDate, WARRANTY_STATUS_LABELS } from './warranty'
import { getWarrantyTerms, HANDOVER_ITEMS } from './warranty-catalog'
import { merchant } from './merchant'
import type { WarrantyRecord } from './warranty-types'
// Fonts and images embedded as base64 — bundled with the Vercel serverless function.
// public/ is NOT accessible at runtime in serverless environments.
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'
import { ML_LOGO_BASE64, INVOICE_STAMP_BASE64 } from './warranty-assets-data'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUPPLIER_LEGAL_NAME = 'შ.პ.ს „მედიქალ ლაინ ჯორჯია"'
const SUPPLIER_TAX_ID = '417893569'

function registerPdfFont(pdf: jsPDF) {
  pdf.addFileToVFS('Sylfaen.ttf', SYLFAEN_FONT_BASE64)
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'normal')
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'bold')
}

export function getAppBaseUrl(explicitOrigin?: string | null) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    explicitOrigin?.trim() ||
    'http://localhost:3000'

  return configured.replace(/\/$/, '')
}

// ---------------------------------------------------------------------------
// Warranty certificate PDF — A4 portrait: card data first, then the full terms
// ---------------------------------------------------------------------------

const NAVY: [number, number, number] = [16, 41, 82]
const RED: [number, number, number] = [215, 44, 71]

export async function generateWarrantyPdfBuffer(warranty: WarrantyRecord, origin?: string | null) {
  const baseUrl = getAppBaseUrl(origin)
  const verifyUrl = buildWarrantyVerifyUrl(baseUrl, warranty.verify_token)

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 160,
    margin: 1,
    color: { dark: '#102952', light: '#ffffff' },
  })

  const pdf = new jsPDF('p', 'mm', 'a4')
  registerPdfFont(pdf)

  const pageW = 210
  const pageH = 297
  const ml = 18
  const mr = 18
  const uw = pageW - ml - mr
  const contentBottom = pageH - 14
  let y = 0

  function ensureSpace(height: number) {
    if (y + height <= contentBottom) return
    pdf.addPage()
    y = 18
  }

  function sectionHeading(title: string) {
    ensureSpace(20)
    pdf.setFillColor(...RED)
    pdf.rect(ml, y - 4, 1, 5.5, 'F')
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...NAVY)
    pdf.text(title, ml + 3.5, y)
    y += 5.5
  }

  function fieldRows(rows: Array<[string, string]>) {
    const labelW = 58
    rows.forEach(([label, value], index) => {
      pdf.setFont('Sylfaen', 'normal')
      pdf.setFontSize(9.2)
      const lines: string[] = pdf.splitTextToSize(String(value || '—'), uw - labelW - 5)
      const height = Math.max(7, lines.length * 4.6 + 2.4)
      ensureSpace(height)
      if (index % 2 === 0) {
        pdf.setFillColor(245, 248, 253)
        pdf.roundedRect(ml, y, uw, height, 1.2, 1.2, 'F')
      }
      pdf.setFontSize(8.6)
      pdf.setTextColor(84, 98, 120)
      pdf.text(label, ml + 3, y + 4.6)
      pdf.setFontSize(9.2)
      pdf.setTextColor(18, 28, 46)
      pdf.text(lines, ml + labelW, y + 4.6)
      y += height
    })
    y += 9
  }

  // ── Header bar ─────────────────────────────────────────────────────────────
  pdf.setFillColor(...NAVY)
  pdf.rect(0, 0, pageW, 34, 'F')
  try {
    pdf.addImage(ML_LOGO_BASE64, 'PNG', ml, 4, 26, 26)
  } catch {
    // logo failed to render — skip silently
  }
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(255, 255, 255)
  pdf.text('Medical Line Georgia', ml + 30, 14)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.6)
  pdf.setTextColor(195, 212, 237)
  pdf.text(`${SUPPLIER_LEGAL_NAME}  ·  ს/კ ${SUPPLIER_TAX_ID}`, ml + 30, 21)
  pdf.text(`${merchant.address}  ·  ${merchant.phone}  ·  medicalline.ge`, ml + 30, 27)

  y = 45

  // ── Title and meta ─────────────────────────────────────────────────────────
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(17)
  pdf.setTextColor(...NAVY)
  pdf.text('საგარანტიო სერტიფიკატი', ml, y)
  y += 3.5
  pdf.setFillColor(...RED)
  pdf.rect(ml, y, 18, 0.9, 'F')
  y += 8

  const docDate = formatDate(warranty.generated_at || new Date().toISOString().slice(0, 10))
  const status = deriveWarrantyStatus(warranty.status, warranty.warranty_start, warranty.warranty_end)
  const metaColumn = 62

  function metaItem(label: string, value: string, x: number, rowY: number) {
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.2)
    pdf.setTextColor(98, 115, 141)
    pdf.text(label, x, rowY)
    pdf.setFontSize(9.6)
    pdf.setTextColor(18, 28, 46)
    pdf.text(value, x, rowY + 5)
  }

  metaItem('სერტიფიკატის ნომერი', warranty.warranty_number, ml, y)
  metaItem('სტატუსი', WARRANTY_STATUS_LABELS[status] || status, ml + metaColumn, y)
  metaItem('გაცემის თარიღი', docDate, ml, y + 12)
  metaItem('ინვოისის ნომერი', warranty.invoice_number || '—', ml + metaColumn, y + 12)

  const qrSize = 24
  try {
    pdf.addImage(qrDataUrl, 'PNG', pageW - mr - qrSize, y - 4, qrSize, qrSize)
    pdf.setFontSize(6.5)
    pdf.setTextColor(120, 130, 145)
    pdf.text('სკანირებით შეამოწმეთ', pageW - mr - qrSize / 2, y + qrSize - 1, { align: 'center' })
  } catch {
    // QR render failed — skip
  }

  y += 28

  // ── Card sections ──────────────────────────────────────────────────────────
  sectionHeading('მყიდველის მონაცემები')
  fieldRows([
    ['მყიდველი / ორგანიზაცია', warranty.clinic_name || warranty.customer_name || '—'],
    ...(warranty.clinic_name && warranty.customer_name ? [['საკონტაქტო პირი', warranty.customer_name] as [string, string]] : []),
    ['საიდენტიფიკაციო ნომერი', warranty.customer_id_number || '—'],
    ['განთავსების მისამართი', warranty.customer_address || '—'],
  ])

  sectionHeading('მოწყობილობის მონაცემები')
  fieldRows([
    ...(warranty.product_category ? [['პროდუქციის კატეგორია', warranty.product_category] as [string, string]] : []),
    ['პროდუქტი', warranty.product_name],
    ['მწარმოებელი / მოდელი', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
    ['სერიული ნომერი (S/N)', warranty.serial_number],
    ['გადაცემის თარიღი', formatDate(warranty.purchase_date)],
    ['მონტაჟის თარიღი', formatDate(warranty.installation_date)],
  ])

  sectionHeading('საგარანტიო ვადა')
  fieldRows([
    ['საგარანტიო ვადა', `${warranty.warranty_months} თვე`],
    ['გარანტიის დაწყება', formatDate(warranty.warranty_start)],
    ['გარანტიის დასრულება', formatDate(warranty.warranty_end)],
    ...(warranty.component_terms ? [['დამატებითი კომპონენტები', warranty.component_terms] as [string, string]] : []),
    ...(warranty.package_notes ? [['კომპლექტაცია და შენიშვნები', warranty.package_notes] as [string, string]] : []),
  ])

  // Older warranties never recorded a handover, so showing four empty boxes on
  // them would wrongly suggest the steps were skipped.
  if (HANDOVER_ITEMS.some((item) => warranty[item.column])) {
    sectionHeading('მიღება-ჩაბარება')
    ensureSpace(16)
    HANDOVER_ITEMS.forEach((item, index) => {
      const x = ml + (index % 2) * (uw / 2)
      const rowY = y + Math.floor(index / 2) * 7
      pdf.setDrawColor(...NAVY)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(x, rowY, 4, 4, 0.6, 0.6)
      if (warranty[item.column]) {
        pdf.setLineWidth(0.6)
        pdf.line(x + 0.9, rowY + 2.1, x + 1.7, rowY + 3.1)
        pdf.line(x + 1.7, rowY + 3.1, x + 3.2, rowY + 1)
      }
      pdf.setFont('Sylfaen', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(18, 28, 46)
      pdf.text(item.label, x + 6, rowY + 3.3)
    })
    y += 16
  }

  // ── Terms — always start on a fresh page, and never drop a clause ──────────
  pdf.addPage()
  y = 20
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(...NAVY)
  pdf.text('საგარანტიო მომსახურების პირობები', ml, y)
  y += 3.5
  pdf.setFillColor(...RED)
  pdf.rect(ml, y, 18, 0.9, 'F')
  y += 8

  getWarrantyTerms(warranty.terms_version).forEach((section, index) => {
    const number = String(index + 1).padStart(2, '0')
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.8)
    const lines: string[] = pdf.splitTextToSize(section.title ? section.text : `${number}.  ${section.text}`, uw)
    const height = lines.length * 4.5 + (section.title ? 5.5 : 0) + 3.5
    ensureSpace(height)
    if (section.title) {
      pdf.setFont('Sylfaen', 'bold')
      pdf.setFontSize(9.6)
      pdf.setTextColor(...NAVY)
      pdf.text(`${number}. ${section.title}`, ml, y)
      y += 5.5
    }
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.8)
    pdf.setTextColor(40, 52, 72)
    pdf.text(lines, ml, y)
    y += lines.length * 4.5 + 3.5
  })

  pdf.setFontSize(8.2)
  pdf.setTextColor(84, 98, 120)
  const validity: string[] = pdf.splitTextToSize(
    'დოკუმენტი მოქმედებს შესაბამისი ხელშეკრულებისა და Medical Line Georgia-ს საგარანტიო პირობების შესაბამისად. კომერციული გარანტია არ ზღუდავს მყიდველის კანონით მინიჭებულ უფლებებს.',
    uw,
  )
  ensureSpace(validity.length * 4 + 10)
  pdf.text(validity, ml, y)
  y += validity.length * 4 + 1
  pdf.setFontSize(7.5)
  pdf.setTextColor(140, 148, 160)
  pdf.text(`პირობების ვერსია: ${warranty.terms_version || '1.0'}  ·  ვერიფიკაცია: ${verifyUrl}`, ml, y + 3, { maxWidth: uw })
  y += 8

  // ── Signatures ─────────────────────────────────────────────────────────────
  const signatureHeight = 46
  ensureSpace(signatureHeight)
  const sigY = Math.max(y + 2, contentBottom - signatureHeight)
  const sigBlockW = (uw - 10) / 2
  const sigRX = ml + sigBlockW + 10

  pdf.setDrawColor(200, 208, 218)
  pdf.setLineWidth(0.3)
  pdf.line(ml, sigY, pageW - mr, sigY)

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...NAVY)
  pdf.text('მომწოდებელი', ml, sigY + 6)
  pdf.text('მყიდველი / ორგანიზაცია', sigRX, sigY + 6)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text(SUPPLIER_LEGAL_NAME, ml, sigY + 11)
  pdf.text(warranty.clinic_name || warranty.customer_name || '—', sigRX, sigY + 11, { maxWidth: sigBlockW })

  try {
    pdf.addImage(INVOICE_STAMP_BASE64, 'JPEG', ml, sigY + 13, 32, 22)
  } catch {
    // stamp failed to render — the signature line below still stands
  }

  pdf.setDrawColor(...NAVY)
  pdf.setLineWidth(0.4)
  pdf.line(ml, sigY + 37, ml + sigBlockW, sigY + 37)
  pdf.line(sigRX, sigY + 37, sigRX + sigBlockW, sigY + 37)
  pdf.setFontSize(7.5)
  pdf.setTextColor(120, 130, 145)
  pdf.text('ხელმოწერა / ბეჭედი', ml, sigY + 41)
  pdf.text('ხელმოწერა / ბეჭედი', sigRX, sigY + 41)

  // ── Footer on every page ───────────────────────────────────────────────────
  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setFillColor(245, 248, 253)
    pdf.rect(0, pageH - 7, pageW, 7, 'F')
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(120, 130, 145)
    pdf.text(`Medical Line Georgia  ·  ${warranty.warranty_number}  ·  S/N ${warranty.serial_number}`, ml, pageH - 2.6)
    pdf.text(`${page} / ${pageCount}`, pageW - mr, pageH - 2.6, { align: 'right' })
  }

  return Buffer.from(pdf.output('arraybuffer'))
}

// ---------------------------------------------------------------------------
// Mini warranty contract PDF — compact one-page, print & sign at point of sale
// ---------------------------------------------------------------------------

export async function generateMiniWarrantyContractBuffer(warranty: WarrantyRecord): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  registerPdfFont(pdf)

  const pageW = 210
  const pageH = 297
  const ml = 16
  const mr = 16
  const uw = pageW - ml - mr
  let y = 0

  // ── Header ──────────────────────────────────────────────────────────────────
  pdf.setFillColor(16, 41, 82)
  pdf.rect(0, 0, pageW, 30, 'F')

  try { pdf.addImage(ML_LOGO_BASE64, 'PNG', ml, 3, 24, 24) } catch { /* skip */ }

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(255, 255, 255)
  pdf.text('Medical Line Georgia', ml + 28, 13)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(195, 212, 237)
  pdf.text(`${SUPPLIER_LEGAL_NAME}  ·  514 011 116  ·  medicalline.ge`, ml + 28, 20)
  pdf.text(`ს/ნ: ${SUPPLIER_TAX_ID}  ·  ${merchant.address}`, ml + 28, 26)

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(214, 226, 250)
  pdf.text(`# ${warranty.warranty_number}`, pageW - mr, 16, { align: 'right' })
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(173, 202, 250)
  pdf.text(formatDate(new Date().toISOString().slice(0, 10)), pageW - mr, 23, { align: 'right' })

  y = 38

  // ── Title ────────────────────────────────────────────────────────────────────
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(16, 41, 82)
  pdf.text('საგარანტიო კონტრაქტი', pageW / 2, y, { align: 'center' })
  y += 6

  pdf.setDrawColor(16, 41, 82)
  pdf.setLineWidth(0.5)
  pdf.line(ml, y, pageW - mr, y)
  y += 7

  // ── Parties ──────────────────────────────────────────────────────────────────
  const halfW = uw / 2 - 3

  // Left box — seller
  pdf.setFillColor(245, 248, 250)
  pdf.roundedRect(ml, y, halfW, 28, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(16, 41, 82)
  pdf.text('მომწოდებელი:', ml + 3, y + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(18, 24, 38)
  pdf.text(SUPPLIER_LEGAL_NAME, ml + 3, y + 14)
  pdf.setTextColor(80, 90, 105)
  pdf.text(`ს/ნ: ${SUPPLIER_TAX_ID}`, ml + 3, y + 20)
  pdf.text('ტელ: 514 011 116', ml + 3, y + 26)

  // Right box — buyer
  const rx = ml + halfW + 6
  pdf.setFillColor(245, 248, 250)
  pdf.roundedRect(rx, y, halfW, 28, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(16, 41, 82)
  pdf.text('მყიდველი / კლინიკა:', rx + 3, y + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(18, 24, 38)
  pdf.text(warranty.customer_name || warranty.clinic_name || '—', rx + 3, y + 14)
  pdf.setTextColor(80, 90, 105)
  const buyerDetails = [
    warranty.clinic_name && warranty.customer_name ? warranty.clinic_name : '',
    warranty.customer_id_number ? `საიდ. კოდი: ${warranty.customer_id_number}` : '',
    warranty.phone ? `ტელ: ${warranty.phone}` : '',
  ].filter(Boolean).slice(0, 2)
  buyerDetails.forEach((detail, index) => {
    pdf.text(detail, rx + 3, y + 20 + index * 6)
  })

  y += 32

  // ── Product table ─────────────────────────────────────────────────────────────
  pdf.setFillColor(16, 41, 82)
  pdf.roundedRect(ml, y, uw, 8, 1.5, 1.5, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(255, 255, 255)
  pdf.text('პროდუქტი და საგარანტიო პირობები', ml + 3, y + 5.5)
  y += 11

  const productRows: Array<[string, string]> = [
    ['პროდუქტი', warranty.product_name],
    ['ბრენდი / მოდელი', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
    ['სერიული ნომერი', warranty.serial_number],
    ['მყიდველის საიდ. კოდი', warranty.customer_id_number || '—'],
    ['მყიდველის მისამართი', warranty.customer_address || '—'],
    ['ყიდვის თარიღი', formatDate(warranty.purchase_date)],
    ['ინსტალაციის თარიღი', formatDate(warranty.installation_date)],
    ['საგარანტიო ვადა', `${warranty.warranty_months} თვე`],
    ['გარანტიის დაწყება', formatDate(warranty.warranty_start)],
    ['გარანტიის დასრულება', formatDate(warranty.warranty_end)],
    ['ინვოისის ნომერი', warranty.invoice_number || '—'],
    ['გამყიდველი', warranty.sold_by || '—'],
  ]

  const labelW = 52
  const rowH = 8

  productRows.forEach(([label, value], i) => {
    const rowY = y + i * rowH
    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 251)
      pdf.roundedRect(ml, rowY - 5, uw, rowH, 1, 1, 'F')
    }
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(70, 80, 95)
    pdf.text(label, ml + 3, rowY)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(18, 24, 38)
    const lines: string[] = pdf.splitTextToSize(String(value || '—'), uw - labelW - 4)
    pdf.text(lines[0] as string, ml + labelW, rowY)
  })

  y += productRows.length * rowH + 6

  // ── Condensed Georgian terms ───────────────────────────────────────────────
  pdf.setFillColor(239, 245, 255)
  pdf.roundedRect(ml, y, uw, 42, 2, 2, 'F')
  pdf.setDrawColor(185, 205, 236)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(ml, y, uw, 42, 2, 2)

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(16, 41, 82)
  pdf.text('საგარანტიო პირობები:', ml + 3, y + 6)

  const miniTerms = [
    '1. გარანტია მოიცავს ქარხნულ წარმოებისეულ დეფექტებს მხოლოდ ნორმალური ექსპლუატაციის პირობებში.',
    '2. გარანტია არ ვრცელდება: მექანიკურ დაზიანებაზე, სითხის მოხვედრაზე, არასწორ ექსპლუატაციაზე, თვითნებურ შეკეთებაზე ან სახარჯ მასალებზე.',
    '3. საგარანტიო შემთხვევის დადასტურება ხდება მომწოდებლის ტექნიკური სპეციალისტის მიერ. მომწოდებელი იღებს გადაწყვეტილებას შეკეთების, შეცვლის ან სხვა ღონისძიების შესახებ.',
    '4. გარანტია უქმდება: სერიული ნომრის დაზიანებისას, უნებართვო გახსნის ან მოდიფიკაციისას.',
    '5. სერვისის მოთხოვნისას წარმოადგინეთ ეს დოკუმენტი, სერიული ნომერი და შეძენის დამადასტურებელი.',
  ]

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.2)
  pdf.setTextColor(25, 35, 45)

  let ty = y + 13
  miniTerms.forEach((term) => {
    const lines: string[] = pdf.splitTextToSize(term, uw - 6)
    pdf.text(lines, ml + 3, ty)
    ty += lines.length * 4.5 + 1.5
  })

  y += 46

  // ── Signature block ───────────────────────────────────────────────────────
  // Keep signatures near bottom, push down if there's room
  const sigY = Math.max(y + 6, pageH - 52)

  pdf.setDrawColor(200, 210, 218)
  pdf.setLineWidth(0.3)
  pdf.line(ml, sigY, pageW - mr, sigY)

  const sbW = (uw - 10) / 2

  // Left — seller
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 50, 65)
  pdf.text('მომწოდებელი', ml, sigY + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text(SUPPLIER_LEGAL_NAME, ml, sigY + 13)

  try {
    pdf.addImage(INVOICE_STAMP_BASE64, 'JPEG', ml, sigY + 14, 26, 18)
  } catch {
    pdf.setDrawColor(16, 41, 82)
    pdf.setLineWidth(0.4)
    pdf.circle(ml + 12, sigY + 23, 8)
  }

  pdf.setDrawColor(16, 41, 82)
  pdf.setLineWidth(0.4)
  pdf.line(ml, sigY + 34, ml + sbW, sigY + 34)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(130, 140, 150)
  pdf.text('ხელმოწერა / ბეჭედი', ml, sigY + 38)

  // Right — buyer
  const srX = ml + sbW + 10
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 50, 65)
  pdf.text('მყიდველი / კლინიკა', srX, sigY + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text(warranty.customer_name || warranty.clinic_name || '—', srX, sigY + 13)

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text('ადგილი ბეჭდისთვის:', srX, sigY + 22)
  pdf.setDrawColor(180, 190, 200)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(srX, sigY + 24, 28, 10, 1, 1)

  pdf.setDrawColor(16, 41, 82)
  pdf.setLineWidth(0.4)
  pdf.line(srX, sigY + 34, srX + sbW - 10, sigY + 34)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(130, 140, 150)
  pdf.text('ხელმოწერა / ბეჭედი', srX, sigY + 38)

  // Date fields
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text('თარიღი: _____ / _____ / _______', ml, sigY + 45)
  pdf.text('თარიღი: _____ / _____ / _______', srX, sigY + 45)

  // Footer
  pdf.setFillColor(245, 248, 253)
  pdf.rect(0, pageH - 6, pageW, 6, 'F')
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(155, 163, 175)
  pdf.text(
    `Medical Line Georgia  ·  ${warranty.warranty_number}  ·  სერია: ${warranty.serial_number}`,
    pageW / 2, pageH - 2, { align: 'center' },
  )

  return Buffer.from(pdf.output('arraybuffer'))
}

// ---------------------------------------------------------------------------
// Storage helpers (unchanged)
// ---------------------------------------------------------------------------

export function buildWarrantyPdfStoragePath(warranty: Pick<WarrantyRecord, 'id' | 'warranty_number'>) {
  return `certificates/${warranty.id}/${warranty.warranty_number}.pdf`
}

export function buildAttachmentStoragePath(kind: 'warranty' | 'service', recordId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `${kind}/${recordId}/${Date.now()}-${safeName}`
}
