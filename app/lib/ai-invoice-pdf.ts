import 'server-only'
import { jsPDF } from 'jspdf'
import sharp from 'sharp'
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'

type PdfInvoice = {
  invoice_number: string
  invoice_date: string
  due_date?: string | null
  customer_name: string
  customer_tax_id?: string | null
  customer_address?: string | null
  currency: string
  vat_mode: string
  subtotal: number
  discount_total: number
  vat_total: number
  grand_total: number
  amount_in_words: string
  payment_terms?: string | null
  notes?: string | null
  stamp_applied: boolean
  signature_applied: boolean
  items: Array<{
    product_name: string
    product_code?: string | null
    unit: string
    quantity: number
    unit_price: number
    discount: number
    line_total: number
  }>
}

type Company = {
  company_name: string
  tax_id: string
  bank_account: string
  address: string
  director: string
}

const labels: Record<string, string> = {
  without_vat: 'საქონლის ღირებულება მითითებულია დღგ-ის გარეშე',
  vat_included: 'ფასი შეიცავს დღგ-ს',
  vat_excluded_add_vat: 'ფასს დამატებული აქვს 18% დღგ',
}

function money(value: number, currency: string) {
  return `${Number(value).toFixed(2)} ${currency}`
}

function escapeXml(value: unknown) {
  return String(value ?? '').replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!)
}

function addSylfaen(pdf: jsPDF) {
  pdf.addFileToVFS('Sylfaen.ttf', SYLFAEN_FONT_BASE64)
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'normal')
  pdf.setFont('Sylfaen')
}

export function generateCleanInvoicePdf(invoice: PdfInvoice, company: Company) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  addSylfaen(pdf)
  const pageWidth = 210
  let y = 18
  pdf.setTextColor('#0b4f42')
  pdf.setFontSize(17)
  pdf.text(company.company_name, 16, y)
  pdf.setFontSize(9)
  pdf.setTextColor('#475569')
  y += 7
  pdf.text(`ს/კ: ${company.tax_id}  •  ${company.address}`, 16, y)
  y += 5
  pdf.text(`ანგარიში: ${company.bank_account}`, 16, y)
  pdf.setDrawColor('#0b4f42')
  pdf.line(16, y + 5, pageWidth - 16, y + 5)
  y += 16
  pdf.setTextColor('#111827')
  pdf.setFontSize(22)
  pdf.text('ინვოისი', 16, y)
  pdf.setFontSize(11)
  pdf.text(invoice.invoice_number, pageWidth - 16, y, { align: 'right' })
  y += 8
  pdf.setFontSize(9)
  pdf.text(`თარიღი: ${invoice.invoice_date}`, 16, y)
  if (invoice.due_date) pdf.text(`გადახდის ვადა: ${invoice.due_date}`, pageWidth - 16, y, { align: 'right' })
  y += 13
  pdf.setFillColor('#f0f7f5')
  pdf.roundedRect(16, y - 7, pageWidth - 32, 27, 2, 2, 'F')
  pdf.setFontSize(9)
  pdf.setTextColor('#64748b')
  pdf.text('მყიდველი', 20, y)
  pdf.setTextColor('#111827')
  pdf.setFontSize(12)
  pdf.text(invoice.customer_name, 20, y + 7)
  pdf.setFontSize(9)
  pdf.text(`ს/კ: ${invoice.customer_tax_id || '—'}`, 20, y + 13)
  pdf.text(invoice.customer_address || '', 72, y + 13)
  y += 29

  const columns = [16, 25, 104, 122, 140, 160, 194]
  pdf.setFillColor('#0b4f42')
  pdf.rect(16, y, 178, 9, 'F')
  pdf.setTextColor('#ffffff')
  pdf.setFontSize(8)
  ;['№', 'პროდუქტი', 'ერთ.', 'რაოდ.', 'ფასი', 'ფასდ.', 'ჯამი'].forEach((title, index) => {
    pdf.text(title, columns[index] + 1.5, y + 6)
  })
  y += 9
  invoice.items.forEach((item, index) => {
    if (y > 262) {
      pdf.addPage()
      addSylfaen(pdf)
      y = 18
    }
    const rowHeight = 11
    pdf.setFillColor(index % 2 ? '#f8fafc' : '#ffffff')
    pdf.rect(16, y, 178, rowHeight, 'F')
    pdf.setTextColor('#111827')
    pdf.setFontSize(8)
    const name = item.product_code ? `${item.product_name} (${item.product_code})` : item.product_name
    pdf.text(String(index + 1), 17.5, y + 7)
    pdf.text(pdf.splitTextToSize(name, 75)[0], 26.5, y + 7)
    pdf.text(item.unit, 105.5, y + 7)
    pdf.text(String(item.quantity), 123.5, y + 7)
    pdf.text(Number(item.unit_price).toFixed(2), 141.5, y + 7)
    pdf.text(Number(item.discount).toFixed(2), 161.5, y + 7)
    pdf.text(Number(item.line_total).toFixed(2), 193, y + 7, { align: 'right' })
    y += rowHeight
  })
  y += 6
  const totals = [
    ['ქვეჯამი', invoice.subtotal],
    ['ფასდაკლება', invoice.discount_total],
    ['დღგ', invoice.vat_total],
    ['საბოლოო თანხა', invoice.grand_total],
  ] as const
  totals.forEach(([label, value], index) => {
    if (index === totals.length - 1) {
      pdf.setFillColor('#0b4f42')
      pdf.roundedRect(119, y - 5, 75, 10, 1.5, 1.5, 'F')
      pdf.setTextColor('#ffffff')
    } else pdf.setTextColor('#334155')
    pdf.setFontSize(index === totals.length - 1 ? 10 : 9)
    pdf.text(label, 122, y + 1)
    pdf.text(money(value, invoice.currency), 191, y + 1, { align: 'right' })
    y += 11
  })
  pdf.setTextColor('#111827')
  pdf.setFontSize(9)
  pdf.text(pdf.splitTextToSize(`სიტყვიერად: ${invoice.amount_in_words}`, 178), 16, y)
  y += 12
  pdf.setTextColor('#0b4f42')
  pdf.text(labels[invoice.vat_mode] || '', 16, y)
  y += 7
  pdf.setTextColor('#475569')
  if (invoice.payment_terms) {
    pdf.text(pdf.splitTextToSize(`გადახდის პირობა: ${invoice.payment_terms}`, 178), 16, y)
    y += 8
  }
  if (invoice.notes) pdf.text(pdf.splitTextToSize(`შენიშვნა: ${invoice.notes}`, 178), 16, y)
  pdf.setTextColor('#111827')
  pdf.text(`დირექტორი: ${company.director}`, 16, 282)
  if (invoice.signature_applied) pdf.text('ხელმოწერა: __________________', 100, 282)
  if (invoice.stamp_applied) {
    pdf.setDrawColor('#9f1239')
    pdf.circle(180, 274, 10)
    pdf.setTextColor('#9f1239')
    pdf.setFontSize(7)
    pdf.text('ბეჭედი', 180, 276, { align: 'center' })
  }
  return Buffer.from(pdf.output('arraybuffer'))
}

