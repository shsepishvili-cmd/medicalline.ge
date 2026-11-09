import {NextRequest,NextResponse} from 'next/server'
import { unzipSync,strFromU8 } from 'fflate'
import {messageFromError,requireImportAdmin,statusFromError} from '@/app/lib/import-manager/auth'
export const runtime='nodejs'

type Account={account:string;name:string;kind:'supplier'|'product';unit:string|null}
const cleanText=(text:string)=>text.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
function excelRows(data:Uint8Array):string[][]{
 const zip=unzipSync(data)
 const ss=strFromU8(zip['xl/sharedStrings.xml']||new Uint8Array())
 const shared=[...ss.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>cleanText(m[1]))
 const paths=Object.keys(zip).filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p))
 const rows:string[][]=[]
 for(const path of paths){
  const xml=strFromU8(zip[path])
  for(const m of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
   const cols:string[]=[]
   for(const c of m[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
    const addr=/\br="([A-Z]+)\d+"/.exec(c[1])?.[1]||''
    const index=[...addr].reduce((v,x)=>v*26+x.charCodeAt(0)-64,0)-1
    if(index<0||index>20)continue
    const value=c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1]??c[2].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]??''
    cols[index]=/\bt="s"/.test(c[1]) ? shared[Number(value)]||'':cleanText(value)
   }
   if(cols.some(Boolean)) rows.push(cols)
   if(rows.length>12000) throw new Error('ფაილში ძალიან ბევრი სტრიქონია.')
  }
 }
 return rows
}
function csvRows(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false
 for(let i=0;i<text.length;i++){
  const c=text[i]
  if(c==='"'&&quoted&&text[i+1]==='"'){value+='"';i++}
  else if(c==='"')quoted=!quoted
  else if(c===','&&!quoted){row.push(value);value=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value=''}
  else value+=c
 }
 if(value||row.length){row.push(value);rows.push(row)}
 return rows
}
function toAccounts(rows:string[][]):Account[]{
 const map=new Map<string,Account>()
 for(const cells of rows){
  const group=(cells[0]||'').trim().replace(/\s/g,'')
  const account=(cells[1]||'').trim().replace(/\s/g,'')
  const name=(cells[3]||'').trim()
  if(!['1610','1611','3110'].includes(group)||!/^\d+$/.test(account)||!name||!account.startsWith(group))continue
  map.set(account,{account,name:name.slice(0,500),kind:group==='3110'?'supplier':'product',unit:cells[5]?.trim()||null})
 }
 return [...map.values()]
}
export async function GET(req:NextRequest){
 try{
  const {tokenClient}=await requireImportAdmin(req)
  const url=new URL(req.url);const kind=url.searchParams.get('kind')
  const q=(url.searchParams.get('q')||'').replace(/[%_,()]/g,' ').trim().slice(0,100)
  let query=tokenClient.from('oris_import_accounts').select('*').order('name').limit(100)
  if(kind==='supplier'||kind==='product')query=query.eq('kind',kind)
  if(q)query=query.or(`account.ilike.%${q}%,name.ilike.%${q}%`)
  const {data,error}=await query
  if(error)throw error
  return NextResponse.json({ok:true,accounts:data||[]})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}
export async function POST(req:NextRequest){
 try{
  const {tokenClient}=await requireImportAdmin(req)
  const form=await req.formData(),file=form.get('file')
  if(!(file instanceof File))throw new Error('აირჩიე ORIS-ის დამუშავებული XLSX ან UTF-8 CSV ცნობარი.')
  if(file.size>6*1024*1024)throw new Error('ცნობარის მაქსიმალური ზომაა 6 MB.')
  const bytes=new Uint8Array(await file.arrayBuffer())
  const rows=/\.xlsx$/i.test(file.name) ? excelRows(bytes):csvRows(new TextDecoder('utf-8').decode(bytes))
  const accounts=toAccounts(rows)
  if(!accounts.length)throw new Error('ვერ მოიძებნა ჯგუფი, ORIS ანგარიში და დასახელება. გამოიყენე ORIS_Import_Master_Data.xlsx.')
  for(let i=0;i<accounts.length;i+=150){
    const {error}=await tokenClient.from('oris_import_accounts').upsert(accounts.slice(i,i+150),{onConflict:'account'})
    if(error)throw error
  }
  return NextResponse.json({ok:true,count:accounts.length,products:accounts.filter(a=>a.kind==='product').length,
   suppliers:accounts.filter(a=>a.kind==='supplier').length})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}
