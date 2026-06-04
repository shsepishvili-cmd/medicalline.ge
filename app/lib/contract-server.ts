import { jsPDF } from 'jspdf'
import { formatCurrency, calcVatAmount } from './contract'
import {
  buildContractIntro,
  buildStandardContractSections,
  contractInputFromRecord,
  getProductLabel,
  SELLER_INFO,
} from './contract-template'
import type { ContractRecord } from './contract-types'
import { CONTRACT_STATUS_LABELS } from './contract-types'
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'
import { ML_LOGO_BASE64 } from './warranty-assets-data'

function registerFont(pdf: jsPDF) {
  pdf.addFileToVFS('Sylfaen.ttf', SYLFAEN_FONT_BASE64)
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'normal')
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'bold')
}

function geo(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ka-GE')
}

export async function generateContractPdfBuffer(contract: ContractRecord): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  registerFont(pdf)

  const pageW = 210
  const pageH = 297
  const ml = 18
  const mr = 18
  const top = 18
  const bottom = 20
  const uw = pageW - ml - mr
  const navy: [number, number, number] = [15, 23, 42]
  const text: [number, number, number] = [31, 41, 55]
  const muted: [number, number, number] = [100, 116, 139]
  const soft: [number, number, number] = [248, 250, 252]
  let y = top

  const fin = calcVatAmount(
    contract.unit_price,
    contract.quantity,
    contract.vat_rate,
    contract.vat_included,
  )
  const templateInput = contractInputFromRecord(contract)
  const templateSections = buildStandardContractSections(templateInput)

  function footer() {
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.25)
    pdf.line(ml, pageH - 10, pageW - mr, pageH - 10)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...muted)
    pdf.text(`Medical Line Georgia · ${contract.contract_number} · ${geo(contract.contract_date)}`, pageW / 2, pageH - 6, { align: 'center' })
  }

  function startPage(continuationTitle?: string) {
    if (pdf.getNumberOfPages() > 0) {
      footer()
      pdf.addPage()
    }
    y = top

    try {
      pdf.addImage(ML_LOGO_BASE64, 'PNG', ml, y - 2, 18, 18)
    } catch {
      // no-op
    }

    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(12.5)
    pdf.setTextColor(...navy)
    pdf.text('Medical Line Georgia', ml + 22, y + 5)

    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...muted)
    pdf.text('ნასყიდობის, მიწოდებისა და ინსტალაციის ხელშეკრულება', ml + 22, y + 10)
    pdf.text(`No. ${contract.contract_number}`, pageW - mr, y + 5, { align: 'right' })
    pdf.text(geo(contract.contract_date), pageW - mr, y + 10, { align: 'right' })

    y += 22

    if (continuationTitle) {
      drawSectionTitle(continuationTitle)
    }
  }

  function ensureSpace(space: number, continuationTitle?: string) {
    if (y + space > pageH - bottom - 12) {
      startPage(continuationTitle)
    }
  }

  function drawSectionTitle(title: string) {
    ensureSpace(14)
    pdf.setFillColor(...navy)
    pdf.roundedRect(ml, y, uw, 9, 2, 2, 'F')
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(255, 255, 255)
    pdf.text(title, ml + 4, y + 5.8)
    y += 13
  }

  function drawLabelValueRows(rows: Array<[string, string]>) {
    rows.forEach(([label, value], index) => {
      const valueLines = pdf.splitTextToSize(value, uw - 62) as string[]
      const rowH = Math.max(10, valueLines.length * 5.3 + 2)
      ensureSpace(rowH + 2)

      if (index % 2 === 0) {
        pdf.setFillColor(...soft)
        pdf.roundedRect(ml, y - 1, uw, rowH, 1.5, 1.5, 'F')
      }

      pdf.setFont('Sylfaen', 'bold')
      pdf.setFontSize(9.3)
      pdf.setTextColor(...muted)
      pdf.text(label, ml + 3, y + 5)

      pdf.setFont('Sylfaen', 'normal')
      pdf.setFontSize(9.8)
      pdf.setTextColor(...text)
      pdf.text(valueLines, ml + 58, y + 5)

      y += rowH + 1.5
    })
  }

  function drawClauseList(clauses: string[], continuationTitle: string) {
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(10.2)
    pdf.setTextColor(...text)

    clauses.forEach((clause, index) => {
      const lines = pdf.splitTextToSize(`${index + 1}. ${clause}`, uw - 4) as string[]
      const blockH = lines.length * 6 + 2
      ensureSpace(blockH + 2, continuationTitle)
      pdf.text(lines, ml + 2, y)
      y += blockH
    })
  }

  startPage()

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(...navy)
  pdf.text('ხელშეკრულება', pageW / 2, y, { align: 'center' })
  y += 6
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...muted)
  pdf.text('საქონლის/მოწყობილობის მიწოდებისა და დადასტურების დოკუმენტი', pageW / 2, y, { align: 'center' })
  y += 8

  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.35)
  pdf.line(ml, y, pageW - mr, y)
  y += 8

  drawSectionTitle('I. მხარეები')

  const leftX = ml
  const boxGap = 8
  const boxW = (uw - boxGap) / 2
  const boxH = 36

  pdf.setFillColor(...soft)
  pdf.roundedRect(leftX, y, boxW, boxH, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...navy)
  pdf.text('მომწოდებელი', leftX + 4, y + 6)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9.2)
  pdf.setTextColor(...text)
  pdf.text(SELLER_INFO.name, leftX + 4, y + 13)
  pdf.setTextColor(...muted)
  pdf.text('ს/კ: ' + SELLER_INFO.idNumber, leftX + 4, y + 19)
  pdf.text('მისამართი: ' + SELLER_INFO.address, leftX + 4, y + 25)
  pdf.text('ტელ: ' + SELLER_INFO.phone, leftX + 4, y + 31)

  const rightX = leftX + boxW + boxGap
  pdf.setFillColor(...soft)
  pdf.roundedRect(rightX, y, boxW, boxH, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...navy)
  pdf.text('კლიენტი / შემსყიდველი', rightX + 4, y + 6)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9.2)
  pdf.setTextColor(...text)
  pdf.text(contract.customer_name || contract.clinic_name || '-', rightX + 4, y + 13)
  pdf.setTextColor(...muted)
  if (contract.customer_id_number) pdf.text(`პ/ნ: ${contract.customer_id_number}`, rightX + 4, y + 19)
  if (contract.customer_address) {
    const adr = pdf.splitTextToSize(`მისამართი: ${contract.customer_address}`, boxW - 8) as string[]
    pdf.text(adr.slice(0, 2), rightX + 4, y + 25)
  }
  if (contract.phone) pdf.text(`ტელ: ${contract.phone}`, rightX + 4, y + 31)

  y += boxH + 8

  drawSectionTitle('II. ხელშეკრულების საგანი')

  const subject = buildContractIntro(templateInput)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(10.2)
  pdf.setTextColor(...text)
  const subjectLines = pdf.splitTextToSize(subject, uw) as string[]
  pdf.text(subjectLines, ml, y)
  y += subjectLines.length * 5.8 + 5

  ensureSpace(26)
  pdf.setFillColor(...navy)
  pdf.roundedRect(ml, y, uw, 9, 1.5, 1.5, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.7)
  pdf.setTextColor(255, 255, 255)
  pdf.text('პროდუქტი / მოწყობილობა', ml + 3, y + 5.7)
  pdf.text('რაოდ.', ml + 77, y + 5.7)
  pdf.text('ერთ. ფასი', ml + 96, y + 5.7)
  pdf.text('დღგ', ml + 125, y + 5.7)
  pdf.text('ჯამი', ml + 151, y + 5.7)
  y += 11

  pdf.setFillColor(...soft)
  pdf.roundedRect(ml, y, uw, 16, 1.5, 1.5, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9.4)
  pdf.setTextColor(...text)
  const productLabel = getProductLabel(templateInput)
  const productLines = pdf.splitTextToSize(productLabel, 70) as string[]
  pdf.text(productLines.slice(0, 2), ml + 3, y + 5.5)
  pdf.setFont('Sylfaen', 'normal')
  pdf.text(String(contract.quantity), ml + 79, y + 5.5)
  pdf.text(formatCurrency(contract.unit_price, contract.currency), ml + 96, y + 5.5)
  pdf.text(formatCurrency(fin.vat, contract.currency), ml + 125, y + 5.5)
  pdf.text(formatCurrency(fin.gross, contract.currency), ml + 151, y + 5.5)
  if (contract.serial_number) {
    pdf.setFontSize(8.6)
    pdf.setTextColor(...muted)
    pdf.text(`სერიული ნომერი: ${contract.serial_number}`, ml + 3, y + 12)
  }
  y += 20

  drawSectionTitle('III. ფასები და მიწოდება')
  drawLabelValueRows([
    ['ხელშეკრულების სტატუსი', CONTRACT_STATUS_LABELS[contract.status]],
    ['გადახდის პირობები', contract.payment_terms || '100% გადახდა ხელშეკრულების დადასტურების შემდეგ'],
    ['მიწოდების თარიღი', geo(contract.delivery_date)],
    ['მიწოდების მისამართი', contract.delivery_address || contract.customer_address || '-'],
    ['ინსტალაცია', contract.installation_included ? 'შედის ღირებულებაში' : 'არ შედის, საჭიროებს ცალკე შეთანხმებას'],
    ['გარანტია', contract.warranty_months > 0 ? `${contract.warranty_months} თვე` : 'გარანტიის გარეშე'],
    ['სულ გადასახდელი', formatCurrency(fin.gross, contract.currency)],
  ])

  templateSections.forEach((section) => {
    y += 3
    drawSectionTitle(section.title)
    drawClauseList(section.clauses, section.title)
  })

  if (contract.special_terms?.trim()) {
    y += 3
    drawSectionTitle('VI. დამატებითი პირობები')
    const lines = pdf.splitTextToSize(contract.special_terms, uw - 2) as string[]
    ensureSpace(lines.length * 6 + 4, 'VI. დამატებითი პირობები')
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(10.2)
    pdf.setTextColor(...text)
    pdf.text(lines, ml, y)
    y += lines.length * 6 + 2
  }

  ensureSpace(52)
  y = Math.max(y + 8, pageH - 70)
  pdf.setDrawColor(203, 213, 225)
  pdf.line(ml, y, pageW - mr, y)
  y += 8

  const signW = (uw - 12) / 2
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...navy)
  pdf.text('მომწოდებელი', ml, y)
  pdf.text('კლიენტი / შემსყიდველი', ml + signW + 12, y)

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...muted)
  pdf.text('შ.პ.ს "მედიქალ ლაინ ჯორჯია"', ml, y + 7)
  pdf.text(contract.customer_name || contract.clinic_name || '-', ml + signW + 12, y + 7)
  pdf.text('ელექტრონულად გენერირებული დოკუმენტი', ml, y + 14)

  pdf.setDrawColor(...navy)
  pdf.line(ml, y + 27, ml + signW - 8, y + 27)
  pdf.line(ml + signW + 12, y + 27, pageW - mr, y + 27)
  pdf.setFontSize(7.8)
  pdf.text('ხელმოწერა / ბეჭედი', ml, y + 31)
  pdf.text('ხელმოწერა / დადასტურება', ml + signW + 12, y + 31)

  footer()

  return Buffer.from(pdf.output('arraybuffer'))
}

export function buildContractPdfStoragePath(contract: Pick<ContractRecord, 'id' | 'contract_number'>) {
  return `contracts/${contract.id}/${contract.contract_number}.pdf`
}
