import { calcVatAmount, formatCurrency } from './contract'
import type { ContractFormValues, ContractRecord } from './contract-types'

export const SELLER_INFO = {
  name: 'შპს „მედიქალ ლაინ ჯორჯია“',
  idNumber: '417893569',
  director: 'შოთა სეფიშვილი',
  address: 'თბილისი, ჯაბიძის 8',
  phone: '514 011 116',
  bank: 'პროკრედიტ ბანკი',
  account: 'GE39PC0833600100001872',
}

export type ContractTemplateInput = {
  contractNumber?: string | null
  contractDate?: string | null
  clinicName?: string | null
  customerName?: string | null
  customerIdNumber?: string | null
  customerAddress?: string | null
  phone?: string | null
  productName: string
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  quantity: number
  unitPrice: number
  currency: string
  vatRate: number
  vatIncluded: boolean
  paymentTerms?: string | null
  deliveryDate?: string | null
  deliveryAddress?: string | null
  installationIncluded: boolean
  warrantyMonths: number
  specialTerms?: string | null
}

export type ContractTemplateSection = {
  title: string
  clauses: string[]
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

export function valueOrDash(value: unknown) {
  return clean(value) || '—'
}

export function contractInputFromForm(values: ContractFormValues): ContractTemplateInput {
  return {
    contractDate: values.contractDate,
    clinicName: values.clinicName,
    customerName: values.customerName,
    customerIdNumber: values.customerIdNumber,
    customerAddress: values.customerAddress,
    phone: values.phone,
    productName: values.productName,
    brand: values.brand,
    model: values.model,
    serialNumber: values.serialNumber,
    quantity: Math.max(1, Number(values.quantity || 1)),
    unitPrice: Number(values.unitPrice || 0),
    currency: values.currency || 'GEL',
    vatRate: Number(values.vatRate || 0),
    vatIncluded: values.vatIncluded,
    paymentTerms: values.paymentTerms,
    deliveryDate: values.deliveryDate,
    deliveryAddress: values.deliveryAddress,
    installationIncluded: values.installationIncluded,
    warrantyMonths: Number(values.warrantyMonths || 0),
    specialTerms: values.specialTerms,
  }
}

export function contractInputFromRecord(contract: ContractRecord): ContractTemplateInput {
  return {
    contractNumber: contract.contract_number,
    contractDate: contract.contract_date,
    clinicName: contract.clinic_name,
    customerName: contract.customer_name,
    customerIdNumber: contract.customer_id_number,
    customerAddress: contract.customer_address,
    phone: contract.phone,
    productName: contract.product_name,
    brand: contract.brand,
    model: contract.model,
    serialNumber: contract.serial_number,
    quantity: contract.quantity,
    unitPrice: contract.unit_price,
    currency: contract.currency,
    vatRate: contract.vat_rate,
    vatIncluded: contract.vat_included,
    paymentTerms: contract.payment_terms,
    deliveryDate: contract.delivery_date,
    deliveryAddress: contract.delivery_address,
    installationIncluded: contract.installation_included,
    warrantyMonths: contract.warranty_months,
    specialTerms: contract.special_terms,
  }
}

export function getBuyerName(input: ContractTemplateInput) {
  return clean(input.clinicName) || clean(input.customerName) || 'მყიდველი'
}

export function getProductLabel(input: ContractTemplateInput) {
  return [input.brand, input.productName, input.model].map(clean).filter(Boolean).join(' / ') || 'პროდუქტი'
}

export function isRadiologyContract(input: ContractTemplateInput) {
  const text = `${input.productName} ${input.brand || ''} ${input.model || ''}`.toLowerCase()
  return /(finscan|f350|cbct|ტომოგრაფ|რენტგენ|x-ray|xray)/i.test(text)
}

export function getContractFinancialSummary(input: ContractTemplateInput) {
  const fin = calcVatAmount(input.unitPrice, input.quantity, input.vatRate, input.vatIncluded)
  return {
    net: formatCurrency(fin.net, input.currency),
    vat: formatCurrency(fin.vat, input.currency),
    gross: formatCurrency(fin.gross, input.currency),
  }
}

export function buildContractIntro(input: ContractTemplateInput) {
  return `ერთის მხრივ, ${SELLER_INFO.name} ს/კ ${SELLER_INFO.idNumber}, წარმოდგენილი დირექტორის ${SELLER_INFO.director}-ის სახით, შემდგომში „გამყიდველი“, და მეორეს მხრივ, ${getBuyerName(input)}, ს/კ/პირადი № ${valueOrDash(input.customerIdNumber)}, შემდგომში „მყიდველი“, ერთად „მხარეები“, ვთანხმდებით შემდეგზე:`
}

export function buildStandardContractSections(input: ContractTemplateInput): ContractTemplateSection[] {
  const product = getProductLabel(input)
  const buyer = getBuyerName(input)
  const total = getContractFinancialSummary(input).gross
  const paymentTerms = clean(input.paymentTerms) || 'ანგარიშსწორება ხორციელდება მხარეთა შეთანხმებული გადახდის გრაფიკით, გამყიდველის საბანკო რეკვიზიტებზე.'
  const deliveryTerm = clean(input.deliveryDate)
    ? `მიწოდების შეთანხმებული თარიღია ${input.deliveryDate}.`
    : 'მიწოდების ვადა განისაზღვრება მხარეთა შეთანხმებით და აისახება ხელშეკრულებაში ან მიღება-ჩაბარების აქტში.'

  const sections: ContractTemplateSection[] = [
    {
      title: '1. ხელშეკრულების საგანი',
      clauses: [
        `გამყიდველი იღებს ვალდებულებას მიაწოდოს, საჭიროების შემთხვევაში დაამონტაჟოს და საწყის რეჟიმში გამართოს მყიდველისთვის შეთანხმებული მოწყობილობა/პროდუქტი: ${product}.`,
        'პროდუქტის ზუსტი დასახელება, რაოდენობა, კომპლექტაცია, ღირებულება და საჭიროების შემთხვევაში ტექნიკური სპეციფიკაცია განისაზღვრება ხელშეკრულებით და/ან დანართით №1.',
        'პროდუქტზე საკუთრების უფლება მყიდველზე გადადის მხოლოდ პროდუქტის ღირებულების სრულად დაფარვის შემდეგ. სრულ გადახდამდე მყიდველს ეკრძალება პროდუქტის გასხვისება, დაგირავება, მესამე პირზე გადაცემა, დემონტაჟი ან ადგილმდებარეობის შეცვლა გამყიდველის წინასწარი წერილობითი თანხმობის გარეშე.',
      ],
    },
    {
      title: '2. ღირებულება და ანგარიშსწორება',
      clauses: [
        `პროდუქტის/მომსახურების სრული ღირებულება შეადგენს ${total}.`,
        paymentTerms,
        'ანგარიშსწორება ხორციელდება ნაღდი ან უნაღდო ანგარიშსწორების ფორმით, გამყიდველის საბანკო რეკვიზიტებზე.',
        'გადახდის ვადის გადაცილების შემთხვევაში, მყიდველს დაეკისრება პირგასამტეხლო ყოველ ვადაგადაცილებულ დღეზე გადაუხდელი თანხის 0.1%-ის ოდენობით.',
        'გადახდის ვადის არსებითი დარღვევის შემთხვევაში, გამყიდველს უფლება აქვს მოითხოვოს დავალიანების დაუყოვნებლივ დაფარვა, პირგასამტეხლოს გადახდა ან/და ხელშეკრულების შეწყვეტა და პროდუქტის დაბრუნება საქართველოს კანონმდებლობით დადგენილი წესით.',
      ],
    },
    {
      title: '3. მიწოდება და ინსტალაცია',
      clauses: [
        `${deliveryTerm} მიწოდების მისამართია: ${valueOrDash(input.deliveryAddress || input.customerAddress)}.`,
        input.installationIncluded
          ? 'ინსტალაცია შედის შეთანხმებულ პირობებში და გამყიდველი უზრუნველყოფს პროდუქტის საწყის ტექნიკურ გამართვას.'
          : 'ინსტალაცია არ შედის შეთანხმებულ ფასში, თუ მხარეები დამატებით წერილობით არ შეთანხმდებიან სხვაგვარად.',
        'სართულებზე ატანა, რთული გადაადგილება, კედლის/იატაკის დემონტაჟი, სპეციალური ამწის ან დამატებითი მუშახელის საჭიროება არ შედის სტანდარტულ ინსტალაციაში და საჭიროების შემთხვევაში თანხმდება მხარეებს შორის ცალკე.',
        'ინსტალაციის შემდეგ გამყიდველი ატარებს მყიდველის პერსონალის საწყის ტექნიკურ ტრენინგს აპარატის ძირითადი გამოყენებისა და მოვლის წესების შესახებ.',
        'პროდუქტის მიწოდებისა და მონტაჟის დასრულების შემდეგ მხარეები ხელს აწერენ ორმხრივ მიღება-ჩაბარების აქტს.',
      ],
    },
  ]

  if (isRadiologyContract(input)) {
    sections.push({
      title: '4. მყიდველის ვალდებულებები რადიაციულ უსაფრთხოებასთან დაკავშირებით',
      clauses: [
        `${buyer} ადასტურებს, რომ ინფორმირებულია: ${product}-ის კლინიკური ექსპლუატაცია დასაშვებია მხოლოდ შესაბამისი ოთახის, რადიაციული უსაფრთხოების, ლიცენზირების/ნებართვების, ხარისხის კონტროლისა და მოქმედი კანონმდებლობის მოთხოვნების დაკმაყოფილების შემდეგ.`,
        'მყიდველის პასუხისმგებლობაა აპარატის განთავსების ოთახის მომზადება, საჭირო ელექტროენერგიის, დამიწების, UPS-ის/სტაბილიზატორისა და გარემო პირობების უზრუნველყოფა.',
        'მყიდველის პასუხისმგებლობაა რადიაციული უსაფრთხოების პროექტის, დოზიმეტრიული/ხარისხის კონტროლისა და მიღების გამოცდის ორგანიზება, შესაბამის სახელმწიფო ორგანოებთან ურთიერთობა, შეტყობინება, ლიცენზირება ან სხვა სავალდებულო პროცედურების შესრულება.',
        'გამყიდველი არ არის პასუხისმგებელი მყიდველის მიერ ლიცენზიის, ნებართვის, მიღების გამოცდის, ოთახის შესაბამისობის ან რადიაციული უსაფრთხოების მოთხოვნების შეუსრულებლობით გამოწვეულ შეფერხებაზე, ჯარიმაზე, აკრძალვაზე ან სხვა სამართლებრივ შედეგზე.',
      ],
    })
  }

  sections.push(
    {
      title: '5. საგარანტიო პირობები და სერვისი',
      clauses: [
        `საგარანტიო ვადაა ${input.warrantyMonths || 0} თვე მიღება-ჩაბარების აქტის გაფორმებიდან.`,
        'გარანტია ვრცელდება მხოლოდ ქარხნულ/ტექნიკურ დეფექტებზე, რომლებიც წარმოიშვა ნორმალური ექსპლუატაციის პირობებში.',
        'გარანტია არ ვრცელდება ელექტროენერგიის ცვალებადობით, ძაბვის ვარდნით/მატებით, დამიწების არარსებობით, არასწორი ელექტრო მონტაჟით, მექანიკური დაზიანებით, სითხის მოხვედრით, ხანძრით, დატბორვით ან სხვა გარე ფაქტორით გამოწვეულ დაზიანებებზე.',
        'გარანტია არ ვრცელდება არაუფლებამოსილი პირის მიერ აპარატის გახსნაზე, შეკეთებაზე, გადაადგილებაზე, პროგრამულ ჩარევაზე ან კონფიგურაციის შეცვლაზე.',
        'საგარანტიო შემთხვევისას, გამყიდველი ახორციელებს დისტანციურ დიაგნოსტიკას შეტყობინებიდან 24 საათის განმავლობაში. საჭიროების შემთხვევაში, ადგილზე სერვისის ვადა თანხმდება მხარეებს შორის.',
        'თუ შემოწმების შედეგად დადგინდა, რომ ხარვეზი არ წარმოადგენს საგარანტიო შემთხვევას, მყიდველი ვალდებულია აანაზღაუროს დიაგნოსტიკის, ტრანსპორტირების, სათადარიგო ნაწილებისა და სერვისის ღირებულება გამყიდველის მოქმედი ტარიფების შესაბამისად.',
        'ყოველწლიური ტექნიკური მომსახურება, პერიოდული სტატუს-ტესტი, ხარისხის კონტროლი და საჭირო სპეციალისტის მომსახურება ცალკე შეთანხმების საგანია.',
      ],
    },
    {
      title: '6. კონფიდენციალურობა',
      clauses: [
        'მხარეები ვალდებულნი არიან არ გაამჟღავნონ კომერციული პირობები, ფასდაკლება, ტექნიკური დოკუმენტაცია, მომსახურების პირობები და სხვა კონფიდენციალური ინფორმაცია მესამე პირებისათვის, გარდა კანონით ან რეგულატორის მოთხოვნით აუცილებელი შემთხვევისა.',
        'მყიდველი თანხმობას აცხადებს, რომ გამყიდველმა გამოიყენოს ინსტალაციის ზოგადი ფაქტი მარკეტინგული მიზნებისთვის მხოლოდ მყიდველის წინასწარი წერილობითი თანხმობით. კლინიკის სახელი, ექიმების ფოტოები ან პაციენტის მონაცემები გამოქვეყნდება მხოლოდ ცალკე თანხმობით.',
      ],
    },
    {
      title: '7. ფორს-მაჟორი',
      clauses: [
        'მხარეები თავისუფლდებიან პასუხისმგებლობისგან ვალდებულების შეუსრულებლობისთვის, თუ შეუსრულებლობა გამოწვეულია ფორს-მაჟორული გარემოებით: ომი, ბუნებრივი კატასტროფა, ეპიდემია, საბაჟო/ტრანსპორტირების მასშტაბური შეფერხება, სახელმწიფო შეზღუდვები, მწარმოებლის წარმოების შეჩერება ან სხვა გარემოება, რომლის კონტროლიც მხარეს არ შეუძლია.',
        'ფორს-მაჟორის შესახებ მხარემ მეორე მხარეს უნდა აცნობოს გონივრულ ვადაში და წარადგინოს შესაბამისი დამადასტურებელი ინფორმაცია.',
      ],
    },
    {
      title: '8. დავების გადაწყვეტა და მოქმედი სამართალი',
      clauses: [
        'ხელშეკრულება რეგულირდება საქართველოს კანონმდებლობით.',
        'მხარეები შეეცდებიან დავა გადაწყვიტონ მოლაპარაკებით. შეთანხმების მიუღწევლობის შემთხვევაში დავა განიხილება საქართველოს საერთო სასამართლოებში, თბილისის საქალაქო სასამართლოში, თუ მხარეები წერილობით არ შეთანხმდებიან არბიტრაჟზე.',
        'ხელშეკრულების ცვლილება ძალაშია მხოლოდ წერილობითი ფორმით და ორივე მხარის ხელმოწერით.',
      ],
    },
    {
      title: '9. დასკვნითი დებულებები',
      clauses: [
        'ხელშეკრულება შედგენილია ქართულ ენაზე, თანაბარი იურიდიული ძალის მქონე ორ ეგზემპლარად, თითოეული მხარისთვის თითო ეგზემპლარი.',
        'ხელშეკრულების დანართები მისი განუყოფელი ნაწილია. საჭიროების შემთხვევაში დანართი №1 განსაზღვრავს ტექნიკურ კომპლექტაციას, ფასს და დამატებით მოთხოვნებს.',
      ],
    },
  )

  return sections
}
