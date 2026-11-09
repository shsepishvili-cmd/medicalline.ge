import fs from 'fs'
import path from 'path'
import { generateInvoiceAcceptanceActPdf } from '../app/lib/invoice-acceptance-act-pdf'

const output = path.join(process.cwd(), 'output', 'pdf', 'sample-invoice-acceptance-act.pdf')
fs.mkdirSync(path.dirname(output), { recursive: true })

const pdf = generateInvoiceAcceptanceActPdf({
  act_number: 'ACT-2026-0042',
  act_date: '2026-11-05',
  invoice_number: 'INV-2026-0042',
  invoice_date: '2026-11-04',
  delivery_date: '2026-11-05',
  customer_name: 'შპს სატესტო სტომატოლოგიური კლინიკა',
  customer_tax_id: '404123456',
  customer_address: 'თბილისი, პეკინის გამზირი 12',
  notes: 'საქონელი მიღებულია სრული კომპლექტაციით.',
  items: [
    { product_name: 'Eighteeth E-Connect S+ ენდომოტორი აპექს ლოკატორით', product_code: 'EC-SPLUS', unit: 'ცალი', quantity: 1 },
    { product_name: 'EFLEX BLUE ნიკელ-ტიტანის ინსტრუმენტების კომპლექტი 25 მმ', product_code: 'EF-B25', unit: 'კომპლექტი', quantity: 4 },
    { product_name: 'Woodpecker პორტატული რენტგენის აპარატი Ai-Ray', product_code: 'AIRAY', unit: 'ცალი', quantity: 1 },
  ],
}, {
  company_name: 'შპს „მედიქალ ლაინ ჯორჯია“',
  tax_id: '417893569',
  address: 'თბილისი, ჯაბიძის ქუჩა 8',
  director: 'შოთა სეფიშვილი',
})

fs.writeFileSync(output, pdf)
console.log(output)
