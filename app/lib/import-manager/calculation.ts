import type { CostBasis, ImportCalculation, ImportDraft, ImportExpense, ImportLine } from './types'

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100)
const gel = (c: number) => c / 100
const valid = (n: number): boolean => Number.isFinite(n) && n >= 0

// Largest-remainder distribution: deterministic, exact cents, stable ties by line index.
export function distributeCents(totalCents: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0 || !weights.length ||
      weights.some((w) => !valid(w)) || weights.every((w) => w === 0)) {
    throw new Error('განაწილების თანხა ან წონები არასწორია.')
  }
  const denominator = weights.reduce((sum, weight) => sum + weight, 0)
  const exact = weights.map((w) => totalCents * w / denominator)
  const lower = exact.map(Math.floor)
  let remainder = totalCents - lower.reduce((a,b) => a+b, 0)
  const order = exact.map((v, i) => ({ i, fraction: v - Math.floor(v) }))
    .sort((a,b) => b.fraction - a.fraction || a.i - b.i)
  for (let i = 0; i < remainder; i++) lower[order[i].i]++
  return lower
}

function rateFor(draft: ImportDraft, currency: string): number {
  return currency === 'GEL' ? 1 :
    currency === draft.currency ? draft.rateToGel : Number(draft.expenseRates[currency as keyof typeof draft.expenseRates] || 0)
}

function selectWeights(lines: ImportLine[], bases: number[], expense: ImportExpense): {
  basis: Exclude<CostBasis,'auto'>; weights: number[]; warning?: string; issue?: string
} {
  let basis = expense.basis
  if (basis === 'auto') {
    if (lines.every(l => Number(l.grossWeightKg) > 0)) basis = 'weight'
    else if (lines.every(l => Number(l.netWeightKg) > 0))
      return {basis:'weight', weights:lines.map(l=>Number(l.netWeightKg)),
        warning:`„${expense.title}“: ბრუტო წონის ნაცვლად გამოყენებულია დადასტურებული ნეტო წონები (შეფუთვა ცალკე არ ჩანს).` }
    else return { basis:'value', weights:bases.every(x=>x===0) ? bases.map(()=>1) : bases,
      warning:`„${expense.title}“: წონა არ არის სრულად ცნობილი — დროებით გამოიყენება ღირებულების პროპორცია. გადაამოწმე განაწილება.` }
  }
  if (basis === 'weight') {
    const okay = lines.every(l => Number(l.grossWeightKg) > 0)
    if (!okay) {
      return { basis: 'value', weights: bases,
        warning: `„${expense.title}“: ბრუტო წონა არასრულია; დროებით არჩეულია ღირებულებით განაწილება.`,
        issue: `დაადასტურე „${expense.title}“-ის განაწილების მეთოდი ან მიუთითე ყველა წონა.` }
    }
    return { basis: 'weight', weights: lines.map(l => Number(l.grossWeightKg)) }
  }
  if (basis === 'manual') {
    const weights = lines.map(l => Number(l.manualShares?.[expense.id] || 0))
    if (weights.some(v => v < 0) || weights.every(v => v === 0)) {
      return { basis: 'manual', weights: bases, issue: `„${expense.title}“: ხელით განაწილების წილები არ არის შევსებული.` }
    }
    return { basis: 'manual', weights }
  }
  if (basis === 'declared') {
    const values = lines.map(l => Number(l.declaredCustomsGel || 0))
    if (values.some(v=>v<=0)) return { basis:'declared',weights:bases,issue:`„${expense.title}“: ყველა საქონლის საბაჟო ღირებულება მიუთითე.` }
    return { basis:'declared', weights:values }
  }
  if (basis === 'equal') return { basis:'equal', weights:lines.map(()=>1) }
  return { basis:'value', weights:bases.every(x=>x===0) ? bases.map(()=>1) : bases }
}

