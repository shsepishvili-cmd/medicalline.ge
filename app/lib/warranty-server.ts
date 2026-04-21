import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { buildWarrantyVerifyUrl, formatDate, WARRANTY_STATUS_LABELS } from './warranty'
import type { WarrantyRecord } from './warranty-types'
// Fonts and images embedded as base64 — bundled with the Vercel serverless function.
// public/ is NOT accessible at runtime in serverless environments.
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'
import { ML_LOGO_BASE64, INVOICE_STAMP_BASE64 } from './warranty-assets-data'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Formal warranty document PDF — A4 portrait
// ---------------------------------------------------------------------------

export async function generateWarrantyPdfBuffer(warranty: WarrantyRecord, origin?: string | null) {
  const baseUrl = getAppBaseUrl(origin)
  const verifyUrl = buildWarrantyVerifyUrl(baseUrl, warranty.verify_token)

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 160,
    margin: 1,
    color: { dark: '#0b3f34', light: '#ffffff' },
  })

  const pdf = new jsPDF('p', 'mm', 'a4')
  registerPdfFont(pdf)

  const pageW = 210
  const pageH = 297
  const ml = 18  // margin left
  const mr = 18  // margin right
  const uw = pageW - ml - mr  // usable width: 174 mm
  let y = 0

  // ── 1. Header bar ──────────────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.rect(0, 0, pageW, 36, 'F')

  // Logo
  try {
    pdf.addImage(ML_LOGO_BASE64, 'PNG', ml, 4, 28, 28)
  } catch {
    // logo failed to render — skip silently
  }

  // Company name block
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(255, 255, 255)
  pdf.text('Medical Line Georgia', ml + 32, 15)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(180, 230, 210)
  pdf.text('შ.პ.ს „მედიქალ ლაინ ჯორჯია"  ·  medicalline.ge  ·  514 011 116', ml + 32, 22)
  pdf.text('ს/ნ: 405526831  ·  მისამართი: თბილისი, საქართველო', ml + 32, 28)

  // Document type label (top right)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(200, 240, 220)
  pdf.text('საგარანტიო პირობები', pageW - mr, 18, { align: 'right' })
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(160, 215, 195)
  pdf.text(`# ${warranty.warranty_number}`, pageW - mr, 25, { align: 'right' })

  y = 44

  // ── 2. Document title ──────────────────────────────────────────────────────
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(17)
  pdf.setTextColor(8, 80, 65)
  pdf.text('საგარანტიო პირობები', pageW / 2, y, { align: 'center' })

  y += 7

  // Thin decorative rule
  pdf.setDrawColor(8, 80, 65)
  pdf.setLineWidth(0.5)
  pdf.line(ml, y, pageW - mr, y)

  y += 6

  // ── 3. Two-column meta row ─────────────────────────────────────────────────
  const colW = uw / 2 - 4

  function metaItem(label: string, value: string, x: number, rowY: number) {
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(90, 100, 115)
    pdf.text(label, x, rowY)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(9.5)
    pdf.setTextColor(20, 28, 40)
    pdf.text(value, x, rowY + 5)
  }

  const extWarranty = warranty as WarrantyRecord & { generated_at?: string | null; terms_version?: string | null }
  const docDateStr = extWarranty.generated_at
    ? formatDate(extWarranty.generated_at)
    : formatDate(new Date().toISOString().slice(0, 10))

  metaItem('დოკუმენტის ნომერი', warranty.warranty_number, ml, y)
  metaItem('სტატუსი', WARRANTY_STATUS_LABELS[warranty.status] || warranty.status, ml + colW + 8, y)
  y += 14
  metaItem('გენერაციის თარიღი', docDateStr, ml, y)
  metaItem('ინვოისის ნომერი', warranty.invoice_number || '—', ml + colW + 8, y)
  y += 14

  // Light divider
  pdf.setDrawColor(220, 225, 232)
  pdf.setLineWidth(0.3)
  pdf.line(ml, y, pageW - mr, y)
  y += 7

  // ── 4. Dynamic fields table ────────────────────────────────────────────────
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10.5)
  pdf.setTextColor(8, 80, 65)
  pdf.text('პროდუქტი და მხარეები', ml, y)
  y += 7

  const fieldRows: Array<[string, string]> = [
    ['მომწოდებელი', 'შ.პ.ს „მედიქალ ლაინ ჯორჯია"'],
    ['მყიდველი / კლინიკა', warranty.customer_name && warranty.clinic_name
      ? `${warranty.customer_name}  ·  ${warranty.clinic_name}`
      : (warranty.customer_name || warranty.clinic_name || '—')],
    ['პროდუქტი', warranty.product_name],
    ['ბრენდი / მოდელი', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
    ['სერიული ნომერი', warranty.serial_number],
    ['ყიდვის თარიღი', formatDate(warranty.purchase_date)],
    ['ინსტალაციის თარიღი', formatDate(warranty.installation_date)],
    ['გარანტიის ვადა', `${warranty.warranty_months} თვე`],
    ['გარანტიის დაწყება', formatDate(warranty.warranty_start)],
    ['გარანტიის დასრულება', formatDate(warranty.warranty_end)],
    ['გამყიდველი', warranty.sold_by || '—'],
  ]

  const labelColW = 60
  const rowH = 8.5

  fieldRows.forEach(([label, value], i) => {
    const rowY = y + i * rowH

    // Alternating background
    if (i % 2 === 0) {
      pdf.setFillColor(245, 248, 250)
      pdf.roundedRect(ml, rowY - 5.5, uw, rowH, 1.5, 1.5, 'F')
    }

    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(70, 80, 95)
    pdf.text(label, ml + 3, rowY)

    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(9.5)
    pdf.setTextColor(18, 24, 38)

    // Wrap long values
    const maxValueW = uw - labelColW - 6
    const lines: string[] = pdf.splitTextToSize(String(value || '—'), maxValueW)
    pdf.text(lines[0] as string, ml + labelColW, rowY)
  })

  y += fieldRows.length * rowH + 6

  // ── 5. Warranty terms ──────────────────────────────────────────────────────
  // Section heading background
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(ml, y - 1, uw, 10, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text('საგარანტიო პირობები', ml + 4, y + 6)
  y += 14

  const termsVersion = extWarranty.terms_version || '1.0'

  const clauses: string[] = [
    'მომწოდებელი ადასტურებს, რომ ზემოაღნიშნული პროდუქტი გარანტიის ფარგლებში ექვემდებარება მომსახურებას მხოლოდ ქარხნული დეფექტის გამოვლენის შემთხვევაში.',
    'გარანტია არ ვრცელდება მექანიკურ დაზიანებაზე, არასწორ ექსპლუატაციაზე, ელექტრო კვების დარღვევით გამოწვეულ დაზიანებაზე, სითხის მოხვედრაზე, ბუნებრივ ცვეთაზე, სახარჯ მასალებზე, მესამე პირის მიერ განხორციელებულ შეკეთებაზე ან კონსტრუქციაში ჩარევაზე.',
    'საგარანტიო შემთხვევის არსებობა დგინდება მომწოდებლის ან მომწოდებლის მიერ განსაზღვრული ტექნიკური სპეციალისტის/სერვისის დიაგნოსტიკის საფუძველზე.',
    'მომწოდებელი უფლებამოსილია კონკრეტული შემთხვევის მიხედვით მიიღოს გადაწყვეტილება შეკეთების, ნაწილის შეცვლის, მოწყობილობის შეცვლის ან არასაგარანტიო მომსახურების შეთავაზების შესახებ.',
    'გარანტიული მომსახურების მოთხოვნისას მყიდველი ვალდებულია წარმოადგინოს პროდუქტის იდენტიფიკაციის მონაცემები, შეძენის დამადასტურებელი დოკუმენტი და დაზიანების აღწერა/ფოტო/ვიდეო მასალა, მოთხოვნის შემთხვევაში.',
    'თუ მოწყობილობაზე აღმოჩნდება უნებართვო გახსნა, ცვლილება, სერიული ნომრის დაზიანება ან გამოყენების წესების დარღვევა, გარანტია წყდება.',
    'ტრანსპორტირების, დემონტაჟის, მონტაჟის ან ადგილზე ვიზიტის ხარჯები განისაზღვრება მომწოდებლის მოქმედი წესებითა და კონკრეტული შემთხვევის გარემოებებით.',
    'წინამდებარე საგარანტიო პირობები წარმოადგენს პროდუქტის რეალიზაციასთან დაკავშირებული დოკუმენტაციის განუყოფელ ნაწილს.',
  ]

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.8)
  pdf.setTextColor(25, 32, 44)

  clauses.forEach((clause, i) => {
    const prefix = `${i + 1}.  `
    const lines: string[] = pdf.splitTextToSize(prefix + clause, uw - 4)
    const blockH = lines.length * 5 + 3

    if (y + blockH > pageH - 54) return  // graceful clip if page is full

    pdf.text(lines, ml + 2, y)
    y += blockH
  })

  y += 4

  // ── 6. Terms version footnote ──────────────────────────────────────────────
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(140, 148, 160)
  pdf.text(`პირობების ვერსია: ${termsVersion}  ·  ვერიფიკაცია: ${verifyUrl}`, ml, y, { maxWidth: uw })
  y += 7

  // ── 7. Signature / stamp section ───────────────────────────────────────────
  const sigY = Math.max(y + 4, pageH - 46)

  pdf.setDrawColor(200, 208, 218)
  pdf.setLineWidth(0.3)
  pdf.line(ml, sigY, pageW - mr, sigY)

  const sigBlockW = (uw - 10) / 2

  // Left: Supplier block
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 50, 65)
  pdf.text('მომწოდებელი', ml, sigY + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text('შ.პ.ს „მედიქალ ლაინ ჯორჯია"', ml, sigY + 13)

  // Stamp image
  try {
    pdf.addImage(INVOICE_STAMP_BASE64, 'JPEG', ml, sigY + 15, 32, 22)
  } catch {
    pdf.setDrawColor(8, 80, 65)
    pdf.setLineWidth(0.5)
    pdf.circle(ml + 16, sigY + 26, 11)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(6)
    pdf.setTextColor(8, 80, 65)
    pdf.text('ბეჭედი', ml + 16, sigY + 27, { align: 'center' })
  }

  // Supplier signature line
  pdf.setDrawColor(8, 80, 65)
  pdf.setLineWidth(0.4)
  pdf.line(ml, sigY + 38, ml + sigBlockW, sigY + 38)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(120, 130, 145)
  pdf.text('ხელმოწერა', ml, sigY + 42)

  // Right: Buyer/clinic block
  const sigRX = ml + sigBlockW + 10
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 50, 65)
  pdf.text('მყიდველი / კლინიკა', sigRX, sigY + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(90, 100, 115)
  pdf.text(warranty.clinic_name || warranty.customer_name || '—', sigRX, sigY + 13)

  // QR code top-right of signature area
  const qrSize = 24
  const qrX = pageW - mr - qrSize
  const qrY = sigY + 3
  try {
    pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(120, 130, 145)
    pdf.text('სკანირებით შეამოწმე', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' })
  } catch {
    // QR render failed — skip
  }

  // Buyer signature line
  pdf.setDrawColor(8, 80, 65)
  pdf.setLineWidth(0.4)
  pdf.line(sigRX, sigY + 38, sigRX + sigBlockW - 10, sigY + 38)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(120, 130, 145)
  pdf.text('ხელმოწერა / ბეჭედი', sigRX, sigY + 42)

  // Footer strip
  pdf.setFillColor(245, 247, 244)
  pdf.rect(0, pageH - 6, pageW, 6, 'F')
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(155, 163, 175)
  pdf.text(
    `Medical Line Georgia  ·  ${warranty.warranty_number}  ·  გენ. ${docDateStr}`,
    pageW / 2,
    pageH - 2,
    { align: 'center' },
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
