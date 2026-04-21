import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { buildWarrantyVerifyUrl, formatDate, WARRANTY_STATUS_LABELS } from './warranty'
import type { WarrantyRecord } from './warranty-types'
// Font embedded as base64 so it's bundled with the Vercel serverless function.
// Generated from public/fonts/sylfaen.ttf — do not import via fs at runtime.
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'

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

export async function generateWarrantyPdfBuffer(warranty: WarrantyRecord, origin?: string | null) {
  const baseUrl = getAppBaseUrl(origin)
  const verifyUrl = buildWarrantyVerifyUrl(baseUrl, warranty.verify_token)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 240,
    margin: 1,
    color: {
      dark: '#0b3f34',
      light: '#ffffff',
    },
  })

  const pdf = new jsPDF('p', 'mm', 'a4')
  registerPdfFont(pdf)
  pdf.setFont('Sylfaen', 'normal')

  const pageWidth = 210
  const margin = 18
  const usableWidth = pageWidth - margin * 2

  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(margin, 16, usableWidth, 24, 5, 5, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(18)
  pdf.text('Medical Line Georgia', margin + 6, 26)
  pdf.setFontSize(11)
  pdf.setFont('Sylfaen', 'normal')
  pdf.text('საგარანტიო სერტიფიკატი', margin + 6, 33)

  pdf.setTextColor(17, 24, 39)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(16)
  pdf.text('გარანტიის შეჯამება', margin, 54)

  const rows: Array<[string, string]> = [
    ['გარანტიის ნომერი', warranty.warranty_number],
    ['სტატუსი', WARRANTY_STATUS_LABELS[warranty.status] || warranty.status],
    ['კლინიკა', warranty.clinic_name || '—'],
    ['მომხმარებელი', warranty.customer_name || '—'],
    ['პროდუქტი', warranty.product_name],
    ['ბრენდი / მოდელი', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
    ['სერიული ნომერი', warranty.serial_number],
    ['ყიდვის თარიღი', formatDate(warranty.purchase_date)],
    ['ინსტალაციის თარიღი', formatDate(warranty.installation_date)],
    ['გარანტიის დაწყება', formatDate(warranty.warranty_start)],
    ['გარანტიის დასრულება', formatDate(warranty.warranty_end)],
    ['ინვოისის ნომერი', warranty.invoice_number || '—'],
    ['გამყიდველი', warranty.sold_by || '—'],
  ]

  let y = 62
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(247, 248, 250)
      pdf.roundedRect(margin, y - 5.5, usableWidth - 42, 9, 2, 2, 'F')
    }

    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(10)
    pdf.text(label, margin + 4, y)
    pdf.setFont('Sylfaen', 'normal')
    pdf.text(String(value), margin + 48, y)
    y += 9
  })

  pdf.setFillColor(245, 247, 240)
  pdf.roundedRect(margin, y + 4, usableWidth, 28, 4, 4, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(11)
  pdf.text('პირობები', margin + 4, y + 12)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9.5)
  pdf.text(
    'გარანტია ვრცელდება მხოლოდ დადასტურებულ შესყიდვაზე, ორიგინალ სერიულ ნომერზე და ავტორიზებულ სერვის ისტორიაზე. მექანიკურმა დაზიანებამ, თვითნებურმა შეკეთებამ ან არასწორმა გამოყენებამ შეიძლება გარანტია გააუქმოს.',
    margin + 4,
    y + 19,
    { maxWidth: usableWidth - 8 },
  )

  const qrBoxX = 150
  const qrBoxY = 48
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(qrBoxX, qrBoxY, 42, 52, 4, 4, 'FD')
  pdf.setDrawColor(214, 219, 229)
  pdf.roundedRect(qrBoxX, qrBoxY, 42, 52, 4, 4)
  pdf.addImage(qrDataUrl, 'PNG', qrBoxX + 4, qrBoxY + 4, 34, 34)
  pdf.setFontSize(8)
  pdf.setTextColor(75, 85, 99)
  pdf.text('სკანირებით შეამოწმე', qrBoxX + 21, qrBoxY + 42, { align: 'center' })
  pdf.text('medicalline.ge', qrBoxX + 21, qrBoxY + 47, { align: 'center' })

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(11, 63, 52)
  pdf.text('დამოწმებულია Medical Line Georgia-ს მიერ', margin, 258)
  pdf.setDrawColor(8, 80, 65)
  pdf.line(margin, 268, 90, 268)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.text('ხელმოწერა / ბეჭედი', margin, 273)

  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(8)
  pdf.text(verifyUrl, margin, 286, { maxWidth: usableWidth })

  return Buffer.from(pdf.output('arraybuffer'))
}

export function buildWarrantyPdfStoragePath(warranty: Pick<WarrantyRecord, 'id' | 'warranty_number'>) {
  return `certificates/${warranty.id}/${warranty.warranty_number}.pdf`
}

export function buildAttachmentStoragePath(kind: 'warranty' | 'service', recordId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `${kind}/${recordId}/${Date.now()}-${safeName}`
}
