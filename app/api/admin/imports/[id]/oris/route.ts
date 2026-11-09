import { NextRequest, NextResponse } from 'next/server'
import { messageFromError,requireImportAdmin,statusFromError } from '@/app/lib/import-manager/auth'
import { importDraftSchema } from '@/app/lib/import-manager/schema'
import { calculateImport } from '@/app/lib/import-manager/calculation'
import { buildOrisRows,buildOrisCsvBytes } from '@/app/lib/import-manager/oris'

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params
  const {tokenClient,user}=await requireImportAdmin(request)
  const {data,error}=await tokenClient.from('oris_import_cards').select('status,payload,reference,version').eq('id',id).single()
  if(error||!data)throw new Error('იმპორტი ვერ მოიძებნა.')
  if(data.status!=='approved')throw new Error('ORIS CSV ხელმისაწვდომია მხოლოდ დამტკიცებული იმპორტისთვის.')
  const draft=importDraftSchema.parse(data.payload)
  const calc=calculateImport(draft)
  if(!calc.canApprove)throw new Error('კალკულაციის კონტროლი ვერ გაიარა.')
  const rows=buildOrisRows(draft,calc)
  const bytes=buildOrisCsvBytes(rows)
  await tokenClient.from('oris_import_audit').insert({import_id:id,actor_id:user.id,action:'csv_download',
     old_version:data.version,new_version:data.version,event:{rows:rows.length,amount:rows.reduce((s,x)=>s+x.amount,0)}})
  const name=`ORIS_IMPORT_${data.reference.replace(/[^\w-]/g,'_').slice(0,50)}_TEST.csv`
  return new NextResponse(Buffer.from(bytes),{headers:{
   'Content-Type':'text/csv; charset=windows-1252',
   'Content-Disposition':`attachment; filename="${name}"`,
   'Cache-Control':'private, no-store',
   'X-ORIS-Warning':'Preview and test-import only; verify quantity and balances',
  }})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}
