import fs from 'fs'
import path from 'path'
import { jsPDF } from 'jspdf'
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'

type InvoiceActPdfInput = {
  act_number: string
  act_date: string
  invoice_number: string
  invoice_date: string
  delivery_date?: string | null
  customer_name: string
  customer_tax_id?: string | null
  customer_address?: string | null
  notes?: string | null
  accepted_at?: string | null
  accepted_by?: string | null
  items: Array<{ product_name: string; product_code?: string | null; unit: string; quantity: number }>
}

type CompanySettings = {
  company_name: string
  tax_id: string
  address: string
  director: string
}

const stampPath = path.join(process.cwd(), 'public', 'images', 'invoice-stamp.jpg')

function addFont(pdf: jsPDF) {
  pdf.addFileToVFS('Sylfaen.ttf', SYLFAEN_FONT_BASE64)
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'normal')
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'bold')
  pdf.setFont('Sylfaen', 'normal')
}

function date(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ka-GE')
}

export function generateInvoiceAcceptanceActPdf(input: InvoiceActPdfInput, company: CompanySettings) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  addFont(pdf)
  const pageW = 210
  const pageH = 297
  const left = 16
  const right = 16
  const width = pageW - left - right
  const navy: [number, number, number] = [7, 83, 68]
  const text: [number, number, number] = [17, 24, 39]
  const muted: [number, number, number] = [100, 116, 139]
  let y = 17

  const footer = () => {
    pdf.setDrawColor(226, 232, 240)
    pdf.line(left, pageH - 12, pageW - right, pageH - 12)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...muted)
    pdf.text(`${input.act_number} · Medical Line Georgia · ${pdf.getCurrentPageInfo().pageNumber}`, pageW / 2, pageH - 7, { align: 'center' })
  }

  const header = (continued = false) => {
    if (continued) {
      footer()
      pdf.addPage()
      addFont(pdf)
    }
    y = 17
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(...navy)
    pdf.text(company.company_name, left, y)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...muted)
    pdf.text(`ს/კ: ${company.tax_id} · ${company.address}`, left, y + 6)
    pdf.text(input.act_number, pageW - right, y, { align: 'right' })
    pdf.text(date(input.act_date), pageW - right, y + 6, { align: 'right' })
    pdf.setDrawColor(...navy)
    pdf.line(left, y + 10, pageW - right, y + 10)
    y += 20
  }

  const ensure = (height: number) => {
    if (y + height > pageH - 24) header(true)
  }

  header()
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(...text)
  pdf.text('მიღება-ჩაბარების აქტი', pageW / 2, y, { align: 'center' })
  y += 8
  pdf.setFontSize(9.5)
  pdf.setTextColor(...muted)
  pdf.text(`ინვოისი: ${input.invoice_number} · ${date(input.invoice_date)}`, pageW / 2, y, { align: 'center' })
  y += 12

  pdf.setFillColor(244, 248, 247)
  pdf.roundedRect(left, y, width, 34, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...navy)
  pdf.text('გამყიდველი / ჩამბარებელი', left + 4, y + 7)
  pdf.text('მყიდველი / მიმღები', left + 94, y + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...text)
  pdf.text(company.company_name, left + 4, y + 14)
  pdf.text(`ს/კ: ${company.tax_id}`, left + 4, y + 20)
  pdf.text(company.director, left + 4, y + 26)
  pdf.text(pdf.splitTextToSize(input.customer_name || '-', 78).slice(0, 2), left + 94, y + 14)
  pdf.text(`ს/კ: ${input.customer_tax_id || '-'}`, left + 94, y + 23)
  pdf.text(pdf.splitTextToSize(input.customer_address || '-', 78).slice(0, 2), left + 94, y + 29)
  y += 42

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9.5)
  const intro = `წინამდებარე აქტით მხარეები ადასტურებენ, რომ ინვოისით ${input.invoice_number} გათვალისწინებული ქვემოთ ჩამოთვლილი საქონელი გამყიდველმა გადასცა, ხოლო მყიდველმა მიიღო შეთანხმებულ მდგომარეობაში.`
  const introLines = pdf.splitTextToSize(intro, width) as string[]
  pdf.text(introLines, left, y)
  y += introLines.length * 5.2 + 7

  const tableHeader = () => {
    pdf.setFillColor(...navy)
    pdf.rect(left, y, width, 9, 'F')
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(255, 255, 255)
    pdf.text('№', left + 3, y + 6)
    pdf.text('დასახელება', left + 13, y + 6)
    pdf.text('კოდი', left + 119, y + 6)
    pdf.text('ერთ.', left + 142, y + 6)
    pdf.text('რაოდენობა', pageW - right - 3, y + 6, { align: 'right' })
    y += 9
  }
  tableHeader()

  input.items.forEach((item, index) => {
    const nameLines = pdf.splitTextToSize(item.product_name, 99) as string[]
    const rowH = Math.max(10, nameLines.length * 4.6 + 4)
    if (y + rowH > pageH - 24) {
      header(true)
      tableHeader()
    }
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252)
      pdf.rect(left, y, width, rowH, 'F')
    }
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.3)
    pdf.setTextColor(...text)
    pdf.text(String(index + 1), left + 3, y + 6)
    pdf.text(nameLines, left + 13, y + 6)
    pdf.text(String(item.product_code || '-').slice(0, 18), left + 119, y + 6)
    pdf.text(item.unit || 'ცალი', left + 142, y + 6)
    pdf.text(String(item.quantity), pageW - right - 3, y + 6, { align: 'right' })
    y += rowH
  })

  ensure(46)
  y += 8
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9.2)
  pdf.setTextColor(...text)
  pdf.text(`მიწოდების თარიღი: ${date(input.delivery_date || input.act_date)}`, left, y)
  y += 6
  pdf.text('მიმღები ადასტურებს, რომ საქონლის დასახელება და რაოდენობა შეამოწმა და მიღების მომენტში პრეტენზია არ აქვს, გარდა აქტში პირდაპირ მითითებული შენიშვნისა.', left, y, { maxWidth: width })
  y += 14
  if (input.notes) {
    const noteLines = pdf.splitTextToSize(`შენიშვნა: ${input.notes}`, width) as string[]
    pdf.text(noteLines, left, y)
    y += noteLines.length * 5 + 4
  }

  ensure(48)
  y = Math.max(y + 8, 230)
  pdf.setDrawColor(203, 213, 225)
  pdf.line(left, y, pageW - right, y)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...navy)
  pdf.text('ჩამბარებელი', left, y + 8)
  pdf.text('მიმღები', left + 100, y + 8)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setTextColor(...muted)
  pdf.text(company.director, left, y + 15)
  pdf.text(input.accepted_by || 'OTP დადასტურება', left + 100, y + 15)
  pdf.line(left, y + 31, left + 70, y + 31)
  pdf.line(left + 100, y + 31, pageW - right, y + 31)
  pdf.setFontSize(7.5)
  pdf.text('ხელმოწერა / ბეჭედი', left, y + 35)
  pdf.text(input.accepted_at ? `OTP-ით დადასტურებულია: ${date(input.accepted_at)}` : 'სახელი, გვარი / OTP დადასტურება', left + 100, y + 35)

  if (fs.existsSync(stampPath)) {
    const stamp = fs.readFileSync(stampPath).toString('base64')
    pdf.addImage(stamp, 'JPEG', left + 46, y + 7, 35, 35, undefined, 'FAST')
  }
  footer()
  return Buffer.from(pdf.output('arraybuffer'))
}
