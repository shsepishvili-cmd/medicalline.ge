import { NextRequest, NextResponse } from 'next/server'
import { messageFromError,requireImportAdmin,statusFromError } from '@/app/lib/import-manager/auth'
import { analyzeImportFiles, detectKind } from '@/app/lib/import-manager/automatic'
export const runtime='nodejs'
export const maxDuration=300

export async function POST(request:NextRequest){
 try{
  const {tokenClient}=await requireImportAdmin(request)
  const form=await request.formData()
  const files=form.getAll('files').filter(x=>x instanceof File) as File[]
  const result=await tokenClient.from('oris_import_accounts').select('account,name,kind,unit,gross_weight_kg').limit(2000)
  if(result.error)throw result.error
  const roles=form.getAll('roles').map(x=>String(x))
  const analysis=await analyzeImportFiles(files.map((file,i)=>({file,role:roles[i]||detectKind(file.name)})),result.data||[])
  return NextResponse.json({ok:true,...analysis})
 }catch(error){return NextResponse.json({ok:false,error:messageFromError(error)},{status:statusFromError(error)})}
}
