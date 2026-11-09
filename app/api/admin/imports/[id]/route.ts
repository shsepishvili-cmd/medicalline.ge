import { NextRequest,NextResponse } from 'next/server'
import { messageFromError,requireImportAdmin,statusFromError } from '@/app/lib/import-manager/auth'
import { importDraftSchema } from '@/app/lib/import-manager/schema'
import { calculateImport } from '@/app/lib/import-manager/calculation'

const isUuid=(x:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x)
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params
  if(!isUuid(id))throw new Error('ID არასწორია.')
  const {tokenClient}=await requireImportAdmin(request)
  const {data,error}=await tokenClient.from('oris_import_cards').select('*').eq('id',id).single()
  if(error||!data)throw new Error('იმპორტი ვერ მოიძებნა.')
  const {data:attachments}=await tokenClient.from('oris_import_attachments')
    .select('id,file_name,mime_type,document_kind,created_at').eq('import_id',id)
  return NextResponse.json({ok:true,card:data,attachments:attachments||[]})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}

export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params
  if(!isUuid(id))throw new Error('ID არასწორია.')
  const {tokenClient,user}=await requireImportAdmin(request)
  const input=await request.json()
  const draft=importDraftSchema.parse(input.draft)
  if(draft.id && draft.id!==id)throw new Error('იმპორტის ID არ ემთხვევა.')
  const newStatus=input.action==='approve'?'approved':input.action==='review'?'review':'draft'
  const version=Number(input.version)
  if(!Number.isSafeInteger(version)||version<1)throw new Error('ვერსია არასწორია.')
  const {data:current,error:readError}=await tokenClient.from('oris_import_cards')
    .select('version,status').eq('id',id).single()
  if(readError||!current)throw new Error('იმპორტი ვერ მოიძებნა.')
  if(current.status==='approved')throw new Error('დამტკიცებული იმპორტი დახურულია; შესწორებისთვის ცალკე კორექტირების ბარათია საჭირო.')
  if(current.version!==version)throw new Error('იმპორტი სხვამ უკვე შეცვალა. განაახლე გვერდი, რომ ცვლილებები არ დაიკარგოს.')
  const calculation=calculateImport(draft)
  if(newStatus==='approved'){
    if(!calculation.canApprove)throw new Error(calculation.blockingIssues.join('; '))
    if(!input.confirmedWarnings && calculation.warnings.length)throw new Error('შენიშვნები უნდა დაადასტურო.')
    if(!draft.supplierOrisAccount.match(/^3110\s*\d+/))throw new Error('მომწოდებლის 3110 ანგარიში არასწორია.')
    for(const expense of calculation.expenses){
      if(expense.appliedGel>0 && !expense.counterpartyAccount?.match(/^3110\s*\d+/))
        throw new Error(`${expense.title}: კრედიტორის ORIS 3110 ანგარიში აკლია.`)
    }
  }
  const {data:updated,error}=await tokenClient.from('oris_import_cards')
    .update({reference:draft.reference,supplier_name:draft.supplierName,status:newStatus,
     payload:{...draft,status:newStatus},calculation,version:version+1,updated_by:user.id,updated_at:new Date().toISOString(),
     approved_by:newStatus==='approved'?user.id:null,approved_at:newStatus==='approved'?new Date().toISOString():null})
    .eq('id',id).eq('version',version).select('id,version,status').maybeSingle()
  if(error)throw new Error(error.message)
  if(!updated)throw new Error('ბარათი შეიცვალა სხვა სესიაში. განაახლე გვერდი.')
  await tokenClient.from('oris_import_audit').insert({import_id:id,actor_id:user.id,action:newStatus,
    old_version:version,new_version:version+1,event:{warnings_acknowledged:!!input.confirmedWarnings}})
  if(newStatus==='approved'){
    // Teach future cards only from declared/document-confirmed weights (kg per unit).
    // Do not learn from historical estimates or automatically inferred weights.
    for(const item of draft.items){
      if(item.weightConfidence!=='document'||!item.grossWeightKg||!(item.quantity>0))continue
      const account=item.orisAccount.replace(/\s/g,'')
      await tokenClient.from('oris_import_accounts').update({gross_weight_kg:Number((item.grossWeightKg/item.quantity).toFixed(4)),updated_at:new Date().toISOString()})
        .eq('account',account).eq('kind','product')
    }
  }
  return NextResponse.json({ok:true,card:updated,calculation})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}
