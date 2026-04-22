import { jsPDF } from 'jspdf'
import { formatCurrency, calcVatAmount } from './contract'
import type { ContractRecord } from './contract-types'
import { CONTRACT_STATUS_LABELS } from './contract-types'
import { SYLFAEN_FONT_BASE64 } from './warranty-font-data'
import { ML_LOGO_BASE64, INVOICE_STAMP_BASE64 } from './warranty-assets-data'

function registerFont(pdf: jsPDF) {
  pdf.addFileToVFS('Sylfaen.ttf', SYLFAEN_FONT_BASE64)
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'normal')
  pdf.addFont('Sylfaen.ttf', 'Sylfaen', 'bold')
}

function geo(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ka-GE')
}

// ---------------------------------------------------------------------------
// Contract PDF — formal A4 Georgian legal document
// ---------------------------------------------------------------------------

export async function generateContractPdfBuffer(contract: ContractRecord): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  registerFont(pdf)

  const pageW = 210
  const pageH = 297
  const ml = 18
  const mr = 18
  const uw = pageW - ml - mr
  let y = 0

  const fin = calcVatAmount(
    contract.unit_price,
    contract.quantity,
    contract.vat_rate,
    contract.vat_included,
  )

  // ── 1. Header ─────────────────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.rect(0, 0, pageW, 36, 'F')

  try { pdf.addImage(ML_LOGO_BASE64, 'PNG', ml, 4, 28, 28) } catch { /* skip */ }

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(255, 255, 255)
  pdf.text('Medical Line Georgia', ml + 32, 15)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(180, 230, 210)
  pdf.text('შ.პ.ს „მედიქალ ლაინ ჯორჯია"  ·  medicalline.ge  ·  514 011 116', ml + 32, 22)
  pdf.text('ს/ნ: 405526831  ·  მისამართი: თბილისი, საქართველო', ml + 32, 28)

  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(200, 240, 220)
  pdf.text('გაყიდვის ხელშეკრულება', pageW - mr, 18, { align: 'right' })
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(160, 215, 195)
  pdf.text(`# ${contract.contract_number}`, pageW - mr, 25, { align: 'right' })

  y = 44

  // ── 2. Title ───────────────────────────────────────────────────────────────
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(17)
  pdf.setTextColor(8, 80, 65)
  pdf.text('გაყიდვის ხელშეკრულება', pageW / 2, y, { align: 'center' })
  y += 7

  pdf.setDrawColor(8, 80, 65)
  pdf.setLineWidth(0.5)
  pdf.line(ml, y, pageW - mr, y)
  y += 5

  // Contract meta row
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(80, 90, 105)
  pdf.text(`ხელშეკრულების ნომერი: `, ml, y)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setTextColor(18, 24, 38)
  pdf.text(contract.contract_number, ml + 52, y)

  pdf.setFont('Sylfaen', 'normal')
  pdf.setTextColor(80, 90, 105)
  pdf.text('თარიღი:', ml + 110, y)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setTextColor(18, 24, 38)
  pdf.text(geo(contract.contract_date), ml + 125, y)

  y += 5

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(80, 90, 105)
  pdf.text(`სტატუსი: `, ml, y)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setTextColor(18, 24, 38)
  pdf.text(CONTRACT_STATUS_LABELS[contract.status], ml + 22, y)
  y += 8

  pdf.setDrawColor(220, 225, 232)
  pdf.setLineWidth(0.3)
  pdf.line(ml, y, pageW - mr, y)
  y += 6

  // ── 3. Parties block ───────────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(ml, y - 1, uw, 9, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text('I.  მხარეები', ml + 4, y + 5.5)
  y += 13

  const halfW = uw / 2 - 4

  // Left: Seller
  pdf.setFillColor(245, 248, 250)
  pdf.roundedRect(ml, y - 1, halfW, 34, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(8, 80, 65)
  pdf.text('მომწოდებელი (გამყიდველი):', ml + 3, y + 5)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(18, 24, 38)
  pdf.text('შ.პ.ს „მედიქალ ლაინ ჯორჯია"', ml + 3, y + 12)
  pdf.setTextColor(80, 90, 105)
  pdf.text('ს/კ: 405526831', ml + 3, y + 18)
  pdf.text('მისამართი: თბილისი, საქართველო', ml + 3, y + 24)
  pdf.text('ტელ: 514 011 116', ml + 3, y + 30)

  // Right: Buyer
  const rx = ml + halfW + 8
  pdf.setFillColor(245, 248, 250)
  pdf.roundedRect(rx, y - 1, halfW, 34, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(8, 80, 65)
  pdf.text('მყიდველი (კლინიკა / პირი):', rx + 3, y + 5)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(18, 24, 38)
  pdf.text(contract.customer_name || contract.clinic_name || '—', rx + 3, y + 12)
  pdf.setTextColor(80, 90, 105)
  if (contract.customer_id_number) pdf.text(`პ/ნ: ${contract.customer_id_number}`, rx + 3, y + 18)
  if (contract.customer_address) {
    const adrLines: string[] = pdf.splitTextToSize(`მისამართი: ${contract.customer_address}`, halfW - 6)
    pdf.text(adrLines[0] as string, rx + 3, contract.customer_id_number ? y + 24 : y + 18)
  }
  if (contract.phone) pdf.text(`ტელ: ${contract.phone}`, rx + 3, y + 30)

  y += 38

  // ── 4. Subject ─────────────────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(ml, y - 1, uw, 9, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text('II.  ხელშეკრულების საგანი', ml + 4, y + 5.5)
  y += 13

  const subjectText =
    `მომწოდებელი ვალდებულია გადასცეს მყიდველს, ხოლო მყიდველი ვალდებულია მიიღოს და გადაიხადოს შემდეგი პროდუქტი/მოწყობილობა:`

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(25, 32, 44)
  const subjectLines: string[] = pdf.splitTextToSize(subjectText, uw)
  pdf.text(subjectLines, ml, y)
  y += subjectLines.length * 5 + 4

  // Product table
  const cols = [52, 14, 30, 30, 32, 16]  // widths: name, qty, unit, net, vat, vat%
  const headers = ['პროდუქტი / მოწყობილობა', 'რაოდ.', 'ერთ. ფასი', 'ნეტო', 'დღგ', 'სულ']
  const tableX = ml

  // Header row
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(tableX, y - 1, uw, 8, 1.5, 1.5, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(255, 255, 255)
  let cx = tableX + 2
  headers.forEach((h, i) => {
    pdf.text(h, cx, y + 4.5)
    cx += cols[i]
  })
  y += 10

  // Data row
  pdf.setFillColor(245, 248, 250)
  pdf.roundedRect(tableX, y - 1, uw, 12, 1.5, 1.5, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(18, 24, 38)
  cx = tableX + 2
  const productLabel = `${contract.product_name}${contract.brand ? ` · ${contract.brand}` : ''}${contract.model ? ` · ${contract.model}` : ''}`
  const productLines: string[] = pdf.splitTextToSize(productLabel, cols[0] - 4)
  pdf.text(productLines[0] as string, cx, y + 5)
  cx += cols[0]

  pdf.setFont('Sylfaen', 'normal')
  const cells = [
    String(contract.quantity),
    formatCurrency(contract.unit_price, contract.currency),
    formatCurrency(fin.net / contract.quantity, contract.currency),
    formatCurrency(fin.vat, contract.currency),
    formatCurrency(fin.gross, contract.currency),
  ]
  cells.forEach((cell, i) => {
    pdf.text(cell, cx, y + 5)
    cx += cols[i + 1]
  })

  y += 14

  // If serial number exists, add sub-row
  if (contract.serial_number) {
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(80, 90, 105)
    pdf.text(`სერიული ნომერი: ${contract.serial_number}`, tableX + 2, y)
    y += 6
  }

  // Totals block
  pdf.setFillColor(8, 80, 65)
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(255, 255, 255)
  pdf.roundedRect(pageW - mr - 90, y, 90, 8, 1.5, 1.5, 'F')
  pdf.text('სულ გადასახდელი:', pageW - mr - 88, y + 5.5)
  pdf.text(formatCurrency(fin.gross, contract.currency), pageW - mr - 4, y + 5.5, { align: 'right' })
  y += 10

  if (contract.vat_rate > 0) {
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(80, 90, 105)
    const vatNote = contract.vat_included
      ? `(ჩათვლით დღგ ${contract.vat_rate}% = ${formatCurrency(fin.vat, contract.currency)})`
      : `(+ დღგ ${contract.vat_rate}% = ${formatCurrency(fin.vat, contract.currency)})`
    pdf.text(vatNote, pageW - mr, y, { align: 'right' })
    y += 6
  }
  y += 4

  // ── 5. Payment & Delivery ──────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(ml, y - 1, uw, 9, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text('III.  ფასი და გადახდის პირობები', ml + 4, y + 5.5)
  y += 13

  const payRows: Array<[string, string]> = [
    ['გადახდის პირობები', contract.payment_terms || '100% გადახდა ხელშეკრულების ხელმოწერისთანავე'],
    ['მიწოდების თარიღი', geo(contract.delivery_date)],
    ['მიწოდების მისამართი', contract.delivery_address || contract.customer_address || '—'],
    ['ინსტალაცია', contract.installation_included ? 'შედის ფასში' : 'არ შედის (ცალკე ხელშეკრულებით)'],
    ['გარანტია', contract.warranty_months > 0 ? `${contract.warranty_months} თვე` : 'გარანტიის გარეშე'],
  ]

  payRows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      pdf.setFillColor(245, 248, 250)
      pdf.roundedRect(ml, y - 5.5, uw, 8.5, 1.5, 1.5, 'F')
    }
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(70, 80, 95)
    pdf.text(label, ml + 3, y)
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(18, 24, 38)
    const valLines: string[] = pdf.splitTextToSize(value, uw - 58)
    pdf.text(valLines[0] as string, ml + 56, y)
    y += 8.5
  })
  y += 4

  // ── 6. Obligations ─────────────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(ml, y - 1, uw, 9, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text('IV.  მხარეთა ვალდებულებები', ml + 4, y + 5.5)
  y += 13

  const obligations: string[] = [
    'მომწოდებელი ვალდებულია მიაწოდოს მყიდველს ხელშეკრულებით გათვალისწინებული პროდუქტი სათანადო ხარისხით, შეთანხმებულ ვადაში.',
    'მყიდველი ვალდებულია გადაიხადოს ხელშეკრულებით განსაზღვრული საფასური შეთანხმებული პირობებისა და ვადების დაცვით.',
    'მომწოდებელი ვალდებულია პროდუქტზე გაუწიოს მყიდველს გარანტიული მომსახურება ხელშეკრულებით განსაზღვრული ვადის განმავლობაში.',
    'მყიდველი ვალდებულია პროდუქტი გამოიყენოს ექსპლუატაციის წესების დაცვით. ნებისმიერი უნებართვო ჩარევა ან ცვლილება ათავისუფლებს მომწოდებელს გარანტიული ვალდებულებებისგან.',
  ]

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.8)
  pdf.setTextColor(25, 32, 44)

  obligations.forEach((clause, i) => {
    const lines: string[] = pdf.splitTextToSize(`${i + 1}.  ${clause}`, uw - 4)
    const blockH = lines.length * 5 + 3
    if (y + blockH > pageH - 62) return
    pdf.text(lines, ml + 2, y)
    y += blockH
  })
  y += 3

  // ── 7. Standard clauses ────────────────────────────────────────────────────
  pdf.setFillColor(8, 80, 65)
  pdf.roundedRect(ml, y - 1, uw, 9, 2, 2, 'F')
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(255, 255, 255)
  pdf.text('V.  პასუხისმგებლობა და სხვა პირობები', ml + 4, y + 5.5)
  y += 13

  const stdClauses: string[] = [
    'მხარე, რომელიც არღვევს ხელშეკრულებით ნაკისრ ვალდებულებებს, ვალდებულია აანაზღაუროს მეორე მხარის ამით გამოწვეული ზარალი.',
    'ფორსმაჟორული გარემოებების (სტიქიური უბედურება, ომი, ხელისუფლების გადაწყვეტილება) დადგომისას მხარე, რომლისთვისაც შეუძლებელი გახდა ვალდებულების შესრულება, ვალდებულია დაუყოვნებლივ აცნობოს მეორე მხარეს.',
    'ხელშეკრულებასთან დაკავშირებული ნებისმიერი დავა მხარეები ცდილობენ გადაჭრან მოლაპარაკებით. შეუთანხმებლობის შემთხვევაში დავა გადაეცემა საქართველოს სასამართლოს განსახილველად.',
    'ხელშეკრულება შედგება ქართულ ენაზე, ორ იდენტურ ეგზემპლარად, სავალდებულო იურიდიული ძალით ორივე მხარისათვის.',
  ]

  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8.8)
  pdf.setTextColor(25, 32, 44)

  stdClauses.forEach((clause, i) => {
    const lines: string[] = pdf.splitTextToSize(`${i + 1}.  ${clause}`, uw - 4)
    const blockH = lines.length * 5 + 3
    if (y + blockH > pageH - 62) return
    pdf.text(lines, ml + 2, y)
    y += blockH
  })

  // Special terms
  if (contract.special_terms?.trim()) {
    y += 3
    pdf.setFont('Sylfaen', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(8, 80, 65)
    pdf.text('დამატებითი პირობები:', ml, y)
    y += 6
    pdf.setFont('Sylfaen', 'normal')
    pdf.setFontSize(8.8)
    pdf.setTextColor(25, 32, 44)
    const spLines: string[] = pdf.splitTextToSize(contract.special_terms, uw - 4)
    if (y + spLines.length * 5 < pageH - 62) {
      pdf.text(spLines, ml + 2, y)
      y += spLines.length * 5 + 4
    }
  }

  // ── 8. Signature block ─────────────────────────────────────────────────────
  const sigY = Math.max(y + 4, pageH - 50)

  pdf.setDrawColor(200, 208, 218)
  pdf.setLineWidth(0.3)
  pdf.line(ml, sigY, pageW - mr, sigY)

  const sigBlockW = (uw - 10) / 2

  // Left: Seller
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 50, 65)
  pdf.text('მომწოდებელი', ml, sigY + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(80, 90, 105)
  pdf.text('შ.პ.ს „მედიქალ ლაინ ჯორჯია"', ml, sigY + 13)
  pdf.text('ხელმომწერი: ___________________', ml, sigY + 20)

  try {
    pdf.addImage(INVOICE_STAMP_BASE64, 'JPEG', ml, sigY + 20, 28, 20)
  } catch {
    pdf.setDrawColor(8, 80, 65)
    pdf.setLineWidth(0.5)
    pdf.circle(ml + 14, sigY + 30, 9)
  }

  pdf.setDrawColor(8, 80, 65)
  pdf.setLineWidth(0.4)
  pdf.line(ml, sigY + 42, ml + sigBlockW, sigY + 42)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(120, 130, 145)
  pdf.text('ხელმოწერა / ბეჭედი', ml, sigY + 46)

  // Right: Buyer
  const sigRX = ml + sigBlockW + 10
  pdf.setFont('Sylfaen', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 50, 65)
  pdf.text('მყიდველი', sigRX, sigY + 7)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(80, 90, 105)
  pdf.text(contract.customer_name || contract.clinic_name || '—', sigRX, sigY + 13)
  if (contract.customer_id_number) {
    pdf.text(`პ/ნ: ${contract.customer_id_number}`, sigRX, sigY + 19)
  }

  pdf.setDrawColor(8, 80, 65)
  pdf.setLineWidth(0.4)
  pdf.line(sigRX, sigY + 42, sigRX + sigBlockW - 10, sigY + 42)
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(120, 130, 145)
  pdf.text('ხელმოწერა / ბეჭედი', sigRX, sigY + 46)

  // Footer
  pdf.setFillColor(245, 247, 244)
  pdf.rect(0, pageH - 6, pageW, 6, 'F')
  pdf.setFont('Sylfaen', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(155, 163, 175)
  pdf.text(
    `Medical Line Georgia  ·  ${contract.contract_number}  ·  ${geo(contract.contract_date)}`,
    pageW / 2, pageH - 2, { align: 'center' },
  )

  return Buffer.from(pdf.output('arraybuffer'))
}

export function buildContractPdfStoragePath(contract: Pick<ContractRecord, 'id' | 'contract_number'>) {
  return `contracts/${contract.id}/${contract.contract_number}.pdf`
}
