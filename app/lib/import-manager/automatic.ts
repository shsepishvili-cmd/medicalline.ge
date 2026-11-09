import 'server-only'
import { z } from 'zod'
import { PDFParse } from 'pdf-parse'
import { strFromU8, unzipSync } from 'fflate'
import { DEFAULT_EXPENSES } from './types'
import { normalizeCurrency } from './currency'
import type { ImportDraft, ImportExpense, ImportLine, Currency, ExpenseKind } from './types'

export const documentKinds = ['invoice','declaration','packing','transport','terminal','customs_notice','internal_transport','other'] as const
const C = z.preprocess(value=>normalizeCurrency(value),z.enum(['GEL','USD','EUR','CNY']))
const nullableCurrency = z.preprocess(value=>normalizeCurrency(value),z.enum(['GEL','USD','EUR','CNY']).nullable())
const kind = z.enum(documentKinds)
const positive = z.number().finite().nonnegative().nullable().optional()
const extractSchema = z.object({
 kind,
 supplierName:z.string().nullable().optional(),invoiceNumber:z.string().nullable().optional(),invoiceDate:z.string().nullable().optional(),
 declarationNumber:z.string().nullable().optional(),declarationDate:z.string().nullable().optional(),currency:nullableCurrency.optional(),rateToGel:positive,
 invoiceTotal:positive, grossTotalKg:positive,
 products:z.array(z.object({name:z.string(),sku:z.string().nullable().optional(),quantity:positive,unitPrice:positive,
  grossWeightKg:positive,netWeightKg:positive,hsCode:z.string().nullable().optional(),declaredCustomsGel:positive})).default([]),
 expenses:z.array(z.object({kind:z.enum(['international_freight','local_freight','customs_service','terminal','expertise','broker','import_duty','import_vat','other']),
  title:z.string(),amount:z.number().finite().nonnegative(),currency:C,vatAmount:positive,vatIncluded:z.boolean().optional(),documentNumber:z.string().nullable().optional()})).default([]),
 warnings:z.array(z.string()).default([]),
})
const nullableString={anyOf:[{type:'string'},{type:'null'}]}
const nullableNumber={anyOf:[{type:'number'},{type:'null'}]}
const extractionJsonSchema={
 type:'object',additionalProperties:false,
 properties:{
  kind:{type:'string',enum:documentKinds},
  supplierName:nullableString,invoiceNumber:nullableString,invoiceDate:nullableString,
  declarationNumber:nullableString,declarationDate:nullableString,
  currency:{anyOf:[{type:'string',enum:['GEL','USD','EUR','CNY']},{type:'null'}]},
  rateToGel:nullableNumber,invoiceTotal:nullableNumber,grossTotalKg:nullableNumber,
  products:{type:'array',items:{type:'object',additionalProperties:false,properties:{
   name:{type:'string'},sku:nullableString,quantity:nullableNumber,unitPrice:nullableNumber,
   grossWeightKg:nullableNumber,netWeightKg:nullableNumber,hsCode:nullableString,declaredCustomsGel:nullableNumber,
  },required:['name','sku','quantity','unitPrice','grossWeightKg','netWeightKg','hsCode','declaredCustomsGel']}},
  expenses:{type:'array',items:{type:'object',additionalProperties:false,properties:{
   kind:{type:'string',enum:['international_freight','local_freight','customs_service','terminal','expertise','broker','import_duty','import_vat','other']},
   title:{type:'string'},amount:{type:'number'},currency:{type:'string',enum:['GEL','USD','EUR','CNY']},
   vatAmount:nullableNumber,vatIncluded:{type:'boolean'},documentNumber:nullableString,
  },required:['kind','title','amount','currency','vatAmount','vatIncluded','documentNumber']}},
  warnings:{type:'array',items:{type:'string'}},
 },
 required:['kind','supplierName','invoiceNumber','invoiceDate','declarationNumber','declarationDate','currency','rateToGel','invoiceTotal','grossTotalKg','products','expenses','warnings'],
} as const
export type ExtractedDocument=z.infer<typeof extractSchema>
export type RawUpload={file:File;role:string}
export type MinimalCatalogAccount={account:string;name:string;kind:string;unit?:string|null;gross_weight_kg?:number|null}
export const isAllowedFile=(f:File)=>['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'].includes(f.type) || /\.(pdf|png|jpg|jpeg|xlsx|csv)$/i.test(f.name)
export const detectKind=(name:string):typeof documentKinds[number]=>/pack|შეფუთ/i.test(name)?'packing':/declar|დეკლარ|6593796/i.test(name)?'declaration':/შეტყობ|notice|customs.*vat/i.test(name)?'customs_notice':/terminal|ტერმინ/i.test(name)?'terminal':/შიდა.*მიწოდ|local.*deliver|ivan/i.test(name)?'internal_transport':/transport|freight|shipping|სატრანსპორტო/i.test(name)?'transport':/invoice|инвойс|ინვოის/i.test(name)?'invoice':'other'

