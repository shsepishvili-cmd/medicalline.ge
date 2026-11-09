'use client'
import { useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase-admin-browser'
import { calculateImport } from '../../lib/import-manager/calculation'
import { COST_LABELS,DEFAULT_EXPENSES } from '../../lib/import-manager/types'
import type { ImportDraft, ImportLine, ImportExpense, Currency, CostBasis } from '../../lib/import-manager/types'
import styles from './workspace.module.css'

type Listing={id:string;reference:string;supplier_name:string;status:string;version:number;updated_at:string;calculation?:{landedTotalGel:number}}
type Account={account:string;name:string;kind:string;unit?:string;gross_weight_kg?:number}
const money=(n:number)=>Number(n||0).toLocaleString('ka-GE',{minimumFractionDigits:2,maximumFractionDigits:2})
const today=()=>new Date().toISOString().slice(0,10)
const nextId=()=>globalThis.crypto?.randomUUID?.()||`line-${Date.now()}-${Math.random()}`
const emptyLine=():ImportLine=>({id:nextId(),name:'',orisAccount:'',quantity:1,unit:'ცალი',unitPrice:0,weightConfidence:'unknown'})
const initial=():ImportDraft=>({reference:`IMP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
 supplierName:'',supplierOrisAccount:'',invoiceNumber:'',invoiceDate:today(),declarationNumber:'',declarationDate:today(),
 currency:'USD',rateToGel:2.7,expenseRates:{USD:2.7,EUR:3.1,CNY:0.38},items:[emptyLine()],
 expenses:DEFAULT_EXPENSES.map(x=>({...x})),status:'draft'})
const sample=():ImportDraft=>({reference:'DEMO-IMPORT',supplierName:'სატესტო მომწოდებელი',supplierOrisAccount:'',
 invoiceNumber:'SAMPLE-001',invoiceDate:today(),declarationNumber:'',declarationDate:today(),
 currency:'USD',rateToGel:2.7,expenseRates:{USD:2.7},status:'draft',
 items:[
  {id:nextId(),name:'პროდუქტი A',quantity:2,unit:'ცალი',unitPrice:100,grossWeightKg:10,weightConfidence:'document',orisAccount:''},
  {id:nextId(),name:'პროდუქტი B',quantity:1,unit:'ცალი',unitPrice:250,grossWeightKg:25,weightConfidence:'document',orisAccount:''},
  {id:nextId(),name:'პროდუქტი C',quantity:1,unit:'ცალი',unitPrice:650,grossWeightKg:45,weightConfidence:'document',orisAccount:''},
 ],expenses:DEFAULT_EXPENSES.map(e=>{
  if(e.kind==='international_freight')return {...e,enabled:true,amount:90,currency:'USD',basis:'weight'}
  if(e.kind==='customs_service')return {...e,enabled:true,amount:100,basis:'value'}
  if(e.kind==='terminal')return {...e,enabled:true,amount:59,vatIncluded:true,vatAmount:9,basis:'weight'}
  if(e.kind==='import_vat')return {...e,enabled:true,amount:110,basis:'value'}
  return e
 })})

async function api(path:string,options:RequestInit={}){
 const {data:{session}}=await supabase.auth.getSession()
 if(!session?.access_token)throw new Error('ადმინის ავტორიზაცია აუცილებელია.')
 const response=await fetch(path,{...options,headers:{Authorization:`Bearer ${session.access_token}`,...(options.headers||{})}})
 const result=await response.json().catch(()=>({}))
 if(!response.ok||!result.ok)throw new Error(result.error||`HTTP ${response.status}`)
 return result
}

function AccountSelect({kind,value,onSelect,placeholder}:{kind:'product'|'supplier';value:string;onSelect:(a:Account)=>void;placeholder?:string}){
 const [query,setQuery]=useState(''),[options,setOptions]=useState<Account[]>([]),[focused,setFocused]=useState(false)
 useEffect(()=>{
  if(!focused)return
  const t=setTimeout(()=>{api(`/api/admin/imports/catalog?kind=${kind}&q=${encodeURIComponent(query)}`).then(x=>setOptions(x.accounts||[])).catch(()=>setOptions([]))},280)
  return ()=>clearTimeout(t)
 },[kind,query,focused])
 return <div className={styles.accountField}>
  <input aria-label="ORIS ანგარიში" value={value} placeholder={placeholder||'ORIS ანგარიშის ძებნა'}
   onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),180)}
   onChange={e=>{setQuery(e.target.value);onSelect({account:e.target.value,name:'',kind})}} />
  {focused&&options.length>0&&<div className={styles.suggestions}>{options.slice(0,12).map(a=><button type="button" key={a.account}
   onMouseDown={ev=>ev.preventDefault()} onClick={()=>{onSelect(a);setQuery('');setFocused(false)}}>
   <b>{a.account}</b><span>{a.name}</span></button>)}</div>}
 </div>
}

export default function ImportManagerPage(){
 const [list,setList]=useState<Listing[]>([]),[currentId,setCurrentId]=useState<string|undefined>()
 const [version,setVersion]=useState(1),[draft,setDraft]=useState<ImportDraft>(initial)
 const [active,setActive]=useState<'imports'|'details'|'costs'|'documents'>('imports')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [docs,setDocs]=useState<Array<{id:string;file_name:string;document_kind:string}>>([])
 const [extractedText,setExtractedText]=useState(''),[docKind,setDocKind]=useState('invoice')
 const [catalogFile,setCatalogFile]=useState<File|null>(null)
 const [autoWarnings,setAutoWarnings]=useState<string[]>([])
 const [autoSources,setAutoSources]=useState<Array<{name:string;kind:string}>>([])
 const [authenticated,setAuthenticated]=useState(false)
 const calculation=useMemo(()=>calculateImport(draft),[draft])
 const locked=draft.status==='approved'

 useEffect(()=>{supabase.auth.getSession().then(({data})=>{
  setAuthenticated(!!data.session)
  if(data.session) api('/api/admin/imports').then(x=>setList(x.imports||[])).catch(e=>setError(e.message))
 })},[])
 function update<K extends keyof ImportDraft>(key:K,value:ImportDraft[K]){setDraft(prev=>({...prev,[key]:value}))}
 function updateLine(id:string,patch:Partial<ImportLine>){setDraft(prev=>({...prev,items:prev.items.map(x=>x.id===id?{...x,...patch}:x)}))}
 function updateExpense(id:string,patch:Partial<ImportExpense>){setDraft(prev=>({...prev,expenses:prev.expenses.map(x=>x.id===id?{...x,...patch}:x)}))}
 async function refresh(){const x=await api('/api/admin/imports');setList(x.imports||[])}
 async function open(id:string){
  try{setBusy(true);setError('');const data=await api(`/api/admin/imports/${id}`)
   setCurrentId(id);setDraft(data.card.payload);setVersion(data.card.version);setDocs(data.attachments||[]);setActive('details')
  }catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}
 }
 function newImport(){setCurrentId(undefined);setDraft(initial());setVersion(1);setDocs([]);setExtractedText('');setAutoWarnings([]);setAutoSources([]);setError('');setActive('details')}
 async function save(action:'draft'|'review'|'approve'='draft'){
  try{
   setError('');setNotice('');setBusy(true)
   if(action==='approve'&&!window.confirm('დაადასტურე ყველა შეფასება და შენიშვნა.\nგატარებამდე ORIS-ის საცდელ ბაზაში გადაამოწმე რაოდენობები და ღირებულებები.')) return
   if(!currentId){
    if(action!=='draft')throw new Error('ჯერ შეინახე ბარათი, შემდეგ მოითხოვე დამტკიცება.')
    const result=await api('/api/admin/imports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,status:'draft'})}) as {id:string}
    setCurrentId(result.id);setDraft(prev=>({...prev,id:result.id,status:'draft'}))
   }else{
    const result=await api(`/api/admin/imports/${currentId}`,{method:'PUT',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({draft,version,action,confirmedWarnings:action==='approve'})}) as {card:{version:number;status:ImportDraft['status']}}
    setVersion(result.card.version);setDraft(prev=>({...prev,status:result.card.status}))
   }
   setNotice(action==='approve'?'დამტკიცდა. ახლა შესაძლებელია სატესტო CSV-ის შექმნა.':'იმპორტის ბარათი შენახულია.')
   await refresh()
  }catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}
 }
 async function analyzeFiles(files:FileList|null){
  if(!files?.length)return
  if(currentId&&!window.confirm('ამჟამინდელი ბარათის ველები დოკუმენტებიდან ამოცნობილი მონაცემებით ჩანაცვლდება. გავაგრძელოთ?'))return
  if(!currentId&&draft.items.some(x=>x.name.trim())&&!window.confirm('ახლანდელი მონახაზი ჩანაცვლდება დოკუმენტების მონაცემებით. გაგრძელდეს?'))return
  try{setBusy(true);setError('');setNotice('')
   const form=new FormData();for(const f of Array.from(files))form.append('files',f)
   const result=await api('/api/admin/imports/analyze',{method:'POST',body:form})
   if(!result.draft)throw new Error('დოკუმენტებიდან ბარათი ვერ შეიქმნა.')
   const nextDraft={...result.draft,status:'draft'} as ImportDraft
   setDraft(nextDraft);setCurrentId(undefined);setVersion(1);setDocs([])
   setAutoWarnings(result.warnings||[]);setAutoSources(result.documents||[]);setActive('imports')
   // Keep partially extracted cards on screen without fabricating missing compulsory values.
   if(nextDraft.supplierName.trim()&&nextDraft.rateToGel>0&&nextDraft.items.length&&nextDraft.items.every(l=>l.name.trim()&&l.quantity>0)){
    const saved=await api('/api/admin/imports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(nextDraft)})
    const id=String(saved.id);setCurrentId(id);setDraft({...nextDraft,id})
    const docResults:Array<{id:string;file_name:string;document_kind:string}>=[];const failed:string[]=[]
    for(let i=0;i<files.length;i++){
     const f=files[i],body=new FormData();body.set('file',f);body.set('importId',id)
     body.set('kind',result.documents?.[i]?.kind||'other')
     try{const uploaded=await api('/api/admin/imports/documents',{method:'POST',body});docResults.push(uploaded.document)}
     catch{failed.push(f.name)}
    }
    setDocs(docResults);await refresh()
    setNotice(`ავტომატურად შეიქმნა იმპორტის მონახაზი და შეინახა ${docResults.length} დოკუმენტი. გადაამოწმე კალკულაცია.${failed.length?' ფაილები ვერ შეინახა: '+failed.join(', '):''}`)
   }else setNotice('დოკუმენტები დამუშავდა, მაგრამ ძირითადი მონაცემები არასრულია. ჯერ გადაამოწმე და შეავსე გამოტოვებული ველები; შემდეგ შეინახე.')
  }catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}
 }
 async function uploadDocument(file:File){
  if(!currentId){setError('ჯერ შეინახე იმპორტის ბარათი.');return}
  try{setBusy(true);setError('');const body=new FormData();body.set('file',file);body.set('importId',currentId);body.set('kind',docKind)
   const result=await api('/api/admin/imports/documents',{method:'POST',body})
   setDocs(prev=>[...prev,result.document]);setExtractedText(result.extractedText||'');setNotice('დოკუმენტი შენახულია. მონაცემები გადამოწმების შემდეგ შეიყვანე.')
  }catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}
 }
 async function catalogUpload(){if(!catalogFile)return
  try{setBusy(true);setError('');const form=new FormData();form.set('file',catalogFile)
   const result=await api('/api/admin/imports/catalog',{method:'POST',body:form})
   setNotice(`ORIS ცნობარში ჩაიტვირთა ${result.count} ანგარიში (${result.products} პროდუქტი / ${result.suppliers} მომწოდებელი).`)
  }catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}
 }
 async function openDocument(id:string){
  try{const result=await api(`/api/admin/imports/documents?id=${encodeURIComponent(id)}`);window.open(result.url,'_blank','noopener,noreferrer')}catch(e){setError(String(e instanceof Error?e.message:e))}
 }
 async function exportCsv(){
  if(!currentId||!locked)return
  try{setBusy(true);setError('')
   const {data:{session}}=await supabase.auth.getSession()
   const response=await fetch(`/api/admin/imports/${currentId}/oris`,{headers:{Authorization:`Bearer ${session?.access_token}`}})
   if(!response.ok){const json=await response.json().catch(()=>({}));throw new Error(json.error||'ფაილი ვერ შეიქმნა.')}
   const blob=await response.blob(),url=URL.createObjectURL(blob)
   const a=document.createElement('a');a.href=url;a.download=`ORIS_${draft.reference}_TEST.csv`;document.body.appendChild(a);a.click();a.remove()
   setTimeout(()=>URL.revokeObjectURL(url),5000)
  }catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}
 }
 function numeric(value:string){return Number(value.replace(',','.'))||0}
 const input=(label:string,value:string|number,onChange:(s:string)=>void,opts?:{type?:string;readonly?:boolean})=><label className={styles.field}>
   <span>{label}</span><input disabled={locked||opts?.readonly} type={opts?.type||'text'} value={value??''} onChange={e=>onChange(e.target.value)} /></label>
 return <main className={styles.page}>
   <header className={styles.header}>
    <div><a href="/admin" className={styles.back}>← ადმინისტრირება</a><div className={styles.eyebrow}>MEDICAL LINE GEORGIA • ORIS 5.238</div>
    <h1>იმპორტების მართვა</h1><p>ინვოისი, საბაჟო დეკლარაცია, ხარჯების განაწილება და ORIS-ის გატარებები ერთ სივრცეში.</p></div>
    <div className={styles.headerActions}><button className={styles.outline} onClick={()=>{setDraft(sample());setCurrentId(undefined);setVersion(1);setActive('details')}}>სატესტო მაგალითი</button>
    <button onClick={newImport} className={styles.primary}>＋ ახალი იმპორტი</button></div>
   </header>
   {!authenticated&&<div className={styles.banner}>ადმინისტრატორის სესია არ არის აქტიური. <a href="/admin">შედი ადმინში</a>.</div>}
   {error&&<div className={styles.error} role="alert">{error}<button onClick={()=>setError('')}>✕</button></div>}
   {notice&&<div className={styles.success}>{notice}<button onClick={()=>setNotice('')}>✕</button></div>}
   <section className={styles.autoPanel}>
    <div><b>📄 დოკუმენტებიდან ავტომატური იმპორტი</b><p>ატვირთე ერთდროულად ინვოისი, დეკლარაცია, Packing List და ხარჯების საბუთები. სისტემა თავად შეავსებს ბარათს და გამოთვლის თვითღირებულებას. კოდები და უცნობი მონაცემები დადასტურებას დაელოდება.</p></div>
    <label className={styles.autoUpload}><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" disabled={busy||locked} onChange={e=>{analyzeFiles(e.target.files);e.target.value=''}} />
     {busy?'დოკუმენტები მუშავდება…':'＋ ატვირთე დოკუმენტები და ავტომატურად დაითვალე'}</label>
    <p className={styles.muted}>AI-მოდული მუშაობს მხოლოდ სერვერზე კონფიგურირებული გასაღებით. ფაილები იგზავნება AI-მომსახურებასთან ამოცნობისთვის. ეს ნაბიჯი არ ქმნის ORIS-ის გატარებებს.</p>
    {autoSources.length>0&&<p className={styles.autoSources}>ამოცნობილი ფაილები: {autoSources.map(d=>`${d.name} (${d.kind})`).join(' · ')}</p>}
    {autoWarnings.length>0&&<div className={styles.warnings}><b>ავტომატური ამოცნობის გადასამოწმებელი საკითხები:</b>{autoWarnings.map((w,i)=><p key={i}>◦ {w}</p>)}</div>}
   </section>
   <div className={styles.layout}>
    <aside className={styles.sidebar}>
     <div className={styles.sidebarTop}><h2>იმპორტები</h2><button onClick={()=>refresh().catch(e=>setError(e.message))}>⟳</button></div>
     <div className={styles.cardList}>{list.length?list.map(c=><button key={c.id}
      className={`${styles.listCard} ${c.id===currentId?styles.selected:''}`} onClick={()=>open(c.id)}>
      <b>{c.reference}</b><small>{c.supplier_name}</small><span>{c.status==='approved'?'დამტკიცებული':c.status==='review'?'მოსამზადებელი':'მონახაზი'} · {money(c.calculation?.landedTotalGel||0)} ₾</span></button>):
       <p className={styles.muted}>ჯერ იმპორტები არ არის დამატებული.</p>}</div>
     <div className={styles.catalogUpload}><h3>ORIS-ის ცნობარის ჩატვირთვა</h3><p>მოამზადე პროდუქციისა და 3110 ანგარიშების XLSX ან UTF-8 CSV.</p>
      <input type="file" accept=".xlsx,.csv" onChange={e=>setCatalogFile(e.target.files?.[0]||null)} />
      <button disabled={!catalogFile||busy} onClick={catalogUpload}>ცნობარის იმპორტი</button></div>
    </aside>
    <section className={styles.content}>
     <nav className={styles.tabs}>{([['imports','შეჯამება'],['details','პროდუქცია'],['costs','დამატებითი ხარჯები'],['documents','დოკუმენტები']] as const).map(([k,v])=><button
      className={active===k?styles.active:''} key={k} onClick={()=>setActive(k)}>{v}</button>)}</nav>
     {active==='imports'&&<div className={styles.section}>
       <div className={styles.sectionTitle}><h2>თვითღირებულების კალკულაცია</h2><span className={styles.badge}>{locked?'დამტკიცებული':'პროექტი'}</span></div>
       <div className={styles.kpis}><article><span>საქონელი, GEL</span><b>{money(calculation.goodsGel)}</b></article>
       <article><span>გასანაწილებელი ხარჯები</span><b>{money(calculation.totalCapitalizedExpensesGel)}</b></article>
       <article><span>დღგ ცალკე</span><b>{money(calculation.totalVatGel)}</b></article>
       <article className={styles.highlight}><span>ჯამური თვითღირებულება</span><b>{money(calculation.landedTotalGel)} ₾</b></article></div>
       <div className={styles.tableWrap}><table><thead><tr><th>პროდუქტი</th><th>ORIS</th><th>რაოდ.</th><th>ინვოისი GEL</th><th>დამატებითი</th><th>თვითღირებულება GEL</th><th>ერთეული GEL</th></tr></thead>
       <tbody>{calculation.lines.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.orisAccount||'—'}</td><td>{x.quantity}</td><td>{money(x.invoiceGel)}</td>
       <td>{money(x.landedGel-x.invoiceGel)}</td><td><strong>{money(x.landedGel)}</strong></td><td>{money(x.unitLandedGel)}</td></tr>)}</tbody></table></div>
       {calculation.expenses.length>0&&<div className={styles.tableWrap}><h3>ხარჯებისა და დღგ-ის კონტროლი</h3><table><thead><tr><th>დასახელება</th><th>განაწილების მეთოდი</th><th>თვითღირებულებაში</th><th>დღგ ცალკე</th></tr></thead><tbody>
         {calculation.expenses.map(x=><tr key={x.id}><td>{x.title}</td><td>{x.basisUsed}</td><td>{money(x.appliedGel)} ₾</td><td>{money(x.vatGel)} ₾</td></tr>)}</tbody></table></div>}
       {(calculation.warnings.length>0||calculation.blockingIssues.length>0)&&<div className={styles.warnings}><h3>გადასამოწმებელი საკითხები</h3>
        {calculation.blockingIssues.map((x,i)=><p key={`e-${i}`}><b>●</b> {x}</p>)}
        {calculation.warnings.map((x,i)=><p key={`w-${i}`}>◦ {x}</p>)}
       </div>}
       <div className={styles.actionRow}><button disabled={busy||locked} className={styles.outline} onClick={()=>save('draft')}>მონახაზის შენახვა</button>
       <button disabled={busy||locked||!currentId} className={styles.outline} onClick={()=>save('review')}>შემოწმებაზე გადატანა</button>
       <button disabled={busy||locked||!currentId||!calculation.canApprove} className={styles.primary} onClick={()=>save('approve')}>დამტკიცება</button>
       <button disabled={busy||!locked} className={styles.dark} onClick={exportCsv}>ORIS-ის საცდელი CSV ↓</button></div>
       <p className={styles.muted}>CSV ავტომატურად არ შეაქვს გატარებებს ORIS-ში. ჯერ მხოლოდ ბაზის ასლზე შეამოწმე.</p>
     </div>}
     {active==='details'&&<div className={styles.section}><div className={styles.sectionTitle}><h2>იმპორტის ბარათი</h2><span className={styles.muted}>დოკუმენტების მონაცემები და პროდუქციის შესაბამისობა</span></div>
      <div className={styles.formGrid}>
       {input('იმპორტის ნომერი',draft.reference,v=>update('reference',v))}
       {input('მომწოდებელი',draft.supplierName,v=>update('supplierName',v))}
       <label className={styles.field}><span>მომწოდებლის ORIS 3110 ანგარიში</span>
         <AccountSelect kind="supplier" value={draft.supplierOrisAccount} onSelect={a=>setDraft(p=>({...p,supplierOrisAccount:a.account,supplierName:a.name||p.supplierName}))}/></label>
       {input('ინვოისის ნომერი',draft.invoiceNumber,v=>update('invoiceNumber',v))}
       {input('ინვოისის თარიღი',draft.invoiceDate,v=>update('invoiceDate',v),{type:'date'})}
       {input('დეკლარაციის ნომერი',draft.declarationNumber,v=>update('declarationNumber',v))}
       {input('დეკლარაციის თარიღი',draft.declarationDate,v=>update('declarationDate',v),{type:'date'})}
       <label className={styles.field}><span>ინვოისის ვალუტა</span><select disabled={locked} value={draft.currency} onChange={e=>update('currency',e.target.value as Currency)}>{['USD','EUR','GEL','CNY'].map(v=><option key={v}>{v}</option>)}</select></label>
       {input(`1 ${draft.currency} = GEL (კურსი)`,draft.rateToGel,v=>{const n=numeric(v);setDraft(p=>({...p,rateToGel:n,expenseRates:{...p.expenseRates,[p.currency]:n}}))},{type:'number'})}
       {(['USD','EUR','CNY'] as const).filter(x=>x!==draft.currency).map(currency=>input(`${currency} ხარჯების კურსი GEL`,draft.expenseRates[currency]||'',v=>update('expenseRates',{...draft.expenseRates,[currency]:numeric(v)}),{type:'number'}))}
      </div>
      <div className={styles.sectionTitle}><h3>პროდუქციის ჩამონათვალი</h3><button disabled={locked} onClick={()=>update('items',[...draft.items,emptyLine()])}>＋ საქონლის დამატება</button></div>
      <div className={styles.tableWrap}><table className={styles.editTable}><thead><tr><th>პროდუქტი / დასახელება</th><th>ORIS ანგარიში</th><th>HS</th><th>რაოდ.</th><th>ფასი</th><th>ბრუტო კგ</th><th>ნეტო კგ</th><th>წონის წყარო</th><th></th></tr></thead><tbody>
      {draft.items.map(l=><tr key={l.id}><td><input disabled={locked} value={l.name} onChange={e=>updateLine(l.id,{name:e.target.value})} placeholder="პროდუქტის დასახელება" /></td>
       <td><AccountSelect kind="product" value={l.orisAccount} onSelect={a=>updateLine(l.id,{orisAccount:a.account,name:a.name||l.name,unit:a.unit||l.unit,
        ...(!l.grossWeightKg&&Number(a.gross_weight_kg)>0?{grossWeightKg:Number(a.gross_weight_kg)*l.quantity,weightConfidence:'history' as const}:{})})}/></td>
       <td><input disabled={locked} value={l.hsCode||''} onChange={e=>updateLine(l.id,{hsCode:e.target.value})}/></td>
       <td><input disabled={locked} type="number" min="0.001" step="any" value={l.quantity} onChange={e=>updateLine(l.id,{quantity:numeric(e.target.value)})}/></td>
       <td><input disabled={locked} type="number" min="0" step="any" value={l.unitPrice} onChange={e=>updateLine(l.id,{unitPrice:numeric(e.target.value)})}/></td>
       <td><input disabled={locked} type="number" min="0" step="any" value={l.grossWeightKg??''} onChange={e=>updateLine(l.id,{grossWeightKg:e.target.value?numeric(e.target.value):null})}/></td>
       <td><input disabled={locked} type="number" min="0" step="any" value={l.netWeightKg??''} onChange={e=>updateLine(l.id,{netWeightKg:e.target.value?numeric(e.target.value):null})}/></td>
       <td><select disabled={locked} value={l.weightConfidence||'unknown'} onChange={e=>updateLine(l.id,{weightConfidence:e.target.value as ImportLine['weightConfidence']})}>
        <option value="unknown">უცნობია</option><option value="document">დოკუმენტი</option><option value="history">წინა იმპორტი</option><option value="estimated">შეფასება</option></select></td>
       <td><button disabled={locked||draft.items.length===1} onClick={()=>update('items',draft.items.filter(x=>x.id!==l.id))}>✕</button></td></tr>)}</tbody></table></div>
      <div className={styles.actionRow}><button className={styles.primary} disabled={busy||locked} onClick={()=>save('draft')}>შენახვა</button><button className={styles.outline} onClick={()=>setActive('costs')}>შემდეგი: ხარჯები →</button></div>
     </div>}
     {active==='costs'&&<div className={styles.section}><div className={styles.sectionTitle}><h2>დამატებითი ხარჯების განაწილება</h2><button disabled={locked}
      onClick={()=>update('expenses',[...draft.expenses,{id:nextId(),kind:'other',title:'ახალი ხარჯი',enabled:true,amount:0,
      currency:'GEL',vatIncluded:false,vatRate:18,vatDeductible:true,basis:'auto'}])}>＋ ხარჯის დამატება</button></div>
      <p className={styles.help}>ჩართე მხოლოდ საჭირო ხარჯები. ბრუტო წონის არქონისას პროგრამა გამოიყენებს ღირებულების პროპორციას და გაფრთხილებას აჩვენებს.</p>
      {draft.expenses.map(ex=><div key={ex.id} className={`${styles.costCard} ${ex.enabled?styles.costEnabled:''}`}>
       <label className={styles.costToggle}><input type="checkbox" checked={ex.enabled} disabled={locked} onChange={e=>updateExpense(ex.id,{enabled:e.target.checked})}/>
       <b>{COST_LABELS[ex.kind]}{ex.kind==='other'?' / '+ex.title:''}</b></label>
       {ex.kind==='other'&&!ex.id.startsWith('cost-')&&<button className={styles.removeCost} disabled={locked} onClick={()=>update('expenses',draft.expenses.filter(x=>x.id!==ex.id))}>ხარჯის წაშლა ✕</button>}
       {ex.enabled&&<div className={styles.costGrid}>
        <label><span>ხარჯის დასახელება</span><input disabled={locked} value={ex.title} onChange={e=>updateExpense(ex.id,{title:e.target.value})}/></label>
        <label><span>თანხა (დოკუმენტით)</span><input disabled={locked} type="number" min="0" step="0.01" value={ex.amount} onChange={e=>updateExpense(ex.id,{amount:numeric(e.target.value)})}/></label>
        <label><span>ვალუტა</span><select disabled={locked} value={ex.currency} onChange={e=>updateExpense(ex.id,{currency:e.target.value as Currency})}>{['GEL','USD','EUR','CNY'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>განაწილება</span><select disabled={locked} value={ex.basis} onChange={e=>updateExpense(ex.id,{basis:e.target.value as CostBasis})}>
         {[['auto','ავტომატურად'],['weight','ბრუტო წონით'],['value','საქონლის ღირებულებით'],['declared','საბაჟო ღირებულებით'],['equal','თანაბრად'],['manual','ხელით']].map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></label>
        {ex.basis==='manual'&&<div className={styles.manualShares}>
         <span>ხელით განაწილების წილები</span>{draft.items.map(l=><label key={l.id}>{l.name||'პროდუქტი'}
         <input disabled={locked} type="number" min="0" step="any" value={l.manualShares?.[ex.id]??''}
           onChange={e=>updateLine(l.id,{manualShares:{...l.manualShares,[ex.id]:numeric(e.target.value)}})}/></label>)}</div>}
        {ex.kind!=='import_vat'&&<label className={styles.check}><input disabled={locked} type="checkbox" checked={ex.vatIncluded} onChange={e=>updateExpense(ex.id,{vatIncluded:e.target.checked})}/> თანხა შეიცავს დღგ-ს</label>}
        {ex.vatIncluded&&<label><span>დღგ-ის თანხა (თუ ცნობილია)</span><input disabled={locked} type="number" value={ex.vatAmount??''} step="0.01" onChange={e=>updateExpense(ex.id,{vatAmount:e.target.value?numeric(e.target.value):null})}/></label>}
        {ex.kind!=='import_vat'&&<label className={styles.check}><input disabled={locked} type="checkbox" checked={ex.vatDeductible} onChange={e=>updateExpense(ex.id,{vatDeductible:e.target.checked})}/> ჩასათვლელი დღგ</label>}
        {ex.kind!=='import_vat'&&<label className={styles.check}><input disabled={locked} type="checkbox" checked={!!ex.includedInInvoice} onChange={e=>updateExpense(ex.id,{includedInInvoice:e.target.checked})}/> უკვე შედის ინვოისის ღირებულებაში</label>}
        <label><span>კონტრაგენტის ORIS 3110 ანგარიში</span><AccountSelect kind="supplier" value={ex.counterpartyAccount||''} onSelect={a=>updateExpense(ex.id,{counterpartyAccount:a.account})}/></label>
       </div>}
      </div>)}
      <div className={styles.actionRow}><button className={styles.primary} disabled={busy||locked} onClick={()=>save('draft')}>ხარჯების შენახვა</button><button className={styles.outline} onClick={()=>setActive('imports')}>კალკულაციის ნახვა →</button></div>
     </div>}
     {active==='documents'&&<div className={styles.section}><h2>იმპორტის დოკუმენტები</h2><p className={styles.help}>ფაილები ინახება დახურულ საცავში. ტექსტური PDF იკითხება, მაგრამ მისგან ამოღებული მონაცემები აუცილებლად გადაამოწმე.</p>
      <label className={styles.field}><span>დოკუმენტის ტიპი</span><select value={docKind} onChange={e=>setDocKind(e.target.value)}>
       {Object.entries({invoice:'მომწოდებლის ინვოისი',declaration:'საბაჟო დეკლარაცია',packing:'Packing List',transport:'ტრანსპორტირება',terminal:'ტერმინალი',other:'სხვა'}).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
      <label className={styles.upload}><span>＋ აირჩიე PDF / JPG / PNG / XLSX / CSV</span><input type="file" disabled={locked||busy||!currentId} onChange={e=>{const f=e.target.files?.[0];if(f)uploadDocument(f);e.target.value=''}}/></label>
      <div className={styles.documentList}>{docs.map(d=><p key={d.id}><button type="button" className={styles.docButton} onClick={()=>openDocument(d.id)}>📎 {d.file_name} ↗</button><small>{d.document_kind}</small></p>)}</div>
      {extractedText&&<details><summary>PDF-დან ამოღებული ტექსტის ნახვა</summary><pre className={styles.extracted}>{extractedText}</pre></details>}
      {!currentId&&<p className={styles.help}>ჯერ შეინახე იმპორტის ბარათი, შემდეგ შეძლებ დოკუმენტების დამატებას.</p>}
     </div>}
    </section>
   </div>
  </main>
}
