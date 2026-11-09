import { NextRequest } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'

export async function requireImportAdmin(request:NextRequest) {
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()
  if(!token)throw new Error('Unauthorized')
  const session=await requireWarrantySession(token)
  if(session.profile.role!=='admin')throw new Error('Forbidden')
  return session
}
export function messageFromError(error:unknown){
 if(error instanceof Error)return error.message
 if(typeof error==='string')return error
 if(error&&typeof error==='object'){
  const value=error as Record<string,unknown>
  const details=[value.message,value.details,value.hint]
   .filter((item):item is string=>typeof item==='string'&&item.trim().length>0)
  if(details.length)return details.join(' — ')
  try{return JSON.stringify(error)}catch{return 'უცნობი შეცდომა'}
 }
 return 'უცნობი შეცდომა'
}
export function statusFromError(error:unknown){
 const message=messageFromError(error)
 return message==='Unauthorized'?401:message==='Forbidden'?403:400
}
