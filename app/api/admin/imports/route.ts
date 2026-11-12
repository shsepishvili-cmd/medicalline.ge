import { NextRequest,NextResponse } from 'next/server'
import { messageFromError,requireImportAdmin,statusFromError } from '@/app/lib/import-manager/auth'
import { importDraftSchema } from '@/app/lib/import-manager/schema'
import { calculateImport } from '@/app/lib/import-manager/calculation'

export async function GET(request:NextRequest){
 try{
  const {tokenClient}=await requireImportAdmin(request)
  const {data,error}=await tokenClient.from('oris_import_cards')
   .select('id,reference,supplier_name,status,version,calculation,created_at,updated_at')
   .order('updated_at',{ascending:false}).limit(300)
  if(error)throw error
  return NextResponse.json({ok:true,imports:data||[]})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}

export async function POST(request:NextRequest){
 try{
  const {tokenClient,user}=await requireImportAdmin(request)
  const data=importDraftSchema.parse(await request.json())
  if(data.status==='approved')throw new Error('პირველადი შექმნისას მხოლოდ მონახაზის შენახვა შეიძლება.')
  const calc=calculateImport(data)
  const {data:card,error}=await tokenClient.from('oris_import_cards')
   .insert({reference:data.reference,supplier_name:data.supplierName,payload:data,calculation:calc,
     status:'draft',created_by:user.id,updated_by:user.id}).select('id,version').single()
  if(error||!card)throw new Error(error?.message||'იმპორტი ვერ შეინახა.')
  await tokenClient.from('oris_import_audit').insert({import_id:card.id,actor_id:user.id,action:'created',new_version:1})
  return NextResponse.json({ok:true,id:card.id,calculation:calc},{status:201})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}