export function calculateImport(draft: ImportDraft): ImportCalculation {
  const warnings: string[] = []
  const blockingIssues: string[] = []
  if (!draft.items.length) blockingIssues.push('იმპორტში დაამატე მინიმუმ ერთი პროდუქტი.')
  if (!draft.supplierOrisAccount.trim()) blockingIssues.push('მომწოდებლის ORIS 3110 ანგარიში მითითებული არ არის.')
  if (!(draft.rateToGel > 0) || !Number.isFinite(draft.rateToGel)) blockingIssues.push('საქონლის გადაყვანის GEL კურსი არასწორია.')
  for (const item of draft.items) {
    if (!(item.quantity > 0) || !valid(item.unitPrice)) blockingIssues.push(`${item.name}: რაოდენობა ან ფასი არასწორია.`)
    if (!/^(1610|1611)\s*\d+/i.test(item.orisAccount.trim())) blockingIssues.push(`${item.name}: მიუთითე ORIS-ის სასაქონლო ანგარიში (1610 ან 1611).`)
    if (item.weightConfidence === 'estimated') warnings.push(`${item.name}: წონა შეფასებულია და დოკუმენტით დადასტურებული არ არის.`)
    if (item.weightConfidence === 'history') warnings.push(`${item.name}: წონა აღებულია ძველი პარტიიდან; გადაამოწმე შეფუთვის ცვლილება.`)
  }
  if (blockingIssues.length && (!draft.items.length || !(draft.rateToGel > 0))) {
    return { lines: [], expenses: [], goodsGel: 0, totalCapitalizedExpensesGel: 0, totalVatGel: 0, landedTotalGel: 0, warnings, blockingIssues, canApprove: false }
  }

  const exactGoods = draft.items.map(item => item.unitPrice * item.quantity * draft.rateToGel)
  // Convert each invoice line to cents and carry one rounding adjustment into the largest line.
  const target = cents(exactGoods.reduce((a,b)=>a+b,0))
  const goodsCents = exactGoods.map(cents)
  if (goodsCents.length) goodsCents[goodsCents.length-1] += target-goodsCents.reduce((a,b)=>a+b,0)
  const rowCosts = goodsCents.map(() => 0)
  const rowVat = goodsCents.map(() => 0)
  const byExpense: Array<Record<string,number>> = draft.items.map(() => ({}))
  const expenseResults: ImportCalculation['expenses'] = []
  let accumulatedVat = 0

  for (const expense of draft.expenses.filter(e => e.enabled)) {
    if (!valid(expense.amount)) { blockingIssues.push(`${expense.title}: თანხა არასწორია.`); continue }
    const rate = rateFor(draft, expense.currency)
    if (!(rate > 0) || !Number.isFinite(rate)) {
      blockingIssues.push(`${expense.title}: ${expense.currency}→GEL კურსი აკლია.`)
      continue
    }
    const grossCents = cents(expense.amount * rate)
    let vatCents = 0
    // Standalone import VAT is NEVER added to landed cost.
    if (expense.kind === 'import_vat') vatCents = grossCents
    else if (expense.vatIncluded) {
      if(!expense.vatDeductible) warnings.push(`${expense.title}: დღგ მითითებულია არაჩასათვლელად, მაგრამ თვითღირებულების მიღმა დარჩა შენი წესის შესაბამისად; ბუღალტერთან გადაამოწმე აღრიცხვა.`)
      if (expense.vatAmount != null) vatCents = cents(expense.vatAmount * rate)
      else {
        const pct = Number(expense.vatRate)
        if (!valid(pct)) {blockingIssues.push(`${expense.title}: დღგ-ის განაკვეთი არასწორია.`);continue}
        vatCents = cents((expense.amount * pct / (100 + pct)) * rate)
      }
    }
    if (vatCents > grossCents) { blockingIssues.push(`${expense.title}: დღგ სრულ თანხაზე მეტია.`); continue }
    const netCents = Math.max(0, grossCents - vatCents)
    const capitalized = expense.kind !== 'import_vat' && !expense.includedInInvoice ? netCents : 0
    const selection = selectWeights(draft.items, goodsCents, expense)
    if (selection.warning) warnings.push(selection.warning)
    if (selection.issue) blockingIssues.push(selection.issue)
    if (expense.includedInInvoice) warnings.push(`${expense.title}: ინვოისის ფასშია ჩართული — მეორედ არ დამატებულა.`)
    const costAlloc = capitalized && draft.items.length ? distributeCents(capitalized, selection.weights) : goodsCents.map(()=>0)
    const vatAlloc = vatCents && draft.items.length ? distributeCents(vatCents, goodsCents.every(n=>n===0) ? goodsCents.map(()=>1) : goodsCents) : goodsCents.map(()=>0)
    for (let i=0;i<costAlloc.length;i++) {
      rowCosts[i] += costAlloc[i]
      rowVat[i] += vatAlloc[i]
      byExpense[i][expense.id] = gel(costAlloc[i])
    }
    accumulatedVat += vatCents
    expenseResults.push({ id:expense.id, title:expense.title, kind:expense.kind, netGel: gel(netCents), vatGel:gel(vatCents), appliedGel:gel(capitalized), basisUsed: capitalized ? selection.basis:'excluded', counterpartyAccount:expense.counterpartyAccount, warning:selection.warning })
  }
  const goods = goodsCents.reduce((a,b)=>a+b,0)
  const added = rowCosts.reduce((a,b)=>a+b,0)
  const lines = draft.items.map((item, i) => ({
    id:item.id, name:item.name, orisAccount:item.orisAccount, quantity:item.quantity,
    invoiceGel:gel(goodsCents[i]), byExpense:byExpense[i], landedGel:gel(goodsCents[i]+rowCosts[i]),
    unitLandedGel: item.quantity ? Math.round((goodsCents[i]+rowCosts[i])/item.quantity * 10000)/1000000 : 0,
    vatGel:gel(rowVat[i]),
  }))
  // Reconcile customs values for informational purposes; NOT a hard blocker: some costs are not customs value.
  const customs = draft.items.map(x=>x.declaredCustomsGel)
  if (customs.every(x=>x!=null) && customs.length) {
    const declared = cents(customs.reduce<number>((s,v)=>s+Number(v),0))
    const transport = draft.expenses.filter(e=>e.enabled && e.kind==='international_freight' && !e.includedInInvoice)
      .reduce((s,e)=>s+cents(e.amount * rateFor(draft,e.currency)),0)
    if (Math.abs(declared - goods - transport)>2) warnings.push('საბაჟო ღირებულება არ ემთხვევა ინვოისისა და საერთაშორისო ტრანსპორტის ჯამს; გადაამოწმე საბაჟო კორექტირებები.')
  }
  if (draft.items.some(x=>!x.orisAccount.trim())) blockingIssues.push('ზოგიერთ პროდუქტს არ აქვს ORIS ანგარიში.')
  if(!goods && draft.items.length) warnings.push('საქონლის ღირებულება ნულია; განაწილების მეთოდები შეამოწმე.')
  if (draft.expenses.some(x=>x.enabled && x.kind!=='import_vat' && !x.includedInInvoice && x.amount > 0 && !x.counterpartyAccount)) {
    warnings.push('ზოგიერთ დამატებით ხარჯს არ აქვს 3110 კონტრაგენტის ანგარიში — ORIS CSV-ის შესაქმნელად მიუთითე.')
  }
  if (goodsCents.some(v=>v<0)) blockingIssues.push('უარყოფითი საინვოისო ღირებულება დაუშვებელია.')
  return {
    lines, expenses:expenseResults, goodsGel:gel(goods), totalCapitalizedExpensesGel:gel(added),
    totalVatGel:gel(accumulatedVat), landedTotalGel:gel(goods+added), warnings,
    blockingIssues, canApprove:blockingIssues.length===0 && draft.items.length>0,
  }
}
