import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { buildWarrantyVerifyUrl, formatDate, WARRANTY_STATUS_LABELS } from './warranty'
import type { WarrantyRecord } from './warranty-types'

const ACCENT = '#085041'

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
  const pageWidth = 210
  const margin = 18
  const usableWidth = pageWidth - margin * 2

  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(margin, 16, usableWidth, 24, 5, 5, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Medical Line Georgia', margin + 6, 26)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Warranty Certificate', margin + 6, 33)

  pdf.setTextColor(17, 24, 39)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('Warranty Summary', margin, 54)

  const rows: Array<[string, string]> = [
    ['Warranty #', warranty.warranty_number],
    ['Status', WARRANTY_STATUS_LABELS[warranty.status] || warranty.status],
    ['Clinic', warranty.clinic_name || '—'],
    ['Customer', warranty.customer_name || '—'],
    ['Product', warranty.product_name],
    ['Brand / Model', `${warranty.brand}${warranty.model ? ` / ${warranty.model}` : ''}`],
    ['Serial Number', warranty.serial_number],
    ['Purchase Date', formatDate(warranty.purchase_date)],
    ['Installation Date', formatDate(warranty.installation_date)],
    ['Warranty Start', formatDate(warranty.warranty_start)],
    ['Warranty End', formatDate(warranty.warranty_end)],
    ['Invoice #', warranty.invoice_number || '—'],
    ['Sold By', warranty.sold_by || '—'],
  ]

  let y = 62
  rows.forEach(([label, value], index) => {
    const shaded = index % 2 === 0
    if (shaded) {
      pdf.setFillColor(247, 248, 250)
      pdf.roundedRect(margin, y - 5.5, usableWidth - 42, 9, 2, 2, 'F')
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(label, margin + 4, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, margin + 48, y)
    y += 9
  })

  pdf.setFillColor(245, 247, 240)
  pdf.roundedRect(margin, y + 4, usableWidth, 28, 4, 4, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('Terms', margin + 4, y + 12)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.text(
    'Warranty coverage applies only to verified purchases, original serial numbers, and approved service history. Mechanical damage, unauthorized repair, and misuse may void coverage.',
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
  pdf.text('Scan to verify', qrBoxX + 21, qrBoxY + 42, { align: 'center' })
  pdf.text('medicalline.ge', qrBoxX + 21, qrBoxY + 47, { align: 'center' })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(11, 63, 52)
  pdf.text('Authorized by Medical Line Georgia', margin, 258)
  pdf.setDrawColor(8, 80, 65)
  pdf.line(margin, 268, 90, 268)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('Signature / stamp', margin, 273)

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