export async function generateScannedInvoicePdf(invoice: PdfInvoice, company: Company) {
  const rows = invoice.items.map((item, index) => `
    <tr><td>${index + 1}</td><td>${escapeXml(item.product_name)}</td><td>${escapeXml(item.unit)}</td>
    <td>${item.quantity}</td><td>${item.unit_price.toFixed(2)}</td><td>${item.line_total.toFixed(2)}</td></tr>`).join('')
  const svg = `<svg width="1240" height="1754" xmlns="http://www.w3.org/2000/svg">
    <defs><style>
      @font-face{font-family:Sylfaen;src:url(data:font/ttf;base64,${SYLFAEN_FONT_BASE64})}
      text,tspan{font-family:Sylfaen,sans-serif}.small{font-size:17px}.body{font-size:20px}.title{font-size:34px;font-weight:bold}
    </style><filter id="paper"><feTurbulence baseFrequency=".7" numOctaves="2" seed="7" result="n"/>
    <feBlend in="SourceGraphic" in2="n" mode="multiply"/></filter></defs>
    <rect width="1240" height="1754" fill="#fdfcf8"/><rect width="1240" height="1754" fill="#faf8f0" opacity=".12" filter="url(#paper)"/>
    <g transform="rotate(-0.18 620 877)" fill="#18231f">
      <text x="90" y="100" class="title">${escapeXml(company.company_name)}</text>
      <text x="90" y="137" class="small">ს/კ: ${escapeXml(company.tax_id)} · ${escapeXml(company.address)}</text>
      <line x1="90" y1="160" x2="1150" y2="160" stroke="#28594e" stroke-width="3"/>
      <text x="90" y="225" class="title">ინვოისი</text><text x="900" y="225" class="body">${escapeXml(invoice.invoice_number)}</text>
      <text x="90" y="270" class="body">მყიდველი: ${escapeXml(invoice.customer_name)}</text>
      <text x="90" y="305" class="small">თარიღი: ${escapeXml(invoice.invoice_date)} · ს/კ: ${escapeXml(invoice.customer_tax_id || '—')}</text>
      <foreignObject x="90" y="350" width="1060" height="850"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Sylfaen;font-size:18px;color:#18231f">
        <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#dbe8e3"><th>№</th><th>პროდუქტი</th><th>ერთ.</th><th>რაოდ.</th><th>ფასი</th><th>ჯამი</th></tr></thead>
        <tbody>${rows}</tbody></table></div></foreignObject>
      <text x="750" y="1270" class="body">ქვეჯამი: ${money(invoice.subtotal, invoice.currency)}</text>
      <text x="750" y="1310" class="body">დღგ: ${money(invoice.vat_total, invoice.currency)}</text>
      <text x="750" y="1360" class="title">ჯამი: ${money(invoice.grand_total, invoice.currency)}</text>
      <text x="90" y="1430" class="small">${escapeXml(invoice.amount_in_words)}</text>
      <text x="90" y="1470" class="small">${escapeXml(labels[invoice.vat_mode] || '')}</text>
      <text x="90" y="1640" class="body">დირექტორი: ${escapeXml(company.director)}</text>
    </g></svg>`
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 7 }).blur(0.18).toBuffer()
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  pdf.addImage(png.toString('base64'), 'PNG', 0, 0, 210, 297, undefined, 'FAST')
  return Buffer.from(pdf.output('arraybuffer'))
}
