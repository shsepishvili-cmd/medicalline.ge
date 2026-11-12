import type { ImportCalculation, ImportDraft } from './types'

export interface OrisRow { date:string; debit:string; credit:string; amount:number; quantity:number; unit:string; note:string }

const normalize = (v: string) => v.replace(/\s+/g,'').trim()
const formatAccount = (v:string) => {
  const digits=normalize(v)
  if (!/^\d{5,12}$/.test(digits)) throw new Error(`არასწორი ORIS ანგარიში: ${v}`)
  // ORIS sample stores account as '1 6 11 00197', with each 4-digit group split.
  const prefix = digits.slice(0,4).split('').join(' ')
  const suffix = digits.slice(4)
  return suffix ? `${prefix} ${suffix}` : prefix
}
const localDate = (iso:string) => {
  const match=iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if(!match)throw new Error(`არასწორი თარიღი: ${iso}`)
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`
}

/** Only for the supplied 33-field ORIS Accounting 5.238 CSV sample.
 * Export is explicit-review only. No automatic insertion into ORIS database.
 */
export function buildOrisRows(draft:ImportDraft, calculation:ImportCalculation): OrisRow[] {
  if (!calculation.canApprove) throw new Error('აუცილებელი ველები არ არის შევსებული.')
  const date = localDate(draft.declarationDate)
  const rows:OrisRow[]=[]
  for(const line of calculation.lines){
    const original=draft.items.find(x=>x.id===line.id)!
    rows.push({date,debit:formatAccount(line.orisAccount),credit:formatAccount(draft.supplierOrisAccount),
      amount:line.invoiceGel,quantity:original.quantity,unit:original.unit,note:`IMPORT ${draft.reference} ${line.name}`})
  }
  for(const expense of calculation.expenses){
    if (expense.appliedGel <= 0) continue
    const source=draft.expenses.find(x=>x.id===expense.id)!
    if (!source.counterpartyAccount || !/^3110\s*\d+/.test(source.counterpartyAccount)) {
      throw new Error(`ORIS ექსპორტისთვის დაამატე ${expense.title}-ის 3110 ანგარიში.`)
    }
    for(const line of calculation.lines){
      const amount=line.byExpense[expense.id] || 0
      if(amount <= 0)continue
      rows.push({date,debit:formatAccount(line.orisAccount),credit:formatAccount(source.counterpartyAccount),
        amount,quantity:0,unit:draft.items.find(x=>x.id===line.id)!.unit,note:`IMPORT ${draft.reference} ${expense.title}`})
    }
  }
  // VAT is deliberately excluded: it must be posted to the proper deductible-VAT account separately.
  return rows
}

const cp1252Unit=(unit:string) => unit.trim().toLowerCase()==='ცალი' ? [0xDD,0xC0,0xCB,0xC9] : []
const escapeBytes = (b:number[]) => [34,...b.flatMap(x=>x===34 ? [34,34]:[x]),34]
const ascii=(s:string) => [...new TextEncoder().encode(s.replace(/[^\x20-\x7E]/g,''))]

/** Emits CP1252-compatible byte stream, including 4 legacy Georgian unit bytes.
 * Avoid writing Georgian product text in unverified ORIS legacy character encoding.
 */
export function buildOrisCsvBytes(rows:OrisRow[]):Uint8Array {
  const out:number[]=[]
  for(const row of rows){
    const cols:string[]=Array(33).fill('')
    cols[4]='0';cols[5]=row.date;cols[6]=row.debit;cols[7]=row.credit;cols[8]='0'
    cols[9]=row.amount.toFixed(2)
    cols[12]='1';cols[13]='0';cols[15]=row.quantity.toFixed(3);cols[16]=row.quantity.toFixed(3)
    cols[19]='0';cols[20]='9';cols[21]='0';cols[23]='0.00000000';cols[24]=row.date
    cols[26]='0';cols[27]='1';cols[28]='0';cols[30]='0'
    cols.forEach((cell,idx)=>{
      const data=idx===14 ? cp1252Unit(row.unit) : ascii(cell)
      out.push(...escapeBytes(data));if(idx<32)out.push(44)
    })
    out.push(13,10)
  }
  return new Uint8Array(out)
}
