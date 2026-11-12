import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/app/lib/supabase-service'
import { createSignedStorageUrl } from '@/app/lib/supabase-server'

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params
    const admin = createSupabaseServiceClient()
    const { data: act } = await admin.from('invoice_acceptance_acts').select('pdf_path').eq('public_token', token).neq('status', 'cancelled').single()
    if (!act?.pdf_path) return new NextResponse('PDF not found.', { status: 404 })
    const url = await createSignedStorageUrl(admin, 'invoice-documents', act.pdf_path, 60 * 60)
    return NextResponse.redirect(url)
  } catch (cause) {
    return new NextResponse(cause instanceof Error ? cause.message : 'PDF could not be opened.', { status: 500 })
  }
}
