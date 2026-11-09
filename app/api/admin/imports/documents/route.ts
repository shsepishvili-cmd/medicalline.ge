import { NextRequest,NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { messageFromError,requireImportAdmin,statusFromError } from '@/app/lib/import-manager/auth'
export const runtime='nodejs'
const allowed = new Set(['application/pdf','image/png','image/jpeg','text/csv',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])

export async function POST(request:NextRequest){
 try{
  const {tokenClient,user}=await requireImportAdmin(request)
  const form=await request.formData()
  const file=form.get('file'), importId=String(form.get('importId')||''), kind=String(form.get('kind')||'other')
  if(!(file instanceof File))throw new Error('ფაილი არ არის არჩეული.')
  if(!allowed.has(file.type))throw new Error('ფორმატი დაუშვებელია: PDF, JPG, PNG, CSV ან XLSX.')
  if(file.size>20*1024*1024)throw new Error('მაქსიმალური ზომაა 20 MB.')
  if(!/^[0-9a-f-]{36}$/i.test(importId))throw new Error('ჯერ შეინახე იმპორტის ბარათი.')
  const {data:card}=await tokenClient.from('oris_import_cards').select('id,status').eq('id',importId).single()
  if(!card)throw new Error('იმპორტი ვერ მოიძებნა.')
  if(card.status==='approved')throw new Error('დამტკიცებულ იმპორტზე დოკუმენტების დამატება დახურულია.')
  const bytes=new Uint8Array(await file.arrayBuffer())
  const path=`${user.id}/${importId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90)}`
  const {error:uploadError}=await tokenClient.storage.from('oris-import-documents').upload(path,bytes,{contentType:file.type,upsert:false})
  if(uploadError)throw uploadError
  const {data:record,error}=await tokenClient.from('oris_import_attachments').insert({import_id:importId,file_name:file.name,
   mime_type:file.type,storage_path:path,document_kind:kind,created_by:user.id}).select('id,file_name,document_kind').single()
  if(error){await tokenClient.storage.from('oris-import-documents').remove([path]);throw error}
  let extractedText=''
  if(file.type==='application/pdf'){
   try{const pdf=new PDFParse({data:bytes});const result=await pdf.getText();extractedText=result.text.slice(0,20000);await pdf.destroy()}catch{ /* scanned PDF or protected PDF: manual data review required */ }
  }
  return NextResponse.json({ok:true,document:record,extractedText,
   warning:'დოკუმენტის ტექსტი მხოლოდ დასახმარებლადაა; თანხები დაამოწმე ორიგინალით.'})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}

export async function GET(request:NextRequest){
 try{
  const {tokenClient}=await requireImportAdmin(request)
  const id=new URL(request.url).searchParams.get('id')
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('ფაილის ID არასწორია.')
  const {data,error}=await tokenClient.from('oris_import_attachments').select('storage_path').eq('id',id).single()
  if(error||!data)throw new Error('დოკუმენტი ვერ მოიძებნა.')
  const {data:signed,error:signError}=await tokenClient.storage.from('oris-import-documents').createSignedUrl(data.storage_path,60)
  if(signError||!signed)throw new Error('დოკუმენტის ბმული ვერ შეიქმნა.')
  return NextResponse.json({ok:true,url:signed.signedUrl})
 }catch(e){return NextResponse.json({ok:false,error:messageFromError(e)},{status:statusFromError(e)})}
}