function xlsxText(bytes:Uint8Array):string {
 const files=unzipSync(bytes)
 const sharedXml=files['xl/sharedStrings.xml']?strFromU8(files['xl/sharedStrings.xml']):''
 const clean=(value:string)=>value.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
 const shared=[...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>clean(m[1]))
 const rows:string[]=[]
 for(const path of Object.keys(files).filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(p)).slice(0,10)){
  const xml=strFromU8(files[path]);for(const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
   const cells:string[]=[];for(const c of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
    const v=c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1]??c[2].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]??''
    cells.push(/\bt="s"/.test(c[1])?shared[Number(v)]||'':clean(v))
   }
   rows.push(cells.join(' | '));if(rows.length>2000)break
  }
 }
 return rows.join('\n').slice(0,90000)
}
function currencyFrom(value:string|null|undefined):Currency {return normalizeCurrency(value)||'USD'}
function sanitizeDate(v:string|null|undefined){if(!v)return '';const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return v;const r=v.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return r?`${r[3]}-${r[2].padStart(2,'0')}-${r[1].padStart(2,'0')}`:''}
const system=`You are a document extractor, not a calculator. Extract ONLY visible evidence from the attached ONE import document for an importer in Georgia. Georgian, English, Russian and Chinese inputs are possible. Return a single JSON object with EXACT keys: {"kind":"invoice|declaration|packing|transport|terminal|customs_notice|internal_transport|other","supplierName":null,"invoiceNumber":null,"invoiceDate":null,"declarationNumber":null,"declarationDate":null,"currency":null,"rateToGel":null,"invoiceTotal":null,"grossTotalKg":null,"products":[],"expenses":[],"warnings":[]}.
Product shape {"name":"", "sku":null,"quantity":null,"unitPrice":null,"grossWeightKg":null,"netWeightKg":null,"hsCode":null,"declaredCustomsGel":null}. Expenses shape {"kind":"international_freight|local_freight|customs_service|terminal|expertise|broker|import_duty|import_vat|other","title":"","amount":0,"currency":"GEL|USD|EUR|CNY","vatAmount":null,"vatIncluded":false,"documentNumber":null}.
Do not invent weights, HS codes, rates, items, supplier, prices or VAT. Empty or unreadable fields MUST be null; no zeros unless document actually says 0. Use exact visible net vs gross. Price is per unit; invoiceTotal is currency total. GrossWeightKg is the entire line's total weight, not per unit, only if line-level visible. Customs declaration can show customs values separately (declaredCustomsGel). Do not confuse declared customs GEL values with invoice USD unit prices. A customs declaration VAT is "import_vat"; a customs-service fee is "customs_service". VAT-inclusive terminal/transport service amounts should include full gross amount and exact VAT from document. For customs notice, include import_vat plus customs_service only, avoid claiming duplicates are different expenses. For invoice extract line items only, never classify line items as additional expenses. For packing list extract weights and quantities only, unless unit price explicitly printed. Supplier invoice may be rotated or scanned. If unreadable, return a warning; DO NOT guess.`
export function parseOutput(content:string):ExtractedDocument {
 const clean=content.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()
 try{return extractSchema.parse(JSON.parse(clean))}
 catch(error){
  if(error instanceof SyntaxError)throw new Error('AI-მ დოკუმენტის პასუხი არასრული JSON ფორმატით დააბრუნა. ატვირთვა თავიდან სცადე.')
  throw error
 }
}
function getOutput(response:any):string {
 if(typeof response?.output_text==='string')return response.output_text
 const texts=(response?.output||[]).flatMap((part:any)=>(part.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text))
 return texts.join('\n')
}
function config(){const key=process.env.OPENAI_API_KEY?.trim()||process.env.AI_API_KEY?.trim()
 const model=process.env.OPENAI_MODEL?.trim()||process.env.AI_MODEL?.trim()||'gpt-4.1-mini'
 const base=(process.env.OPENAI_API_URL||'https://api.openai.com/v1').replace(/\/chat\/completions\/?$/,'').replace(/\/responses\/?$/,'').replace(/\/$/,'')
 if(!key)throw new Error('დოკუმენტების ავტომატურ ამოცნობას სჭირდება სერვერზე OPENAI_API_KEY (ან AI_API_KEY). კოდი ბრაუზერში არ ჩაწერო.')
 return {key,model,base}
}
async function aiRequest(file:File, role:string):Promise<ExtractedDocument> {
 const {key,model,base}=config()
 const bytes=new Uint8Array(await file.arrayBuffer())
 const ext=file.name.split('.').pop()?.toLowerCase()
 let text=''
 if(ext==='pdf'){
  try{const parser=new PDFParse({data:bytes});try{text=(await parser.getText()).text.slice(0,60000)}finally{await parser.destroy()}}catch{}
 }else if(ext==='xlsx'){text=xlsxText(bytes)}else if(ext==='csv'){text=new TextDecoder('utf-8').decode(bytes).slice(0,60000)}
 const prompt=`Document file: ${file.name}. Declared role by operator: ${role||'auto'}. Extract only from the file. Note if role does not match its contents. JSON only.`
 // Native PDF input via Responses supports scanned / rotated PDFs. Text-only conversion is used for XLSX/CSV.
 const contents:any[]=[{type:'input_text',text:prompt+(text?`\nExtracted text (may omit scanned elements):\n${text}`:'')}]
 if(ext==='pdf')contents.push({type:'input_file',filename:file.name,file_data:`data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`})
 if(ext==='png'||ext==='jpg'||ext==='jpeg')contents.push({type:'input_image',image_url:`data:${file.type||'image/jpeg'};base64,${Buffer.from(bytes).toString('base64')}`})
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),85000)
 let response:Response
 try{response=await fetch(`${base}/responses`,{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({model,input:[{role:'system',content:[{type:'input_text',text:system}]},{role:'user',content:contents}],
   text:{format:{type:'json_schema',name:'import_document',strict:true,schema:extractionJsonSchema}},max_output_tokens:8000})})}finally{clearTimeout(timeout)}
 if(!response.ok){const message=(await response.text()).slice(0,260);throw new Error(`AI-ის დოკუმენტის დამუშავება ვერ მოხერხდა (HTTP ${response.status}). ${message}`)}
 const result=await response.json()
 if(result?.status==='incomplete'){
  const reason=result?.incomplete_details?.reason||'unknown'
  throw new Error(`AI-ის პასუხი ვერ დასრულდა (${reason}). სცადე ნაკლები ან უფრო პატარა დოკუმენტი.`)
 }
 const refusal=(result?.output||[]).flatMap((part:any)=>part.content||[]).find((part:any)=>part.type==='refusal')?.refusal
 if(refusal)throw new Error(`AI-მ დოკუმენტის დამუშავებაზე უარი თქვა: ${String(refusal).slice(0,240)}`)
 const output=getOutput(result)
 if(!output)throw new Error(`${file.name}: AI-მ პასუხი ვერ დააბრუნა.`)
 return parseOutput(output)
}
function norm(s:string){return s.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')}
function tokens(s:string){return new Set(norm(s).split(' ').filter(t=>t.length>2))}
function matchSimilarity(a:string,b:string):number {
 const x=norm(a),y=norm(b);if(!x||!y)return 0;if(x===y)return 1
 const A=tokens(x),B=tokens(y),same=[...A].filter(s=>B.has(s)).length
 return same / Math.max(A.size,B.size,1)
}
function weightMatchScore(p:{name:string;sku?:string|null},w:{name:string;sku?:string|null}):number {
 const sku=norm(p.sku||'');const wsku=norm(w.sku||'')
 if(sku && wsku&&sku===wsku)return 1
 if(sku && norm(w.name).split(' ').includes(sku))return .97
 if(wsku && norm(p.name).split(' ').includes(wsku))return .97
 return matchSimilarity(p.name,w.name)
}
function matchProduct(name:string,sku:string|undefined,accounts:MinimalCatalogAccount[]){
 const pool=accounts.filter(a=>a.kind==='product')
 const ranked=pool.map(a=>({a,score:matchSimilarity(name,a.name)})).sort((x,y)=>y.score-x.score)
 const first=ranked[0];const second=ranked[1]
 if(!first)return {account:'',unit:'ცალი',hint:`„${name}“ ORIS-ის ცნობარში ვერ მოიძებნა.`}
 // Ambiguity is always surfaced: never guess an inventory account.
 if(first.score>=0.92&&(!second||first.score-second.score>0.2))return {account:first.a.account,unit:first.a.unit||'ცალი',hint:''}
 return {account:'',unit:'ცალი',hint:`„${sku||name}“: საჭიროა 1610/1611 ანგარიშის დადასტურება.`}
}
function matchSupplier(name:string,accounts:MinimalCatalogAccount[]){
 const ranked=accounts.filter(a=>a.kind==='supplier').map(a=>({a,score:matchSimilarity(name,a.name)})).sort((x,y)=>y.score-x.score)
 return ranked[0]?.score>=0.92 && (!ranked[1]||ranked[0].score-ranked[1].score>0.2)?ranked[0].a.account:''
}
function mergeExpense(ex:ImportExpense[],val:z.infer<typeof extractSchema>['expenses'][number],source:string,alerts:string[]){
 const matching=ex.filter(e=>e.kind===val.kind&&e.enabled)
 const found=matching.find(e=>e.documentNumber&&val.documentNumber&&e.documentNumber===val.documentNumber)
 if(found)return // duplicate document in upload set
 if(val.kind==='import_vat'&&matching.length){
  const existing=matching[0]
  if(Math.abs(existing.amount-val.amount)>0.02)alerts.push(`${source}: იმპორტის დღგ ${val.amount} არ ემთხვევა სხვა დოკუმენტში მითითებულ ${existing.amount}-ს — გადაამოწმე.`)
  return
 }
 let item=ex.find(e=>e.kind===val.kind&&!e.enabled)
 if(!item){item={...DEFAULT_EXPENSES.find(x=>x.kind===val.kind)!,id:`ai-${crypto.randomUUID()}`};ex.push(item)}
 item.enabled=true;item.amount=val.amount;item.currency=val.currency;item.title=val.title||item.title;item.documentNumber=val.documentNumber||undefined
 item.vatIncluded=!!val.vatIncluded;item.vatAmount=val.vatAmount??undefined;item.vatRate=18
 item.vatDeductible=true
 item.note=`დოკუმენტი: ${source}. ავტომატურად ამოცნობილი — გადაამოწმე.`
}
function enrichUsingDocuments(docs:Array<{name:string;result:ExtractedDocument}>,accounts:MinimalCatalogAccount[]):{draft:ImportDraft;warnings:string[]}{
 const warnings:string[]=[]
 const date=new Date().toISOString().slice(0,10)
 const invoice=docs.find(x=>x.result.kind==='invoice')?.result
 const declaration=docs.find(x=>x.result.kind==='declaration')?.result
 const packing=docs.filter(x=>x.result.kind==='packing').flatMap(x=>x.result.products)
 const sources=docs.map(d=>d.name)
 for(const d of docs)warnings.push(...d.result.warnings.map(w=>`${d.name}: ${w}`))
 const products=invoice?.products||[]
 const customsProducts=declaration?.products||[]
 // Only one-to-one, well supported matches; never align unrelated products simply by row order.
 const matches=new Map<number,number>(),used=new Set<number>()
 products.forEach((p,i)=>{
  const scores=customsProducts.map((w,j)=>({j,score:weightMatchScore(p,w)})).sort((a,b)=>b.score-a.score)
  if(scores[0]?.score>=.75 && (!scores[1]||scores[0].score-scores[1].score>=.12) && !used.has(scores[0].j)) {
   matches.set(i,scores[0].j);used.add(scores[0].j)
  }
 })
 const unassignedProducts=products.map((_,i)=>i).filter(i=>!matches.has(i))
 const unassignedCustoms=customsProducts.map((_,j)=>j).filter(j=>!used.has(j))
 if(unassignedProducts.length===1&&unassignedCustoms.length===1&&products.length===customsProducts.length){
  matches.set(unassignedProducts[0],unassignedCustoms[0]);warnings.push(`ერთი პროდუქტის შესაბამისობა დადგინდა დარჩენილი პოზიციების მიხედვით — გადაამოწმე: ${products[unassignedProducts[0]].name} ↔ ${customsProducts[unassignedCustoms[0]].name}.`)
 }
 // Never use customs valuation in place of invoice price.
 const lines:ImportLine[]=products.filter(p=>p.name&&p.quantity!=null).map((p)=>{
  const invoiceIndex=products.indexOf(p)
  const m=matchProduct(p.name,p.sku||undefined,accounts);if(m.hint)warnings.push(m.hint)
  const declaredIndex=matches.get(invoiceIndex)
  const declared=declaredIndex===undefined?undefined:customsProducts[declaredIndex]
  const packed=packing.find(w=>weightMatchScore(p,w)>=.75)
  const matched=packed||declared
  const gross=matched?.grossWeightKg??p.grossWeightKg??null
  const net=matched?.netWeightKg??p.netWeightKg??null
  if(p.unitPrice==null)warnings.push(`${p.name}: ფასი დოკუმენტიდან ვერ ამოიცნო.`)
  return {id:crypto.randomUUID(),name:p.name,supplierSku:p.sku||undefined,orisAccount:m.account,quantity:p.quantity!,unit:m.unit,unitPrice:p.unitPrice||0,
   hsCode:p.hsCode||declared?.hsCode||undefined,grossWeightKg:gross,netWeightKg:net,weightConfidence:gross!=null?'document':'unknown',
   declaredCustomsGel:declared?.declaredCustomsGel??undefined}
 })
 if(customsProducts.length&&matches.size!==products.length)warnings.push('ყველა პროდუქტისთვის საბაჟო დეკლარაციის პოზიცია ვერ მივაბით. შეამოწმე ბრუტო წონები და საბაჟო ღირებულებები.')
 if(!invoice)warnings.push('მომწოდებლის ინვოისი ვერ მოიძებნა. კალკულაციას პროდუქციის ძირითადი მონაცემები აკლია.')
 if(!lines.length)warnings.push('პროდუქტის პოზიციები ვერ ამოიცნო. ბარათის დამტკიცება შეუძლებელია.')
 const detectedCurrency=normalizeCurrency(invoice?.currency)
 const currency=currencyFrom(invoice?.currency)
 if(!detectedCurrency)warnings.push('ინვოისის ვალუტა ზუსტად ვერ ამოიცნო — დროებით არჩეულია USD; ხელით გადაამოწმე და დაადასტურე.')
 const rate=declaration?.rateToGel||0
 if(!declaration?.rateToGel)warnings.push('საბაჟო/საბუღალტრო კურსი დადასტურებული არ არის — ხელით შესამოწმებელია.')
 const supplier=invoice?.supplierName||declaration?.supplierName||''
 const ex=DEFAULT_EXPENSES.map(e=>({...e}))
 // Customs notice takes precedence, avoiding double-counting declaration VAT.
 const ordered=[...docs.filter(x=>x.result.kind==='customs_notice'),...docs.filter(x=>x.result.kind!=='customs_notice')]
 for(const d of ordered)for(const cost of d.result.expenses)mergeExpense(ex,cost,d.name,warnings)
 if(declaration?.grossTotalKg&&lines.length){const known=lines.reduce((s,l)=>s+(l.grossWeightKg||0),0)
  if(known&&Math.abs(known-declaration.grossTotalKg)>0.05)warnings.push(`ბრუტო წონების ჯამი (${known} კგ) არ ემთხვევა დეკლარაციას (${declaration.grossTotalKg} კგ).`)}
 const sum=lines.reduce((s,l)=>s+l.quantity*l.unitPrice,0)
 if(invoice?.invoiceTotal!=null && Math.abs(sum-invoice.invoiceTotal)>0.05)warnings.push(`ინვოისის ჯამი ${invoice.invoiceTotal} ${currency} და ამოცნობილი პოზიციების ჯამი ${sum.toFixed(2)} ${currency} არ ემთხვევა.`)
 if(!supplier)warnings.push('მომწოდებელი ვერ ამოიცნო.')
 const account=matchSupplier(supplier,accounts);if(!account)warnings.push('მომწოდებლის 3110 ანგარიში გადაამოწმე.')
 const draft:ImportDraft={reference:declaration?.declarationNumber||`IMP-${Date.now()}`,supplierName:supplier,supplierOrisAccount:account,
  invoiceNumber:invoice?.invoiceNumber||'',invoiceDate:sanitizeDate(invoice?.invoiceDate)||date,
  declarationNumber:declaration?.declarationNumber||'',declarationDate:sanitizeDate(declaration?.declarationDate)||date,
  currency,rateToGel:rate,expenseRates:{GEL:1,USD:currency==='USD'?rate:0,EUR:currency==='EUR'?rate:0,CNY:currency==='CNY'?rate:0},
  items:lines,expenses:ex,notes:`საწყისი დოკუმენტები: ${sources.join(', ')}.\nავტომატურად ამოცნობილია, დადასტურებას საჭიროებს.`,status:'draft'}
 if(!declaration)warnings.push('დეკლარაცია არ არის ატვირთული — კურსი და საბაჟო დღგ უნდა გადამოწმდეს.')
 draft.notes += '\nშესამოწმებელი: '+[...new Set(warnings)].join(' | ').slice(0,4500)
 return {draft,warnings:[...new Set(warnings)]}
}
export async function analyzeImportFiles(files:RawUpload[],catalog:MinimalCatalogAccount[]){
 if(!files.length||files.length>10)throw new Error('აირჩიე 1–10 დოკუმენტი.')
 if(files.reduce((s,p)=>s+p.file.size,0)>20*1024*1024)throw new Error('ფაილების ჯამური ზომა არ უნდა აღემატებოდეს 20 MB-ს.')
 const outcomes:Array<{name:string;result:ExtractedDocument}>=[]
 for(const entry of files){
  if(!isAllowedFile(entry.file)||entry.file.size>12*1024*1024)throw new Error(`${entry.file.name}: დაუშვებელი ფორმატი ან ზომა.`)
  const result=await aiRequest(entry.file,entry.role)
  outcomes.push({name:entry.file.name,result})
 }
 return {...enrichUsingDocuments(outcomes,catalog),documents:outcomes.map(x=>({name:x.name,kind:x.result.kind,warnings:x.result.warnings}))}
}
